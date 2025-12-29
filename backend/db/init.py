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
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://analyzer:analyzer_dev@localhost:5433/financial_analyzer")


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


if __name__ == "__main__":
    # Run schema initialization when executed directly
    if check_connection():
        init_db()
    else:
        print("Could not connect to database. Is PostgreSQL running?")
