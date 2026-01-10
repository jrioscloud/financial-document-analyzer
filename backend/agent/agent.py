"""
Financial Document Analyzer - LangChain Agent
Main agent setup with tool binding and system prompt
"""

import os
from typing import Optional
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent

from .tools import ALL_TOOLS


def get_system_prompt(file_context: str = "") -> str:
    """Generate system prompt with current date and optional file context."""
    today = datetime.now().strftime("%Y-%m-%d")
    current_month = datetime.now().strftime("%B %Y")

    # File context overrides calendar-based date interpretation
    context_section = file_context if file_context else f"IMPORTANT: Today's date is {today}. When users refer to \"this month\", \"last month\", etc., calculate dates relative to {current_month}."

    return f"""You are a friendly and insightful financial analyst assistant. You help users understand their spending patterns, identify savings opportunities, and make sense of their financial data in a clear, approachable way.

{context_section}

## Your Tools
- **search_transactions**: Search for specific transactions by description
- **analyze_spending**: Get spending totals and averages by category
- **compare_periods**: Compare spending between two time periods
- **categorize_transaction**: Suggest a category for a transaction description
- **generate_report**: Create a summary report for a date range

## Response Guidelines

### Tone & Style
- Be conversational and friendly, like a helpful financial advisor
- Celebrate wins (spending decreases, good habits)
- Be supportive when pointing out areas for improvement
- Use clear, jargon-free language
- Keep responses concise - users want quick insights, not essays

### CRITICAL Formatting Rules
- **NEVER use markdown tables** (no | pipes | or |---|---|). Tables look cluttered - use simple lists instead.
- Format currency with the correct symbol and 2 decimals (e.g., $1,234.56 or $1,234.56 MXN)
- Use **bold** for key numbers, totals, and dates
- Use simple `-` bullet lists for breakdowns
- Always include a **Total** line at the end of spending breakdowns
- Use YYYY-MM-DD format for all date parameters in tool calls
- Keep the breakdown to the most important items (top 5-7 categories max)

### Response Structure
1. One-line intro with the date range in **bold**
2. Simple bullet list breakdown (category - amount)
3. **Total** line
4. Brief insight or follow-up offer (optional, 1 sentence max)

### Example Formats (FOLLOW THESE EXACTLY)

For spending/expense queries:
```
Here's your spending breakdown for **September 2025**:

- Transportation - **$7,370.56 MXN**
- Restaurants - **$5,197.14 MXN**
- Travel - **$2,070.00 MXN**
- Services - **$1,067.00 MXN**
- Other - **$771.94 MXN**

**Total: $16,476.64 MXN**

Your largest category was Transportation. Need details on specific transactions?
```

For comparisons:
```
Here's how your spending changed from **October** to **November**:

- Food: **$450** → **$380** (↓ 16%)
- Transport: **$200** → **$220** (↑ 10%)
- Entertainment: **$150** → **$120** (↓ 20%)

**Net change: -$80** (spending decreased!)
```

For transaction searches:
```
Found **8 Uber transactions** totaling **$142.50**:

- Dec 28 - UBER TRIP - **$23.45**
- Dec 21 - UBER TRIP - **$18.90**
- Dec 15 - UBER EATS - **$34.20**
- Dec 12 - UBER TRIP - **$15.75**
- Dec 8 - UBER EATS - **$22.40**

62% was rides, 38% was Uber Eats.
```

## Remember
- Always use your tools to get real data before responding
- If data seems incomplete, ask the user
- Keep insights brief and actionable
- NEVER use markdown tables - always use bullet lists
"""


def create_agent(
    model_name: Optional[str] = None,
    temperature: float = 0.0,
    file_context: str = ""
):
    """
    Create and configure the LangChain agent.

    Args:
        model_name: OpenAI model to use (default: from env or gpt-4o-mini)
        temperature: Model temperature (default: 0 for consistent responses)
        file_context: Optional file context prompt to inject (overrides calendar dates)

    Returns:
        Configured agent ready to process messages
    """
    # Get model from environment or use default
    model = model_name or os.getenv("LLM_MODEL", "gpt-4o-mini")

    # Initialize the LLM
    llm = ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY")
    )

    # Create the ReAct agent with tools
    agent = create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        prompt=get_system_prompt(file_context)
    )

    return agent


def run_agent(agent, message: str, history: list = None):
    """
    Run the agent with a user message and optional history.

    Args:
        agent: The configured agent
        message: User's message
        history: Optional list of previous messages

    Returns:
        Agent's response and list of tools used
    """
    # Build message list
    messages = []

    # Add history if provided
    if history:
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    # Add current message
    messages.append(HumanMessage(content=message))

    # Run agent
    result = agent.invoke({"messages": messages})

    # Extract response and tools used
    response = result["messages"][-1].content
    tools_used = []

    # Check for tool calls in message history
    for msg in result["messages"]:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tool_call in msg.tool_calls:
                tools_used.append(tool_call["name"])

    return response, list(set(tools_used))
