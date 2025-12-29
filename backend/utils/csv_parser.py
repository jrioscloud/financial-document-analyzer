"""
Financial Document Analyzer - CSV Parser
Parse bank/financial CSV exports into transaction records
"""

import csv
from io import StringIO
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path


def parse_csv(content: str, source_file: str = "upload") -> List[Dict]:
    """
    Parse CSV content into transaction records.

    Expected columns (flexible matching):
    - date: Transaction date
    - description: Transaction description
    - amount: Transaction amount
    - category: Optional category
    - type: 'income' or 'expense' (inferred from amount if missing)

    Args:
        content: CSV file content as string
        source_file: Name of source file for tracking

    Returns:
        List of transaction dictionaries
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))

    # Normalize column names (case-insensitive, strip whitespace)
    fieldnames = [f.lower().strip() for f in reader.fieldnames] if reader.fieldnames else []

    for row in reader:
        # Normalize row keys
        normalized_row = {k.lower().strip(): v.strip() for k, v in row.items()}

        # Extract required fields
        try:
            date = parse_date(normalized_row.get('date', ''))
            description = normalized_row.get('description', normalized_row.get('memo', ''))
            amount = parse_amount(normalized_row.get('amount', '0'))

            # Infer type from amount if not provided
            txn_type = normalized_row.get('type', '')
            if not txn_type:
                txn_type = 'income' if amount > 0 else 'expense'

            # Make amount positive for storage
            amount = abs(amount)

            # Get optional category
            category = normalized_row.get('category', None)

            transaction = {
                'date': date,
                'description': description,
                'amount': amount,
                'category': category,
                'type': txn_type,
                'source_file': source_file
            }

            transactions.append(transaction)

        except (ValueError, KeyError) as e:
            # Skip malformed rows, log warning
            print(f"Skipping row due to error: {e}")
            continue

    return transactions


def parse_csv_file(file_path: str) -> List[Dict]:
    """
    Parse CSV file from filesystem.

    Args:
        file_path: Path to CSV file

    Returns:
        List of transaction dictionaries
    """
    path = Path(file_path)
    content = path.read_text(encoding='utf-8')
    return parse_csv(content, source_file=path.name)


def parse_date(date_str: str) -> str:
    """
    Parse date string to ISO format (YYYY-MM-DD).

    Handles common formats:
    - YYYY-MM-DD
    - MM/DD/YYYY
    - DD/MM/YYYY
    - Month DD, YYYY
    """
    date_str = date_str.strip()

    # Common date formats to try
    formats = [
        '%Y-%m-%d',      # 2024-01-15
        '%m/%d/%Y',      # 01/15/2024
        '%d/%m/%Y',      # 15/01/2024
        '%m-%d-%Y',      # 01-15-2024
        '%B %d, %Y',     # January 15, 2024
        '%b %d, %Y',     # Jan 15, 2024
        '%Y/%m/%d',      # 2024/01/15
    ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.strftime('%Y-%m-%d')
        except ValueError:
            continue

    raise ValueError(f"Could not parse date: {date_str}")


def parse_amount(amount_str: str) -> float:
    """
    Parse amount string to float.

    Handles:
    - Currency symbols ($, €, £)
    - Comma separators (1,000.00)
    - Parentheses for negative ((100.00))
    - Negative signs
    """
    amount_str = amount_str.strip()

    # Remove currency symbols
    for symbol in ['$', '€', '£', '¥']:
        amount_str = amount_str.replace(symbol, '')

    # Handle parentheses for negative
    if amount_str.startswith('(') and amount_str.endswith(')'):
        amount_str = '-' + amount_str[1:-1]

    # Remove commas
    amount_str = amount_str.replace(',', '')

    # Remove whitespace
    amount_str = amount_str.strip()

    return float(amount_str)


def validate_transactions(transactions: List[Dict]) -> tuple[List[Dict], List[str]]:
    """
    Validate parsed transactions.

    Args:
        transactions: List of transaction dicts

    Returns:
        Tuple of (valid_transactions, error_messages)
    """
    valid = []
    errors = []

    for i, txn in enumerate(transactions):
        row_errors = []

        # Check required fields
        if not txn.get('date'):
            row_errors.append(f"Row {i+1}: Missing date")

        if not txn.get('description'):
            row_errors.append(f"Row {i+1}: Missing description")

        if txn.get('amount') is None:
            row_errors.append(f"Row {i+1}: Missing amount")

        if txn.get('type') not in ('income', 'expense'):
            row_errors.append(f"Row {i+1}: Invalid type '{txn.get('type')}'")

        if row_errors:
            errors.extend(row_errors)
        else:
            valid.append(txn)

    return valid, errors
