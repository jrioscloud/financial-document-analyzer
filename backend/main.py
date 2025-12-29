"""
Financial Document Analyzer - FastAPI Backend
RAG-powered chatbot for analyzing financial documents
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from models import ChatRequest, ChatResponse, UploadResponse, HealthResponse

# TODO: Import agent and database modules
# from agent.agent import create_agent
# from db.init import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Initialize database connection, load agent
    print("Starting Financial Document Analyzer API...")
    # TODO: init_db()
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
    # TODO: Implement agent logic
    # 1. Get or create session
    # 2. Load conversation history
    # 3. Run agent with message
    # 4. Save response to history
    # 5. Return response + tools_used

    return ChatResponse(
        answer="Agent not yet implemented. This is a placeholder response.",
        session_id=request.session_id or "new-session-id",
        tools_used=[]
    )


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload CSV file with transactions.

    Process:
    1. Validate file type (CSV only for MVP)
    2. Parse transactions from CSV
    3. Generate embeddings for each transaction
    4. Store in PostgreSQL with pgvector
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported. PDF support coming soon."
        )

    # TODO: Implement file processing
    # 1. Read CSV content
    # 2. Parse transactions
    # 3. Generate embeddings
    # 4. Store in database

    return UploadResponse(
        transactions_count=0,
        status="Upload not yet implemented",
        filename=file.filename
    )


@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session."""
    # TODO: Implement history retrieval
    return {"messages": [], "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
