"""
Financial Document Analyzer - Session Memory
Manage conversation history with PostgreSQL persistence
"""

from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime

# TODO: Import database connection
# from db.connection import get_db_connection


class SessionMemory:
    """
    Manage chat session memory with database persistence.

    Each session has:
    - Unique UUID
    - List of messages (user, assistant, system)
    - Timestamps for creation and last update
    """

    def __init__(self, session_id: Optional[str] = None):
        """
        Initialize or load a session.

        Args:
            session_id: Existing session ID, or None to create new
        """
        if session_id:
            self.session_id = session_id
            self._load_session()
        else:
            self.session_id = str(uuid4())
            self._create_session()

        self.messages: List[Dict] = []

    def _create_session(self):
        """Create a new session in the database."""
        # TODO: Insert into chat_sessions table
        # INSERT INTO chat_sessions (id) VALUES (self.session_id)
        pass

    def _load_session(self):
        """Load existing session from database."""
        # TODO: Verify session exists
        # SELECT * FROM chat_sessions WHERE id = self.session_id
        pass

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
        # TODO: Insert into chat_messages table
        # INSERT INTO chat_messages (session_id, role, content, tools_used)
        # VALUES (self.session_id, message['role'], message['content'], message['tools_used'])
        pass

    def get_history(self, limit: int = 20) -> List[Dict]:
        """
        Get conversation history for this session.

        Args:
            limit: Maximum number of messages to return

        Returns:
            List of messages in chronological order
        """
        # TODO: Fetch from database
        # SELECT * FROM chat_messages
        # WHERE session_id = self.session_id
        # ORDER BY created_at DESC LIMIT limit

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
        # TODO: Delete from database
        # DELETE FROM chat_messages WHERE session_id = self.session_id
        self.messages = []


def get_or_create_session(session_id: Optional[str] = None) -> SessionMemory:
    """
    Get existing session or create new one.

    Args:
        session_id: Optional existing session ID

    Returns:
        SessionMemory instance
    """
    return SessionMemory(session_id)
