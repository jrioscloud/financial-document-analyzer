"""
Financial Document Analyzer - FastAPI Backend
RAG-powered chatbot for analyzing financial documents
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from models import ChatRequest, ChatResponse, UploadResponse, HealthResponse, DateRange
from datetime import datetime
from collections import Counter
from agent.agent import create_agent, run_agent
from agent.memory import get_or_create_session, list_sessions
from utils.csv_parser import parse_csv
from utils.embeddings import embed_transactions
from db.init import init_db, store_transactions

# Global agent instance (used when no file context)
_agent = None


def get_agent(file_context: str = ""):
    """Get or create agent instance. Creates new agent if file_context provided."""
    global _agent
    if file_context:
        # Create new agent with file context for this session
        return create_agent(file_context=file_context)
    if _agent is None:
        _agent = create_agent()
    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Initialize database connection, load agent
    print("Starting Financial Document Analyzer API...")
    init_db()
    get_agent()  # Pre-initialize agent
    yield
    # Shutdown: Clean up resources
    print("Shutting down...")


app = FastAPI(
    title="Financial Document Analyzer",
    description="RAG-powered chatbot for analyzing financial documents with LangChain",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Next.js dev server (alt port)
        "https://*.vercel.app",   # Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        environment=os.getenv("ENVIRONMENT", "development")
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint.

    Process user message through LangChain agent with tools:
    - search_transactions: Semantic search through transactions
    - analyze_spending: Aggregate spending by category
    - compare_periods: Compare spending between time periods
    - categorize_transaction: Suggest category for a description
    - generate_report: Create spending summary report
    """
    try:
        # 1. Get or create session
        session = get_or_create_session(request.session_id)

        # 2. Add user message to history
        session.add_message("user", request.message)

        # 3. Get conversation history for context
        history = session.get_messages_for_agent()

        # 4. Get file context if available (for date interpretation)
        file_context = session.get_file_context_prompt()

        # 5. Run agent with message and history (use file context if available)
        agent = get_agent(file_context)
        response, tools_used = run_agent(agent, request.message, history[:-1])  # Exclude current message from history

        # 6. Save assistant response to history
        session.add_message("assistant", response, tools_used)

        return ChatResponse(
            answer=response,
            session_id=session.session_id,
            tools_used=tools_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), session_id: str = None):
    """
    Upload CSV file with transactions.

    Process:
    1. Validate file type (CSV only for MVP)
    2. Parse transactions from CSV
    3. Generate embeddings for each transaction
    4. Store in PostgreSQL with pgvector
    5. Calculate date range and store file context in session
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported. PDF support coming soon."
        )

    try:
        # 1. Read CSV content
        content = await file.read()
        content_str = content.decode('utf-8')

        # 2. Parse transactions (auto-detects source)
        transactions, errors = parse_csv(content_str, filename=file.filename)

        if not transactions:
            error_msg = errors[0] if errors else "No transactions found in file"
            raise HTTPException(status_code=400, detail=error_msg)

        # 3. Generate embeddings for descriptions
        transactions_with_embeddings = embed_transactions(transactions)

        # 4. Store in database
        stored_count = store_transactions(transactions_with_embeddings)

        # 5. Calculate date range from transactions
        dates = [t["date"] for t in transactions if t.get("date")]
        date_range = None
        if dates:
            min_date = min(dates)
            max_date = max(dates)

            # Determine primary month (most common month in the data)
            month_counts = Counter(d.strftime("%B %Y") for d in dates)
            primary_month = month_counts.most_common(1)[0][0] if month_counts else max_date.strftime("%B %Y")

            date_range = DateRange(
                start=min_date.strftime("%Y-%m-%d"),
                end=max_date.strftime("%Y-%m-%d"),
                primary_month=primary_month
            )

        # 6. Create session and store file context
        session = get_or_create_session(session_id)
        if date_range:
            session.set_file_context(
                filename=file.filename,
                date_start=date_range.start,
                date_end=date_range.end,
                primary_month=date_range.primary_month,
                transaction_count=stored_count
            )

        status_msg = f"Successfully imported {stored_count} transactions"
        if errors:
            status_msg += f" ({len(errors)} rows skipped)"

        return UploadResponse(
            transactions_count=stored_count,
            status=status_msg,
            filename=file.filename,
            date_range=date_range,
            session_id=session.session_id
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session."""
    try:
        session = get_or_create_session(session_id)
        messages = session.get_history()
        return {
            "messages": messages,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting history: {str(e)}")


@app.get("/api/sessions")
async def get_sessions(limit: int = 20):
    """List recent chat sessions."""
    try:
        sessions = list_sessions(limit=limit)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing sessions: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
