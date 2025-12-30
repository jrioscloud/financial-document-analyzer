"""
Database Module
Connection management and initialization
"""

from .init import init_db, get_connection

__all__ = ["init_db", "get_connection"]
