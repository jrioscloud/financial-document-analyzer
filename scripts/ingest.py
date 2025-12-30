#!/usr/bin/env python3
"""
Financial Document Analyzer - Local Ingestion Script
Watches a folder for new CSV files and auto-processes them into the database.

Usage:
    python scripts/ingest.py --watch /path/to/folder
    python scripts/ingest.py --file /path/to/file.csv
    python scripts/ingest.py --folder /path/to/folder  # Process all existing files

Environment Variables:
    DATABASE_URL: PostgreSQL connection string (Supabase or local)
    OPENAI_API_KEY: OpenAI API key for embeddings
"""

import os
import sys
import time
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def get_db_connection():
    """Get database connection."""
    import psycopg2

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    return psycopg2.connect(database_url)


def process_csv_file(file_path: Path) -> dict:
    """
    Process a single CSV file: parse, embed, and store.

    Returns:
        dict with processing results
    """
    from backend.utils.csv_parser import parse_csv_content
    from backend.utils.embeddings import embed_transactions

    logger.info(f"Processing: {file_path.name}")

    # Read file content
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()

    # Parse transactions
    transactions, source = parse_csv_content(content, file_path.name)
    logger.info(f"  Parsed {len(transactions)} transactions from {source.value}")

    if not transactions:
        logger.warning(f"  No transactions found in {file_path.name}")
        return {"filename": file_path.name, "transactions": 0, "status": "empty"}

    # Convert to dicts for embedding
    tx_dicts = [
        {
            "date": tx.date,
            "description": tx.description,
            "amount": tx.amount,
            "amount_original": tx.amount_original,
            "currency": tx.currency,
            "category": tx.category,
            "type": tx.type,
            "source_bank": tx.source_bank,
            "source_file": tx.source_file,
            "original_data": tx.original_data,
        }
        for tx in transactions
    ]

    # Generate embeddings
    logger.info(f"  Generating embeddings...")
    embedded_transactions = embed_transactions(tx_dicts)
    logger.info(f"  Generated {len(embedded_transactions)} embeddings")

    # Store in database
    logger.info(f"  Storing in database...")
    stored_count = store_transactions(embedded_transactions)
    logger.info(f"  Stored {stored_count} transactions")

    return {
        "filename": file_path.name,
        "source": source.value,
        "transactions": len(transactions),
        "stored": stored_count,
        "status": "success"
    }


def store_transactions(transactions: list) -> int:
    """Store transactions in the database."""
    import json

    conn = get_db_connection()
    cursor = conn.cursor()

    stored = 0
    for tx in transactions:
        try:
            cursor.execute("""
                INSERT INTO transactions
                (date, description, amount, amount_original, currency, category,
                 type, source_bank, source_file, original_data, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                tx["date"],
                tx["description"],
                tx["amount"],
                tx["amount_original"],
                tx["currency"],
                tx.get("category"),
                tx["type"],
                tx["source_bank"],
                tx["source_file"],
                json.dumps(tx["original_data"]),
                tx.get("embedding"),
            ))
            stored += 1
        except Exception as e:
            logger.error(f"  Failed to store transaction: {e}")

    conn.commit()
    cursor.close()
    conn.close()

    return stored


def process_folder(folder_path: Path) -> list:
    """Process all CSV files in a folder."""
    results = []

    csv_files = list(folder_path.glob("*.csv")) + list(folder_path.glob("*.CSV"))
    logger.info(f"Found {len(csv_files)} CSV files in {folder_path}")

    for csv_file in csv_files:
        try:
            result = process_csv_file(csv_file)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to process {csv_file.name}: {e}")
            results.append({
                "filename": csv_file.name,
                "status": "error",
                "error": str(e)
            })

    return results


def watch_folder(folder_path: Path, poll_interval: float = 2.0):
    """
    Watch a folder for new CSV files and process them.
    Uses polling for simplicity (no external dependencies).
    """
    logger.info(f"Watching folder: {folder_path}")
    logger.info(f"Poll interval: {poll_interval}s")
    logger.info("Press Ctrl+C to stop")

    processed_files = set()

    # Track existing files on startup
    for f in folder_path.glob("*.csv"):
        processed_files.add(f.name)
    for f in folder_path.glob("*.CSV"):
        processed_files.add(f.name)

    logger.info(f"Ignoring {len(processed_files)} existing files")

    try:
        while True:
            # Check for new files
            current_files = set()
            for f in folder_path.glob("*.csv"):
                current_files.add(f.name)
            for f in folder_path.glob("*.CSV"):
                current_files.add(f.name)

            new_files = current_files - processed_files

            for filename in new_files:
                file_path = folder_path / filename
                logger.info(f"New file detected: {filename}")

                # Wait a moment for file to finish writing
                time.sleep(0.5)

                try:
                    result = process_csv_file(file_path)
                    logger.info(f"Processed: {result}")
                    processed_files.add(filename)
                except Exception as e:
                    logger.error(f"Failed to process {filename}: {e}")
                    processed_files.add(filename)  # Don't retry failed files

            time.sleep(poll_interval)

    except KeyboardInterrupt:
        logger.info("\nStopping watcher...")


def main():
    parser = argparse.ArgumentParser(
        description="Financial Document Analyzer - Local Ingestion Script"
    )
    parser.add_argument(
        "--file", "-f",
        type=Path,
        help="Process a single CSV file"
    )
    parser.add_argument(
        "--folder", "-d",
        type=Path,
        help="Process all CSV files in a folder"
    )
    parser.add_argument(
        "--watch", "-w",
        type=Path,
        help="Watch a folder for new CSV files"
    )
    parser.add_argument(
        "--interval", "-i",
        type=float,
        default=2.0,
        help="Poll interval in seconds (default: 2.0)"
    )

    args = parser.parse_args()

    # Validate environment
    if not os.getenv("DATABASE_URL"):
        logger.error("DATABASE_URL environment variable not set")
        logger.info("Set it in .env file or export it:")
        logger.info("  export DATABASE_URL='postgresql://...'")
        sys.exit(1)

    if not os.getenv("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable not set")
        sys.exit(1)

    if args.file:
        if not args.file.exists():
            logger.error(f"File not found: {args.file}")
            sys.exit(1)
        result = process_csv_file(args.file)
        print(f"\nResult: {result}")

    elif args.folder:
        if not args.folder.exists():
            logger.error(f"Folder not found: {args.folder}")
            sys.exit(1)
        results = process_folder(args.folder)
        print(f"\nResults:")
        for r in results:
            print(f"  {r['filename']}: {r['status']} ({r.get('transactions', 0)} transactions)")

    elif args.watch:
        if not args.watch.exists():
            logger.error(f"Folder not found: {args.watch}")
            sys.exit(1)
        watch_folder(args.watch, args.interval)

    else:
        parser.print_help()
        print("\nExamples:")
        print("  python scripts/ingest.py --file data/transactions.csv")
        print("  python scripts/ingest.py --folder data/")
        print("  python scripts/ingest.py --watch ~/Downloads --interval 5")


if __name__ == "__main__":
    main()
