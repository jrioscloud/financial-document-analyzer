"""
Financial Document Analyzer - LangChain Agent
Main agent setup with tool binding and system prompt
"""

import os
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent

from .tools import ALL_TOOLS

# System prompt for the financial analyst agent
SYSTEM_PROMPT = """You are a helpful financial analyst assistant. You help users understand their spending patterns and financial data.

You have access to the following tools:
- search_transactions: Search for specific transactions by description
- analyze_spending: Get spending totals and averages by category
- compare_periods: Compare spending between two time periods
- categorize_transaction: Suggest a category for a transaction description
- generate_report: Create a summary report for a date range

When answering questions:
1. Use the appropriate tool(s) to gather data
2. Provide clear, concise answers with specific numbers
3. If you need clarification, ask the user
4. Format currency as USD with 2 decimal places
5. When showing multiple transactions, use a clean list format

Examples of queries you can help with:
- "How much did I spend on food last month?"
- "Show me my largest expenses"
- "Compare my November vs December spending"
- "What category would 'UBER TRIP' fall under?"
- "Give me a summary of my finances for Q4"

Always be helpful and provide actionable insights when possible.
"""


def create_agent(
    model_name: Optional[str] = None,
    temperature: float = 0.0
):
    """
    Create and configure the LangChain agent.

    Args:
        model_name: OpenAI model to use (default: from env or gpt-4o-mini)
        temperature: Model temperature (default: 0 for consistent responses)

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
        state_modifier=SYSTEM_PROMPT
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
