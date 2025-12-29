"""
Financial Document Analyzer - LangChain Tools
5 tools for the agent to analyze financial data
"""

from langchain_core.tools import tool
from typing import Optional
from datetime import datetime

# TODO: Import database connection
# from db.connection import get_db_connection
# from utils.embeddings import generate_embedding


@tool
def search_transactions(
    query: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> str:
    """
    Search transactions by description using semantic search.

    Args:
        query: Search query (e.g., "coffee purchases", "uber rides")
        date_from: Optional start date (YYYY-MM-DD)
        date_to: Optional end date (YYYY-MM-DD)

    Returns:
        List of matching transactions with date, description, amount, category
    """
    # TODO: Implement semantic search
    # 1. Generate embedding for query
    # 2. Query pgvector for similar transactions
    # 3. Apply date filters if provided
    # 4. Return formatted results

    return f"[PLACEHOLDER] Searching for: {query}"


@tool
def analyze_spending(
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> str:
    """
    Analyze spending: total, average, and count by category.

    Args:
        category: Optional category to filter (e.g., "Food", "Transport")
        date_from: Optional start date (YYYY-MM-DD)
        date_to: Optional end date (YYYY-MM-DD)

    Returns:
        Spending summary with total, average, and transaction count
    """
    # TODO: Implement SQL aggregation
    # SELECT category, SUM(amount), AVG(amount), COUNT(*)
    # FROM transactions
    # WHERE type = 'expense' AND (filters)
    # GROUP BY category

    return f"[PLACEHOLDER] Analyzing spending for category: {category or 'all'}"


@tool
def compare_periods(
    period_a_start: str,
    period_a_end: str,
    period_b_start: str,
    period_b_end: str
) -> str:
    """
    Compare spending between two time periods.

    Args:
        period_a_start: Start date of first period (YYYY-MM-DD)
        period_a_end: End date of first period (YYYY-MM-DD)
        period_b_start: Start date of second period (YYYY-MM-DD)
        period_b_end: End date of second period (YYYY-MM-DD)

    Returns:
        Comparison showing totals for each period and percentage change
    """
    # TODO: Implement period comparison
    # 1. Calculate total for period A
    # 2. Calculate total for period B
    # 3. Compute difference and percentage change

    return f"[PLACEHOLDER] Comparing {period_a_start} to {period_a_end} vs {period_b_start} to {period_b_end}"


@tool
def categorize_transaction(description: str) -> str:
    """
    Suggest a category for a transaction based on its description.

    Args:
        description: Transaction description (e.g., "UBER TRIP", "STARBUCKS")

    Returns:
        Suggested category with confidence
    """
    # TODO: Use LLM to classify transaction
    # Categories: Food, Transport, Shopping, Bills, Entertainment, Income, Other

    return f"[PLACEHOLDER] Categorizing: {description}"


@tool
def generate_report(
    date_from: str,
    date_to: str
) -> str:
    """
    Generate a spending summary report by category for a date range.

    Args:
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)

    Returns:
        Detailed report with income, expenses, net, and breakdown by category
    """
    # TODO: Implement report generation
    # 1. Aggregate income vs expenses
    # 2. Group expenses by category
    # 3. Calculate percentages
    # 4. Format as readable report

    return f"[PLACEHOLDER] Generating report for {date_from} to {date_to}"


# Export all tools as a list for agent binding
ALL_TOOLS = [
    search_transactions,
    analyze_spending,
    compare_periods,
    categorize_transaction,
    generate_report
]
