"""
Financial Document Analyzer - Multi-Format CSV Parser
Supports: Upwork, Nu Bank (Credit/Debit), BBVA (Credit/Debit)
"""

import csv
import json
import re
from io import StringIO
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from enum import Enum


class SourceBank(Enum):
    """Supported data sources."""
    UPWORK = "upwork"
    NU_CREDIT = "nu_credit"
    NU_DEBIT = "nu_debit"
    BBVA_CREDIT = "bbva_credit"
    BBVA_DEBIT = "bbva_debit"
    UNKNOWN = "unknown"


@dataclass
class ParsedTransaction:
    """Normalized transaction from any source."""
    date: str                    # YYYY-MM-DD
    description: str
    amount: float                # Positive = income, Negative = expense
    amount_original: float       # Original value before normalization
    currency: str                # USD or MXN
    category: Optional[str]
    type: str                    # income, expense, transfer
    source_bank: str
    source_file: str
    original_data: Dict          # All original columns preserved


# =============================================================================
# Source Detection
# =============================================================================

def detect_source(headers: List[str], filename: str = "") -> SourceBank:
    """
    Auto-detect CSV source based on headers and filename.

    Args:
        headers: List of column names (lowercase)
        filename: Original filename for hints

    Returns:
        Detected SourceBank enum
    """
    headers_lower = [h.lower().strip() for h in headers]
    filename_lower = filename.lower()

    # Upwork: Has 'contract_details' and 'client'
    if 'contract_details' in headers_lower or 'client_initials' in headers_lower:
        return SourceBank.UPWORK

    # Nu Bank detection
    if 'nu' in filename_lower or 'cajita' in headers_lower:
        if 'credit' in filename_lower or 'tdc' in filename_lower:
            return SourceBank.NU_CREDIT
        else:
            return SourceBank.NU_DEBIT

    # BBVA detection
    if 'bbva' in filename_lower:
        if 'fecha_operacion' in headers_lower and 'fecha_cargo' in headers_lower:
            return SourceBank.BBVA_CREDIT
        elif 'cargos' in headers_lower and 'abonos' in headers_lower:
            return SourceBank.BBVA_DEBIT
        elif 'beneficiario' in headers_lower:
            return SourceBank.BBVA_DEBIT
        else:
            return SourceBank.BBVA_CREDIT

    # Check for Spanish column names (Mexican banks)
    if 'fecha' in headers_lower or 'monto' in headers_lower:
        if 'tipo' in headers_lower and any('cargo' in h or 'abono' in h for h in headers_lower):
            return SourceBank.BBVA_DEBIT
        return SourceBank.NU_CREDIT  # Default Spanish to Nu

    return SourceBank.UNKNOWN


# =============================================================================
# Date Parsing
# =============================================================================

def parse_date(date_str: str) -> str:
    """
    Parse date string to ISO format (YYYY-MM-DD).

    Handles:
    - YYYY-MM-DD (ISO)
    - DD/MM/YYYY
    - MM/DD/YYYY
    - DD-MMM-YYYY (e.g., 13-jul-2025)
    - DD MMM YYYY (e.g., 02 JUL)
    """
    if not date_str or not date_str.strip():
        raise ValueError("Empty date string")

    date_str = date_str.strip()

    # Spanish month abbreviations
    spanish_months = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    }

    formats = [
        '%Y-%m-%d',      # 2024-01-15
        '%d/%m/%Y',      # 15/01/2024
        '%m/%d/%Y',      # 01/15/2024
        '%d-%m-%Y',      # 15-01-2024
        '%Y/%m/%d',      # 2024/01/15
    ]

    # Try standard formats first
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.strftime('%Y-%m-%d')
        except ValueError:
            continue

    # Handle Spanish format: "13-jul-2025" or "02/JUL"
    date_lower = date_str.lower()
    for month_es, month_num in spanish_months.items():
        if month_es in date_lower:
            # Try DD-MMM-YYYY
            match = re.search(r'(\d{1,2})[-/\s]?' + month_es + r'[-/\s]?(\d{4})?', date_lower)
            if match:
                day = match.group(1).zfill(2)
                year = match.group(2) or str(datetime.now().year)
                return f"{year}-{month_num}-{day}"

    raise ValueError(f"Could not parse date: {date_str}")


# =============================================================================
# Amount Parsing
# =============================================================================

def parse_amount(amount_str: str) -> float:
    """
    Parse amount string to float.

    Handles:
    - Currency symbols ($, €, £)
    - Comma as thousand separator
    - Parentheses for negative
    - Negative signs
    """
    if not amount_str:
        return 0.0

    amount_str = str(amount_str).strip()

    # Remove currency symbols
    for symbol in ['$', '€', '£', '¥', 'MXN', 'USD']:
        amount_str = amount_str.replace(symbol, '')

    # Handle parentheses for negative
    if amount_str.startswith('(') and amount_str.endswith(')'):
        amount_str = '-' + amount_str[1:-1]

    # Remove commas (thousand separators)
    amount_str = amount_str.replace(',', '')

    # Remove whitespace
    amount_str = amount_str.strip()

    if not amount_str:
        return 0.0

    return float(amount_str)


# =============================================================================
# Source-Specific Parsers
# =============================================================================

def parse_upwork_row(row: Dict, filename: str) -> ParsedTransaction:
    """Parse Upwork CSV row."""
    # Columns: Date,Type,Contract_Details,Client,Client_Initials,Amount_USD,Status
    amount = parse_amount(row.get('Amount_USD', row.get('amount_usd', '0')))
    tx_type = row.get('Type', row.get('type', '')).lower()

    # Determine income/expense
    if tx_type == 'withdrawal':
        normalized_type = 'expense'
        amount = -abs(amount)
    elif amount < 0:
        normalized_type = 'expense'
    else:
        normalized_type = 'income'

    description = row.get('Contract_Details', row.get('contract_details', ''))
    client = row.get('Client', row.get('client', ''))
    if client:
        description = f"{description} ({client})"

    return ParsedTransaction(
        date=parse_date(row.get('Date', row.get('date', ''))),
        description=description,
        amount=amount,
        amount_original=parse_amount(row.get('Amount_USD', row.get('amount_usd', '0'))),
        currency='USD',
        category=tx_type.title() if tx_type else None,
        type=normalized_type,
        source_bank=SourceBank.UPWORK.value,
        source_file=filename,
        original_data=dict(row)
    )


def parse_nu_credit_row(row: Dict, filename: str) -> ParsedTransaction:
    """Parse Nu Bank Credit Card CSV row."""
    # Columns vary: Fecha,Categoria,Descripcion,Monto,Tipo
    amount = parse_amount(row.get('Monto', row.get('monto', '0')))
    tipo = row.get('Tipo', row.get('tipo', '')).lower()

    # Abono = payment (credit), Cargo = charge (debit)
    if tipo == 'abono' or amount < 0:
        normalized_type = 'income'  # Payment to card
    else:
        normalized_type = 'expense'
        amount = -abs(amount)

    return ParsedTransaction(
        date=parse_date(row.get('Fecha', row.get('fecha', ''))),
        description=row.get('Descripcion', row.get('descripcion', '')),
        amount=amount,
        amount_original=parse_amount(row.get('Monto', row.get('monto', '0'))),
        currency='MXN',
        category=row.get('Categoria', row.get('categoria')),
        type=normalized_type,
        source_bank=SourceBank.NU_CREDIT.value,
        source_file=filename,
        original_data=dict(row)
    )


def parse_nu_debit_row(row: Dict, filename: str) -> ParsedTransaction:
    """Parse Nu Bank Debit CSV row."""
    # Columns: Fecha,Tipo,Descripcion,Monto,Cajita,Categoria
    amount = parse_amount(row.get('Monto', row.get('monto', '0')))
    tipo = row.get('Tipo', row.get('tipo', '')).lower()

    # Determine type based on transaction type and amount
    if 'transferencia' in tipo and amount < 0:
        normalized_type = 'transfer'
    elif amount < 0:
        normalized_type = 'expense'
    else:
        normalized_type = 'income'

    return ParsedTransaction(
        date=parse_date(row.get('Fecha', row.get('fecha', ''))),
        description=row.get('Descripcion', row.get('descripcion', '')),
        amount=amount,
        amount_original=parse_amount(row.get('Monto', row.get('monto', '0'))),
        currency='MXN',
        category=row.get('Categoria', row.get('categoria')),
        type=normalized_type,
        source_bank=SourceBank.NU_DEBIT.value,
        source_file=filename,
        original_data=dict(row)
    )


def parse_bbva_credit_row(row: Dict, filename: str) -> ParsedTransaction:
    """Parse BBVA Credit Card CSV row."""
    # Columns vary: Fecha_Operacion,Fecha_Cargo,Descripcion,Monto,Tipo,Categoria
    amount = parse_amount(row.get('Monto', row.get('monto', '0')))
    tipo = row.get('Tipo', row.get('tipo', row.get('Tipo_Transaccion', ''))).lower()

    # Credit card charges are expenses
    if tipo == 'cargo' or amount > 0:
        normalized_type = 'expense'
        amount = -abs(amount)
    else:
        normalized_type = 'income'

    date_str = row.get('Fecha_Operacion', row.get('fecha_operacion',
                row.get('Fecha', row.get('fecha', ''))))

    return ParsedTransaction(
        date=parse_date(date_str),
        description=row.get('Descripcion', row.get('descripcion', '')),
        amount=amount,
        amount_original=parse_amount(row.get('Monto', row.get('monto', '0'))),
        currency='MXN',
        category=row.get('Categoria', row.get('categoria')),
        type=normalized_type,
        source_bank=SourceBank.BBVA_CREDIT.value,
        source_file=filename,
        original_data=dict(row)
    )


def parse_bbva_debit_row(row: Dict, filename: str) -> ParsedTransaction:
    """Parse BBVA Debit CSV row."""
    # Two formats:
    # 1. Fecha_Operacion,Fecha_Liquidacion,Descripcion,Referencia,Cargos,Abonos,Saldo
    # 2. Fecha,Descripcion,Referencia,Monto,Saldo,Categoria,Tipo,Beneficiario

    if 'Cargos' in row or 'cargos' in row:
        # Format 1: Separate Cargos/Abonos columns
        cargos = parse_amount(row.get('Cargos', row.get('cargos', '0')))
        abonos = parse_amount(row.get('Abonos', row.get('abonos', '0')))
        if cargos > 0:
            amount = -cargos
            normalized_type = 'expense'
        else:
            amount = abonos
            normalized_type = 'income'
        amount_original = cargos if cargos > 0 else abonos
    else:
        # Format 2: Single Monto column
        amount = parse_amount(row.get('Monto', row.get('monto', '0')))
        amount_original = amount
        tipo = row.get('Tipo', row.get('tipo', '')).lower()
        if tipo == 'egreso' or amount < 0:
            normalized_type = 'expense'
        else:
            normalized_type = 'income'

    date_str = row.get('Fecha_Operacion', row.get('fecha_operacion',
                row.get('Fecha', row.get('fecha', ''))))

    description = row.get('Descripcion', row.get('descripcion', ''))
    beneficiario = row.get('Beneficiario', row.get('beneficiario', ''))
    if beneficiario:
        description = f"{description} - {beneficiario}"

    return ParsedTransaction(
        date=parse_date(date_str),
        description=description,
        amount=amount,
        amount_original=amount_original,
        currency='MXN',
        category=row.get('Categoria', row.get('categoria')),
        type=normalized_type,
        source_bank=SourceBank.BBVA_DEBIT.value,
        source_file=filename,
        original_data=dict(row)
    )


# =============================================================================
# Main Parser
# =============================================================================

def parse_csv(content: str, filename: str = "upload.csv") -> Tuple[List[ParsedTransaction], List[str]]:
    """
    Parse CSV content from any supported source.

    Args:
        content: CSV file content as string
        filename: Original filename (used for source detection)

    Returns:
        Tuple of (transactions, errors)
    """
    transactions = []
    errors = []

    # Parse CSV
    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        return [], ["Could not read CSV headers"]

    # Detect source
    source = detect_source(reader.fieldnames, filename)

    # Select parser based on source
    parsers = {
        SourceBank.UPWORK: parse_upwork_row,
        SourceBank.NU_CREDIT: parse_nu_credit_row,
        SourceBank.NU_DEBIT: parse_nu_debit_row,
        SourceBank.BBVA_CREDIT: parse_bbva_credit_row,
        SourceBank.BBVA_DEBIT: parse_bbva_debit_row,
    }

    parser = parsers.get(source)
    if not parser:
        return [], [f"Unknown CSV format. Headers: {reader.fieldnames}"]

    # Parse each row
    for i, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Skip empty rows or summary rows
            if not any(row.values()):
                continue
            if 'Periodo' in row or 'Resumen' in str(row.values()):
                continue

            txn = parser(row, filename)
            transactions.append(txn)
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    return transactions, errors


def parse_csv_file(file_path: str) -> Tuple[List[ParsedTransaction], List[str]]:
    """
    Parse CSV file from filesystem.

    Args:
        file_path: Path to CSV file

    Returns:
        Tuple of (transactions, errors)
    """
    path = Path(file_path)
    content = path.read_text(encoding='utf-8')
    return parse_csv(content, filename=path.name)


def to_dict(txn: ParsedTransaction) -> Dict:
    """Convert ParsedTransaction to dict for database insertion."""
    return {
        'date': txn.date,
        'description': txn.description,
        'amount': txn.amount,
        'amount_original': txn.amount_original,
        'currency': txn.currency,
        'category': txn.category,
        'type': txn.type,
        'source_bank': txn.source_bank,
        'source_file': txn.source_file,
        'original_data': json.dumps(txn.original_data)
    }


# =============================================================================
# CLI for Testing
# =============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python csv_parser.py <path_to_csv>")
        sys.exit(1)

    file_path = sys.argv[1]
    transactions, errors = parse_csv_file(file_path)

    print(f"\nParsed {len(transactions)} transactions from {file_path}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for err in errors[:5]:
            print(f"  - {err}")

    print("\nFirst 5 transactions:")
    for txn in transactions[:5]:
        print(f"  {txn.date} | {txn.amount:>10.2f} {txn.currency} | {txn.type:8} | {txn.description[:50]}")
