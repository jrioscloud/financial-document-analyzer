"""
Financial Document Analyzer - Pydantic Models
Request/Response schemas for API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from uuid import UUID


# =============================================================================
# Chat Models
# =============================================================================

class ChatRequest(BaseModel):
    """Request body for /api/chat endpoint."""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response body for /api/chat endpoint."""
    answer: str
    session_id: str
    tools_used: List[str] = []


class ChatMessage(BaseModel):
    """Individual chat message."""
    role: str  # 'user', 'assistant', 'system'
    content: str
    tools_used: Optional[List[str]] = None
    created_at: Optional[str] = None


class ChatHistory(BaseModel):
    """Chat history for a session."""
    session_id: str
    messages: List[ChatMessage]


# =============================================================================
# Upload Models
# =============================================================================

class UploadResponse(BaseModel):
    """Response body for /api/upload endpoint."""
    transactions_count: int
    status: str
    filename: str


# =============================================================================
# Transaction Models
# =============================================================================

class Transaction(BaseModel):
    """Single transaction record."""
    id: Optional[int] = None
    date: date
    description: str
    amount: float
    category: Optional[str] = None
    type: str  # 'income' or 'expense'
    source_file: Optional[str] = None


class TransactionList(BaseModel):
    """List of transactions (for search results)."""
    transactions: List[Transaction]
    total: int


# =============================================================================
# Health Check Models
# =============================================================================

class HealthResponse(BaseModel):
    """Response body for /api/health endpoint."""
    status: str
    version: str
    environment: str = "development"


# =============================================================================
# Tool Response Models (for agent)
# =============================================================================

class SpendingAnalysis(BaseModel):
    """Response from analyze_spending tool."""
    category: Optional[str]
    total: float
    average: float
    count: int
    date_range: str


class PeriodComparison(BaseModel):
    """Response from compare_periods tool."""
    period_a: str
    period_a_total: float
    period_b: str
    period_b_total: float
    change_amount: float
    change_percent: float


class SpendingReport(BaseModel):
    """Response from generate_report tool."""
    date_range: str
    total_income: float
    total_expenses: float
    net: float
    by_category: dict
