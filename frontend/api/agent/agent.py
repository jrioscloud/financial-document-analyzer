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

from .tools import ALL_TOOLS, get_db_connection


def get_available_data_context() -> str:
    """Query the database to get info about available transaction data."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get date range and count
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        MIN(date) as min_date,
                        MAX(date) as max_date
                    FROM transactions
                """)
                row = cur.fetchone()

                if not row or row[0] == 0:
                    return ""

                total, min_date, max_date = row

                # Get categories
                cur.execute("""
                    SELECT DISTINCT category FROM transactions
                    WHERE category IS NOT NULL
                    ORDER BY category LIMIT 10
                """)
                categories = [r[0] for r in cur.fetchall()]

                return f"""
AVAILABLE DATA CONTEXT:
The database contains {total} transactions from {min_date} to {max_date}.
Available categories: {', '.join(categories)}
IMPORTANT: When users ask about "this month", "last month", or recent data, check against THIS date range ({min_date} to {max_date}), NOT the current calendar date.
If the user asks for "the last month you have available", use {max_date.strftime('%Y-%m') if hasattr(max_date, 'strftime') else max_date[:7]} as the reference.
"""
    except Exception as e:
        print(f"Warning: Could not get data context: {e}")
        return ""


def get_system_prompt(file_context: str = "") -> str:
    """Generate system prompt with current date and optional file context."""
    today = datetime.now().strftime("%Y-%m-%d")
    current_month = datetime.now().strftime("%B %Y")

    # Get actual data range from database
    data_context = get_available_data_context()

    # File context overrides calendar-based date interpretation
    if file_context:
        context_section = file_context
    elif data_context:
        context_section = data_context
    else:
        context_section = f"IMPORTANT: Today's date is {today}. When users refer to \"this month\", \"last month\", etc., calculate dates relative to {current_month}."

    return f"""You are a friendly financial analyst assistant. You help users understand their spending patterns in a clear, approachable way.

{context_section}

## Your Tools
- **search_transactions**: Search for specific transactions by description
- **analyze_spending**: Get spending totals and averages by category
- **compare_periods**: Compare spending between two time periods
- **categorize_transaction**: Suggest a category for a transaction description
- **generate_report**: Create a summary report for a date range

## CRITICAL Formatting Rules

**NEVER use markdown tables** (no | pipes |). Tables look cluttered. Use simple bullet lists instead.

### For spending breakdowns, use this EXACT format:
```
Here's your spending breakdown for **[Month Year]**:

- Category Name - **$X,XXX.XX MXN**
- Another Category - **$XXX.XX MXN**
- Third Category - **$XXX.XX MXN**

**Total: $XX,XXX.XX MXN**

[One sentence insight or follow-up offer]
```

### For transaction searches, use this format:
```
Found **X transactions** matching "[query]":

- Date - Description - **$XXX.XX**
- Date - Description - **$XXX.XX**

**Total: $X,XXX.XX**
```

### For comparisons:
```
Here's how your spending changed:

- Category: **$XXX** → **$XXX** (↑/↓ X%)
- Category: **$XXX** → **$XXX** (↑/↓ X%)

**Net change: $XXX**
```

## Other Rules
- Keep responses concise - users want quick insights, not essays
- Format currency with $ symbol and 2 decimals (e.g., $1,234.56 MXN)
- Use **bold** for key numbers, totals, and dates
- Limit breakdowns to top 5-7 categories
- Use YYYY-MM-DD format for all date parameters in tool calls
- Be friendly and celebrate wins (spending decreases)

## Smart Category Inference
When analyze_spending returns no results for a category:
1. Use search_transactions with keywords
2. Common mappings:
   - Transportation: Uber, Didi, Cabify, Taxi, Metro, gas
   - Food: restaurants, restaurante, comida, cafe, starbucks
   - Groceries: Walmart, Costco, OXXO, 7-Eleven
3. Sum matching transactions and provide total

Always try to find data rather than saying "no data found".
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
