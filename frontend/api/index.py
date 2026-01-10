"""
Financial Document Analyzer - Vercel Serverless API
RAG-powered chatbot for analyzing financial documents
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
import sys
import httpx
from pathlib import Path

# Add the api directory to Python path for local imports
api_dir = Path(__file__).parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

from models import ChatRequest, ChatResponse, UploadResponse, HealthResponse, DateRange
from datetime import datetime
from collections import Counter
from agent.agent import create_agent, run_agent
from agent.memory import get_or_create_session, list_sessions
from utils.csv_parser import parse_csv
from utils.embeddings import embed_transactions
from db.init import init_db, store_transactions

# Database initialization flag (lazy init for serverless)
_db_initialized = False


async def verify_auth(authorization: Optional[str] = Header(None)):
    """
    Verify Supabase JWT token from Authorization header.
    Protects API endpoints from unauthorized access.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization.replace("Bearer ", "")

    # Verify token with Supabase
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    if not supabase_url:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}",
                         "apikey": os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            return response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=401, detail="Failed to verify token")


def get_agent(file_context: str = ""):
    """Create agent instance with current data context.

    Always creates fresh agent to ensure data context is current.
    The agent queries the DB for available date ranges on each request.
    """
    # Always create fresh agent - data context is queried from DB each time
    return create_agent(file_context=file_context)


def ensure_db():
    """Ensure database is initialized (lazy init for serverless)."""
    global _db_initialized
    if not _db_initialized:
        init_db()
        _db_initialized = True


app = FastAPI(
    title="Financial Document Analyzer",
    description="RAG-powered chatbot for analyzing financial documents with LangChain",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
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
        environment=os.getenv("ENVIRONMENT", "production")
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user: dict = Depends(verify_auth)):
    """
    Main chat endpoint (requires authentication).
    Process user message through LangChain agent with financial analysis tools.
    """
    import traceback

    try:
        ensure_db()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB init error: {str(e)}")

    try:
        # 1. Get or create session
        session = get_or_create_session(request.session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session error: {str(e)}")

    try:
        # 2. Add user message to history
        session.add_message("user", request.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Add message error: {str(e)}")

    try:
        # 3. Get conversation history for context
        history = session.get_messages_for_agent()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get history error: {str(e)}")

    try:
        # 4. Get file context if available (for date interpretation)
        file_context = session.get_file_context_prompt()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File context error: {str(e)}")

    try:
        # 5. Run agent with message and history
        agent = get_agent(file_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent creation error: {str(e)}\n{traceback.format_exc()}")

    try:
        response, tools_used = run_agent(agent, request.message, history[:-1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent run error: {str(e)}\n{traceback.format_exc()}")

    try:
        # 6. Save assistant response to history
        session.add_message("assistant", response, tools_used)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save response error: {str(e)}")

    return ChatResponse(
        answer=response,
        session_id=session.session_id,
        tools_used=tools_used
    )


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = None,
    user: dict = Depends(verify_auth)
):
    """
    Upload CSV file with transactions.
    Process: Parse → Embed → Store in PostgreSQL with pgvector
    """
    ensure_db()

    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported. PDF support coming soon."
        )

    try:
        # 1. Read CSV content
        content = await file.read()
        content_str = content.decode('utf-8')

        # 2. Parse transactions
        transactions, errors = parse_csv(content_str, filename=file.filename)

        if not transactions:
            error_msg = errors[0] if errors else "No transactions found in file"
            raise HTTPException(status_code=400, detail=error_msg)

        # 3. Generate embeddings
        transactions_with_embeddings = embed_transactions(transactions)

        # 4. Store in database
        stored_count = store_transactions(transactions_with_embeddings)

        # 5. Calculate date range (use transactions_with_embeddings which are dicts)
        date_strings = [t.get("date") for t in transactions_with_embeddings if t.get("date")]
        date_range = None
        if date_strings:
            # Parse date strings to datetime objects
            dates = [datetime.strptime(d, "%Y-%m-%d") for d in date_strings]
            min_date = min(dates)
            max_date = max(dates)
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


@app.get("/api/stats")
async def get_stats(user: dict = Depends(verify_auth)):
    """
    Get statistics about available transaction data.
    Returns counts, date ranges, categories, source banks, and file list.
    """
    from db.init import get_cursor

    try:
        with get_cursor() as cur:
            # Total count
            cur.execute("SELECT COUNT(*) as count FROM transactions")
            total = cur.fetchone()["count"]

            if total == 0:
                return {
                    "total_transactions": 0,
                    "date_range": None,
                    "categories": [],
                    "sources": [],
                    "files": [],
                    "has_data": False
                }

            # Date range
            cur.execute("""
                SELECT
                    MIN(date) as min_date,
                    MAX(date) as max_date
                FROM transactions
            """)
            date_row = cur.fetchone()

            # Categories with counts
            cur.execute("""
                SELECT category, COUNT(*) as count
                FROM transactions
                WHERE category IS NOT NULL
                GROUP BY category
                ORDER BY count DESC
                LIMIT 10
            """)
            categories = [{"name": row["category"], "count": row["count"]} for row in cur.fetchall()]

            # Source banks with counts
            cur.execute("""
                SELECT source_bank, COUNT(*) as count
                FROM transactions
                GROUP BY source_bank
                ORDER BY count DESC
            """)
            sources = [{"name": row["source_bank"], "count": row["count"]} for row in cur.fetchall()]

            # Files with counts and date ranges
            cur.execute("""
                SELECT
                    source_file,
                    COUNT(*) as count,
                    MIN(date) as min_date,
                    MAX(date) as max_date,
                    source_bank
                FROM transactions
                WHERE source_file IS NOT NULL
                GROUP BY source_file, source_bank
                ORDER BY max_date DESC
            """)
            files = [{
                "filename": row["source_file"],
                "count": row["count"],
                "date_range": {
                    "start": row["min_date"].isoformat() if row["min_date"] else None,
                    "end": row["max_date"].isoformat() if row["max_date"] else None
                },
                "source": row["source_bank"]
            } for row in cur.fetchall()]

            # Recent transactions preview
            cur.execute("""
                SELECT date, description, amount, currency, category
                FROM transactions
                ORDER BY date DESC
                LIMIT 5
            """)
            recent = [dict(row) for row in cur.fetchall()]

            return {
                "total_transactions": total,
                "date_range": {
                    "start": date_row["min_date"].isoformat() if date_row["min_date"] else None,
                    "end": date_row["max_date"].isoformat() if date_row["max_date"] else None
                },
                "categories": categories,
                "sources": sources,
                "files": files,
                "recent_transactions": recent,
                "has_data": True
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")


@app.get("/api/transactions")
async def get_transactions(
    user: dict = Depends(verify_auth),
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """
    Get paginated list of transactions with optional filtering.
    """
    from db.init import get_cursor

    try:
        with get_cursor() as cur:
            # Build WHERE clause
            conditions = []
            params = []

            if search:
                conditions.append("description ILIKE %s")
                params.append(f"%{search}%")

            if category:
                conditions.append("category = %s")
                params.append(category)

            if source:
                conditions.append("source_bank = %s")
                params.append(source)

            if date_from:
                conditions.append("date >= %s")
                params.append(date_from)

            if date_to:
                conditions.append("date <= %s")
                params.append(date_to)

            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

            # Get total count for pagination
            count_query = f"SELECT COUNT(*) as count FROM transactions {where_clause}"
            cur.execute(count_query, params)
            total = cur.fetchone()["count"]

            # Get paginated transactions
            offset = (page - 1) * limit
            query = f"""
                SELECT id, date, description, amount, amount_original, currency,
                       category, type, source_bank, source_file
                FROM transactions
                {where_clause}
                ORDER BY date DESC, id DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(query, params + [limit, offset])

            transactions = []
            for row in cur.fetchall():
                tx = dict(row)
                # Convert date to string
                if tx.get("date"):
                    tx["date"] = tx["date"].isoformat()
                # Convert Decimal to float for JSON
                if tx.get("amount"):
                    tx["amount"] = float(tx["amount"])
                if tx.get("amount_original"):
                    tx["amount_original"] = float(tx["amount_original"])
                transactions.append(tx)

            return {
                "transactions": transactions,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting transactions: {str(e)}")


# Vercel detects FastAPI apps automatically via the `app` variable
