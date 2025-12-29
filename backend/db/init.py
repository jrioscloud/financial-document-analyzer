"""
Financial Document Analyzer - Database Initialization
Setup PostgreSQL connection and run schema
"""

import os
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

# Database connection parameters
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://analyzer:analyzer_dev@localhost:5434/financial_analyzer")


@contextmanager
def get_connection():
    """
    Get database connection with automatic cleanup.

    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM transactions")
    """
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_cursor(dict_cursor: bool = True):
    """
    Get database cursor with automatic cleanup.

    Args:
        dict_cursor: If True, return results as dictionaries

    Usage:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM transactions")
            rows = cur.fetchall()
    """
    cursor_factory = RealDictCursor if dict_cursor else None

    with get_connection() as conn:
        cur = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def init_db():
    """
    Initialize database with schema.

    Runs the schema.sql file to create tables and indexes.
    Safe to run multiple times (uses IF NOT EXISTS).
    """
    schema_path = Path(__file__).parent / "schema.sql"

    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    schema_sql = schema_path.read_text()

    with get_cursor(dict_cursor=False) as cur:
        cur.execute(schema_sql)

    print("Database initialized successfully.")


def check_connection() -> bool:
    """
    Test database connection.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


def store_transactions(transactions: list) -> int:
    """
    Store transactions with embeddings in the database.

    Args:
        transactions: List of transaction dicts with embeddings

    Returns:
        Number of transactions stored
    """
    import json

    stored = 0
    with get_cursor(dict_cursor=False) as cur:
        for txn in transactions:
            try:
                # Format embedding for pgvector
                embedding = txn.get("embedding")
                embedding_str = None
                if embedding:
                    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

                # Handle original_data - ensure it's a string
                original_data = txn.get("original_data")
                if isinstance(original_data, dict):
                    original_data = json.dumps(original_data)

                cur.execute(
                    """
                    INSERT INTO transactions
                        (date, description, amount, amount_original, currency,
                         category, type, source_bank, source_file, original_data, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                    """,
                    [
                        txn.get("date"),
                        txn.get("description"),
                        txn.get("amount"),
                        txn.get("amount_original"),
                        txn.get("currency", "USD"),
                        txn.get("category"),
                        txn.get("type"),
                        txn.get("source_bank"),
                        txn.get("source_file"),
                        original_data,
                        embedding_str
                    ]
                )
                stored += 1
            except Exception as e:
                print(f"Error storing transaction: {e}")
                continue

    return stored


if __name__ == "__main__":
    # Run schema initialization when executed directly
    if check_connection():
        init_db()
    else:
        print("Could not connect to database. Is PostgreSQL running?")
