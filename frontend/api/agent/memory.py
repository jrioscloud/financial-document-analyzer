"""
Financial Document Analyzer - Session Memory
Manage conversation history with PostgreSQL persistence
"""

import os
from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor


def _get_db_params():
    """Parse DATABASE_URL into connection parameters."""
    raw_url = os.getenv("DATABASE_URL", "postgresql://analyzer:analyzer_dev@localhost:5434/financial_analyzer")

    if raw_url.startswith("postgresql://") or raw_url.startswith("postgres://"):
        url = raw_url.replace("postgresql://", "").replace("postgres://", "")

        if "@" in url:
            userinfo, hostinfo = url.rsplit("@", 1)
            if ":" in userinfo:
                user, password = userinfo.split(":", 1)
            else:
                user, password = userinfo, None
        else:
            user, password = None, None
            hostinfo = url

        if "/" in hostinfo:
            hostport, database = hostinfo.split("/", 1)
        else:
            hostport, database = hostinfo, "postgres"

        if ":" in hostport:
            host, port = hostport.split(":", 1)
        else:
            host, port = hostport, "5432"

        return {
            "host": host,
            "port": int(port),
            "database": database,
            "user": user,
            "password": password
        }
    return None


def get_db_connection():
    """Get database connection with special char support."""
    params = _get_db_params()
    if params:
        return psycopg2.connect(**params)
    else:
        return psycopg2.connect(
            os.getenv("DATABASE_URL", "postgresql://analyzer:analyzer_dev@localhost:5434/financial_analyzer")
        )


class SessionMemory:
    """
    Manage chat session memory with database persistence.

    Each session has:
    - Unique UUID
    - List of messages (user, assistant, system)
    - Timestamps for creation and last update
    - File context (uploaded file info, date ranges)
    """

    def __init__(self, session_id: Optional[str] = None):
        """
        Initialize or load a session.

        Args:
            session_id: Existing session ID, or None to create new
        """
        self.file_context: Optional[Dict] = None  # Track uploaded file metadata

        if session_id:
            self.session_id = session_id
            self._load_session()
        else:
            self.session_id = str(uuid4())
            self._create_session()

    def _create_session(self):
        """Create a new session in the database."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO chat_sessions (id) VALUES (%s) ON CONFLICT DO NOTHING",
                        [self.session_id]
                    )
                    conn.commit()
            self.messages: List[Dict] = []
        except Exception as e:
            print(f"Warning: Could not create session in database: {e}")
            self.messages = []

    def _load_session(self):
        """Load existing session and messages from database."""
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Check if session exists, create if not
                    cur.execute(
                        "SELECT id FROM chat_sessions WHERE id = %s",
                        [self.session_id]
                    )
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO chat_sessions (id) VALUES (%s)",
                            [self.session_id]
                        )
                        conn.commit()

                    # Load messages
                    cur.execute(
                        """
                        SELECT role, content, tools_used, created_at
                        FROM chat_messages
                        WHERE session_id = %s
                        ORDER BY created_at ASC
                        """,
                        [self.session_id]
                    )
                    rows = cur.fetchall()

            self.messages = [
                {
                    "role": row["role"],
                    "content": row["content"],
                    "tools_used": row["tools_used"] or [],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                }
                for row in rows
            ]
        except Exception as e:
            print(f"Warning: Could not load session from database: {e}")
            self.messages = []

    def add_message(self, role: str, content: str, tools_used: List[str] = None):
        """
        Add a message to the session.

        Args:
            role: 'user', 'assistant', or 'system'
            content: Message content
            tools_used: Optional list of tools used (for assistant messages)
        """
        message = {
            "role": role,
            "content": content,
            "tools_used": tools_used or [],
            "created_at": datetime.now().isoformat()
        }

        self.messages.append(message)
        self._save_message(message)

    def _save_message(self, message: Dict):
        """Save message to database."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO chat_messages (session_id, role, content, tools_used)
                        VALUES (%s, %s, %s, %s)
                        """,
                        [
                            self.session_id,
                            message["role"],
                            message["content"],
                            message["tools_used"] if message["tools_used"] else None
                        ]
                    )
                    conn.commit()
        except Exception as e:
            print(f"Warning: Could not save message to database: {e}")

    def get_history(self, limit: int = 20) -> List[Dict]:
        """
        Get conversation history for this session.

        Args:
            limit: Maximum number of messages to return

        Returns:
            List of messages in chronological order
        """
        # Return from in-memory cache (already loaded from DB)
        return self.messages[-limit:]

    def get_messages_for_agent(self) -> List[Dict]:
        """
        Get messages formatted for the LangChain agent.

        Returns:
            List of dicts with 'role' and 'content' keys
        """
        return [
            {"role": m["role"], "content": m["content"]}
            for m in self.messages
        ]

    def clear(self):
        """Clear all messages in this session."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM chat_messages WHERE session_id = %s",
                        [self.session_id]
                    )
                    conn.commit()
        except Exception as e:
            print(f"Warning: Could not clear messages from database: {e}")
        self.messages = []
        self.file_context = None

    def set_file_context(self, filename: str, date_start: str, date_end: str,
                         primary_month: str, transaction_count: int):
        """
        Set context about the uploaded file.

        This context will be injected into the agent's system prompt
        so it understands which time period the user is referring to.

        Args:
            filename: Name of the uploaded file
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            primary_month: Human-readable month (e.g., "July 2025")
            transaction_count: Number of transactions in the file
        """
        self.file_context = {
            "filename": filename,
            "date_start": date_start,
            "date_end": date_end,
            "primary_month": primary_month,
            "transaction_count": transaction_count
        }

    def get_file_context(self) -> Optional[Dict]:
        """Get the current file context, if any."""
        return self.file_context

    def get_file_context_prompt(self) -> str:
        """
        Generate a prompt snippet describing the uploaded file context.

        Returns:
            String to inject into system prompt, or empty string if no context
        """
        if not self.file_context:
            return ""

        return f"""
IMPORTANT FILE CONTEXT:
The user has uploaded "{self.file_context['filename']}" containing {self.file_context['transaction_count']} transactions.
Data date range: {self.file_context['date_start']} to {self.file_context['date_end']} (primarily {self.file_context['primary_month']}).
When the user refers to "this month", "my spending", or "the file", they mean the data from {self.file_context['primary_month']} - NOT the current calendar month.
Always use dates within {self.file_context['date_start']} to {self.file_context['date_end']} for queries about this data.
"""


# In-memory session store (for file context persistence within a session)
_session_store: Dict[str, SessionMemory] = {}


def get_or_create_session(session_id: Optional[str] = None) -> SessionMemory:
    """
    Get existing session or create new one.

    Uses in-memory store to preserve file context within a session.

    Args:
        session_id: Optional existing session ID

    Returns:
        SessionMemory instance
    """
    global _session_store

    if session_id and session_id in _session_store:
        # Return existing session with preserved file context
        return _session_store[session_id]

    # Create new session
    session = SessionMemory(session_id)
    _session_store[session.session_id] = session
    return session
