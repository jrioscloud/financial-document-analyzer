"""
Financial Document Analyzer - LangChain Tools
5 tools for the agent to analyze financial data
"""

import os
import json
from langchain_core.tools import tool
from typing import Optional
from datetime import datetime
from decimal import Decimal

# Database imports
import psycopg2
from psycopg2.extras import RealDictCursor

# Embedding imports
from openai import OpenAI


# =============================================================================
# Database Connection
# =============================================================================

def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(
        os.getenv("DATABASE_URL", "postgresql://analyzer:analyzer_dev@localhost:5434/financial_analyzer")
    )


def get_embedding(text: str) -> list:
    """Generate embedding for text using OpenAI."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        input=text
    )
    return response.data[0].embedding


def format_currency(amount: float, currency: str = "USD") -> str:
    """Format amount with currency symbol."""
    if currency == "MXN":
        return f"${amount:,.2f} MXN"
    return f"${amount:,.2f} USD"


def format_transaction(row: dict) -> str:
    """Format a transaction row for display."""
    date = row.get('date', '')
    desc = row.get('description', '')[:50]
    amount = float(row.get('amount', 0))
    currency = row.get('currency', 'USD')
    category = row.get('category', 'Uncategorized')
    source = row.get('source_bank', 'unknown')

    return f"  {date} | {format_currency(amount, currency):>15} | {category:12} | {desc} [{source}]"


# =============================================================================
# Tool Implementations
# =============================================================================

@tool
def search_transactions(
    query: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 10
) -> str:
    """
    Search transactions by description using semantic search.

    Args:
        query: Search query (e.g., "coffee purchases", "uber rides", "freelance income")
        date_from: Optional start date (YYYY-MM-DD)
        date_to: Optional end date (YYYY-MM-DD)
        limit: Maximum results to return (default 10)

    Returns:
        List of matching transactions with date, description, amount, category
    """
    try:
        # Generate embedding for query
        query_embedding = get_embedding(query)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # Build query with optional date filters
        sql = """
            SELECT date, description, amount, currency, category, source_bank,
                   1 - (embedding <=> %s::vector) as similarity
            FROM transactions
            WHERE embedding IS NOT NULL
        """
        params = [embedding_str]

        if date_from:
            sql += " AND date >= %s"
            params.append(date_from)
        if date_to:
            sql += " AND date <= %s"
            params.append(date_to)

        sql += " ORDER BY embedding <=> %s::vector LIMIT %s"
        params.extend([embedding_str, limit])

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()

        if not rows:
            return f"No transactions found matching '{query}'"

        result = f"Found {len(rows)} transactions matching '{query}':\n"
        result += "-" * 80 + "\n"
        for row in rows:
            result += format_transaction(row) + "\n"

        return result

    except Exception as e:
        return f"Error searching transactions: {str(e)}"


@tool
def analyze_spending(
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    source_bank: Optional[str] = None
) -> str:
    """
    Analyze spending: total, average, and count by category.

    Args:
        category: Optional category to filter (e.g., "Food", "Transport", "Restaurante")
        date_from: Optional start date (YYYY-MM-DD)
        date_to: Optional end date (YYYY-MM-DD)
        source_bank: Optional source filter (upwork, nu_credit, nu_debit, bbva_credit, bbva_debit)

    Returns:
        Spending summary with total, average, and transaction count
    """
    try:
        # Build query
        sql = """
            SELECT
                COALESCE(category, 'Uncategorized') as category,
                currency,
                COUNT(*) as count,
                SUM(ABS(amount)) as total,
                AVG(ABS(amount)) as average,
                MIN(ABS(amount)) as min_amount,
                MAX(ABS(amount)) as max_amount
            FROM transactions
            WHERE type = 'expense'
        """
        params = []

        if category:
            sql += " AND LOWER(category) LIKE LOWER(%s)"
            params.append(f"%{category}%")
        if date_from:
            sql += " AND date >= %s"
            params.append(date_from)
        if date_to:
            sql += " AND date <= %s"
            params.append(date_to)
        if source_bank:
            sql += " AND source_bank = %s"
            params.append(source_bank)

        sql += " GROUP BY COALESCE(category, 'Uncategorized'), currency ORDER BY total DESC"

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()

        if not rows:
            filters = []
            if category:
                filters.append(f"category='{category}'")
            if date_from:
                filters.append(f"from {date_from}")
            if date_to:
                filters.append(f"to {date_to}")
            return f"No spending data found" + (f" for: {', '.join(filters)}" if filters else "")

        result = "Spending Analysis:\n"
        result += "=" * 60 + "\n"

        grand_total = {}
        for row in rows:
            currency = row['currency']
            total = float(row['total'])
            avg = float(row['average'])
            count = row['count']
            cat = row['category']

            result += f"\n{cat}:\n"
            result += f"  Transactions: {count}\n"
            result += f"  Total:   {format_currency(total, currency)}\n"
            result += f"  Average: {format_currency(avg, currency)}\n"
            result += f"  Range:   {format_currency(float(row['min_amount']), currency)} - {format_currency(float(row['max_amount']), currency)}\n"

            grand_total[currency] = grand_total.get(currency, 0) + total

        result += "\n" + "=" * 60 + "\n"
        result += "Grand Total:\n"
        for currency, total in grand_total.items():
            result += f"  {format_currency(total, currency)}\n"

        return result

    except Exception as e:
        return f"Error analyzing spending: {str(e)}"


@tool
def compare_periods(
    period_a_start: str,
    period_a_end: str,
    period_b_start: str,
    period_b_end: str,
    category: Optional[str] = None
) -> str:
    """
    Compare spending between two time periods.

    Args:
        period_a_start: Start date of first period (YYYY-MM-DD)
        period_a_end: End date of first period (YYYY-MM-DD)
        period_b_start: Start date of second period (YYYY-MM-DD)
        period_b_end: End date of second period (YYYY-MM-DD)
        category: Optional category to filter comparison

    Returns:
        Comparison showing totals for each period and percentage change
    """
    try:
        def get_period_totals(start: str, end: str, cat: Optional[str] = None) -> dict:
            sql = """
                SELECT
                    currency,
                    SUM(ABS(amount)) as total,
                    COUNT(*) as count
                FROM transactions
                WHERE type = 'expense' AND date >= %s AND date <= %s
            """
            params = [start, end]

            if cat:
                sql += " AND LOWER(category) LIKE LOWER(%s)"
                params.append(f"%{cat}%")

            sql += " GROUP BY currency"

            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(sql, params)
                    return {row['currency']: {'total': float(row['total']), 'count': row['count']}
                            for row in cur.fetchall()}

        period_a = get_period_totals(period_a_start, period_a_end, category)
        period_b = get_period_totals(period_b_start, period_b_end, category)

        all_currencies = set(period_a.keys()) | set(period_b.keys())

        if not all_currencies:
            return "No spending data found for either period."

        result = "Period Comparison:\n"
        result += "=" * 60 + "\n"
        result += f"Period A: {period_a_start} to {period_a_end}\n"
        result += f"Period B: {period_b_start} to {period_b_end}\n"
        if category:
            result += f"Category: {category}\n"
        result += "=" * 60 + "\n\n"

        for currency in sorted(all_currencies):
            a_data = period_a.get(currency, {'total': 0, 'count': 0})
            b_data = period_b.get(currency, {'total': 0, 'count': 0})

            a_total = a_data['total']
            b_total = b_data['total']

            if a_total > 0:
                change_pct = ((b_total - a_total) / a_total) * 100
            else:
                change_pct = 100 if b_total > 0 else 0

            change_amount = b_total - a_total
            direction = "↑" if change_amount > 0 else "↓" if change_amount < 0 else "→"

            result += f"{currency}:\n"
            result += f"  Period A: {format_currency(a_total, currency)} ({a_data['count']} transactions)\n"
            result += f"  Period B: {format_currency(b_total, currency)} ({b_data['count']} transactions)\n"
            result += f"  Change:   {direction} {format_currency(abs(change_amount), currency)} ({change_pct:+.1f}%)\n\n"

        return result

    except Exception as e:
        return f"Error comparing periods: {str(e)}"


@tool
def categorize_transaction(description: str) -> str:
    """
    Suggest a category for a transaction based on its description.

    Args:
        description: Transaction description (e.g., "UBER TRIP", "STARBUCKS", "AMAZON")

    Returns:
        Suggested category with explanation
    """
    # Common category mappings
    category_keywords = {
        'Transport': ['uber', 'didi', 'lyft', 'taxi', 'metro', 'gas', 'gasolina', 'metrobus'],
        'Food': ['restaurant', 'starbucks', 'mcdonalds', 'food', 'coffee', 'cafe', 'rest ', 'comida'],
        'Shopping': ['amazon', 'walmart', 'target', 'store', 'shop', 'mercado', 'oxxo'],
        'Bills': ['electricity', 'water', 'internet', 'phone', 'luz', 'agua', 'telmex'],
        'Entertainment': ['netflix', 'spotify', 'cinema', 'movie', 'game', 'cine'],
        'Income': ['salary', 'payment', 'deposit', 'freelance', 'hourly', 'earnings', 'upwork'],
        'Transfer': ['transfer', 'spei', 'transferencia'],
        'Health': ['pharmacy', 'doctor', 'hospital', 'farmacia', 'medico'],
    }

    description_lower = description.lower()

    for category, keywords in category_keywords.items():
        for keyword in keywords:
            if keyword in description_lower:
                return f"Suggested category: **{category}**\nMatched keyword: '{keyword}' in '{description}'"

    # If no match, suggest based on common patterns
    return f"Suggested category: **Other**\nNo common pattern matched for: '{description}'\nConsider adding a custom category."


@tool
def generate_report(
    date_from: str,
    date_to: str,
    include_sources: bool = True
) -> str:
    """
    Generate a spending summary report by category for a date range.

    Args:
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        include_sources: Include breakdown by source (default True)

    Returns:
        Detailed report with income, expenses, net, and breakdown by category
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get income
                cur.execute("""
                    SELECT currency, SUM(amount) as total, COUNT(*) as count
                    FROM transactions
                    WHERE type = 'income' AND date >= %s AND date <= %s
                    GROUP BY currency
                """, [date_from, date_to])
                income_rows = cur.fetchall()

                # Get expenses by category
                cur.execute("""
                    SELECT
                        COALESCE(category, 'Uncategorized') as category,
                        currency,
                        SUM(ABS(amount)) as total,
                        COUNT(*) as count
                    FROM transactions
                    WHERE type = 'expense' AND date >= %s AND date <= %s
                    GROUP BY COALESCE(category, 'Uncategorized'), currency
                    ORDER BY total DESC
                """, [date_from, date_to])
                expense_rows = cur.fetchall()

                # Get by source if requested
                source_rows = []
                if include_sources:
                    cur.execute("""
                        SELECT
                            source_bank,
                            currency,
                            type,
                            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                            SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses,
                            COUNT(*) as count
                        FROM transactions
                        WHERE date >= %s AND date <= %s
                        GROUP BY source_bank, currency, type
                        ORDER BY source_bank
                    """, [date_from, date_to])
                    source_rows = cur.fetchall()

        # Build report
        result = f"""
╔══════════════════════════════════════════════════════════════╗
║           FINANCIAL REPORT: {date_from} to {date_to}
╚══════════════════════════════════════════════════════════════╝

"""

        # Income section
        result += "📈 INCOME\n"
        result += "-" * 40 + "\n"
        income_totals = {}
        for row in income_rows:
            currency = row['currency']
            total = float(row['total'])
            result += f"  {format_currency(total, currency)} ({row['count']} transactions)\n"
            income_totals[currency] = income_totals.get(currency, 0) + total
        if not income_rows:
            result += "  No income recorded\n"

        # Expenses section
        result += "\n📉 EXPENSES BY CATEGORY\n"
        result += "-" * 40 + "\n"
        expense_totals = {}
        for row in expense_rows:
            currency = row['currency']
            total = float(row['total'])
            cat = row['category']
            result += f"  {cat:20} {format_currency(total, currency):>15} ({row['count']})\n"
            expense_totals[currency] = expense_totals.get(currency, 0) + total
        if not expense_rows:
            result += "  No expenses recorded\n"

        # Net section
        result += "\n💰 NET (Income - Expenses)\n"
        result += "-" * 40 + "\n"
        all_currencies = set(income_totals.keys()) | set(expense_totals.keys())
        for currency in sorted(all_currencies):
            income = income_totals.get(currency, 0)
            expense = expense_totals.get(currency, 0)
            net = income - expense
            emoji = "🟢" if net >= 0 else "🔴"
            result += f"  {emoji} {format_currency(net, currency)}\n"

        # Source breakdown
        if include_sources and source_rows:
            result += "\n🏦 BY SOURCE\n"
            result += "-" * 40 + "\n"
            current_source = None
            for row in source_rows:
                if row['source_bank'] != current_source:
                    current_source = row['source_bank']
                    result += f"\n  {current_source or 'Unknown'}:\n"
                if row['type'] == 'income' and float(row['income']) > 0:
                    result += f"    Income:   {format_currency(float(row['income']), row['currency'])}\n"
                if row['type'] == 'expense' and float(row['expenses']) > 0:
                    result += f"    Expenses: {format_currency(float(row['expenses']), row['currency'])}\n"

        result += "\n" + "=" * 60 + "\n"

        return result

    except Exception as e:
        return f"Error generating report: {str(e)}"


# Export all tools as a list for agent binding
ALL_TOOLS = [
    search_transactions,
    analyze_spending,
    compare_periods,
    categorize_transaction,
    generate_report
]
