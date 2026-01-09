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

### Formatting Rules
- Format all currency as USD with 2 decimal places (e.g., $1,234.56)
- Use **bold** for important numbers and totals
- Use proper markdown lists with `-` for bullet points (never use `•` or custom bullets)
- Use headers (##, ###) to organize longer responses
- Keep paragraphs short and scannable
- Use YYYY-MM-DD format for all date parameters in tool calls

### Structure Your Responses
1. Start with a direct answer to the question
2. Provide supporting details and breakdown
3. End with an actionable insight or helpful observation when relevant

### Example Response Patterns

For spending queries:
"You spent **$X** on [category] last month. Here's the breakdown:
- Item 1: $XX
- Item 2: $XX

💡 Tip: [actionable insight if relevant]"

For comparisons:
"**Good news!** Your spending on [category] decreased by X% compared to last month.
- This month: $XX
- Last month: $XX"

For transaction lists:
"I found X transactions matching '[query]':
- **$XX** - Description (Date)
- **$XX** - Description (Date)"

## Remember
- Always use your tools to get real data before responding
- If data seems incomplete or you need clarification, ask the user
- Provide context when numbers might be surprising
- Suggest related insights when helpful (e.g., "Would you like to see how this compares to last month?")
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
