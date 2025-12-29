# Financial Document Analyzer - Implementation Plan

**Timeline:** 5 days (by January 2nd, 2025)
**Approach:** Local-first development → Deploy when ready
**Cost Target:** < $5/month in production

---

## Cost Breakdown

| Service | Free Tier | Paid (if exceeded) |
|---------|-----------|-------------------|
| **Supabase** | 500MB DB, pgvector included | $25/mo |
| **Vercel** | Unlimited deploys (hobby) | $20/mo |
| **OpenAI Embeddings** | - | ~$0.02/1M tokens |
| **AWS Lambda** | 1M requests/month | $0.20/1M |
| **AWS S3** | 5GB storage | $0.023/GB |
| **Total (demo load)** | **$0-2/month** | |

---

## Prerequisites

- [ ] **OpenAI API key** - Get from https://platform.openai.com/api-keys
- [ ] **Docker Desktop** - For local PostgreSQL + pgvector
- [ ] **Node.js 18+** - For Next.js frontend
- [ ] **Python 3.11+** - For FastAPI backend
- [ ] **Supabase account** (optional) - For production DB

---

## Phase 1: Local Environment Setup
**Executor:** Claude Code | **Time:** 30 min

### 1.1 Docker Compose for Database
- [ ] Create `docker-compose.yml` with PostgreSQL + pgvector
- [ ] Add healthcheck for database readiness
- [ ] Create `.env.example` with required variables
- [ ] Test: `docker compose up -d` starts successfully

### 1.2 Backend Environment
- [ ] Create `backend/` folder structure
- [ ] Create `backend/requirements.txt` with dependencies:
  ```
  fastapi==0.109.0
  uvicorn==0.27.0
  langchain==0.1.0
  langchain-openai==0.0.2
  langchain-community==0.0.10
  pgvector==0.2.4
  psycopg2-binary==2.9.9
  python-multipart==0.0.6
  pydantic==2.5.3
  python-dotenv==1.0.0
  ```
- [ ] Create `backend/.env.example`
- [ ] Test: `pip install -r requirements.txt` succeeds

### 1.3 Frontend Environment
- [ ] Initialize Next.js 14 app in `frontend/`
- [ ] Install shadcn/ui components (button, input, card, scroll-area)
- [ ] Configure Tailwind CSS
- [ ] Test: `npm run dev` shows default page

---

## Phase 2: Database Schema & Sample Data
**Executor:** Claude Code | **Time:** 45 min

### 2.1 Database Schema
- [ ] Create `backend/db/schema.sql`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT,
    type TEXT CHECK (type IN ('income', 'expense')),
    embedding vector(1536),
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tools_used TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX ON transactions USING ivfflat (embedding vector_cosine_ops);
  ```
- [ ] Create `backend/db/init.py` to run schema
- [ ] Test: Schema creates successfully in Docker PostgreSQL

### 2.2 Sample Data (Anonymized)
- [ ] Create `data/sample_transactions.csv` with anonymized data:
  - 100-200 transactions
  - Categories: Food, Transport, Shopping, Bills, Entertainment, Income
  - Date range: 6 months
  - Amounts: Realistic but rounded
- [ ] Create `backend/utils/csv_parser.py` to load CSV
- [ ] Test: CSV loads into database

### 2.3 Embedding Generation
- [ ] Create `backend/utils/embeddings.py`:
  - Function to generate embeddings via OpenAI
  - Batch processing (avoid rate limits)
  - Store in pgvector
- [ ] Test: Sample transactions have embeddings

---

## Phase 3: LangChain Agent & Tools
**Executor:** Claude Code | **Time:** 2 hours

### 3.1 Tool Definitions
- [ ] Create `backend/agent/tools.py` with 5 tools:

**Tool 1: search_transactions**
```python
@tool
def search_transactions(query: str, date_from: str = None, date_to: str = None) -> str:
    """Search transactions by description using semantic search."""
    # 1. Generate embedding for query
    # 2. pgvector similarity search
    # 3. Return top 10 matches
```

**Tool 2: analyze_spending**
```python
@tool
def analyze_spending(category: str = None, date_from: str = None, date_to: str = None) -> str:
    """Analyze spending: total, average, count by category."""
    # SQL aggregation query
    # Return formatted summary
```

**Tool 3: compare_periods**
```python
@tool
def compare_periods(period_a_start: str, period_a_end: str,
                    period_b_start: str, period_b_end: str) -> str:
    """Compare spending between two time periods."""
    # Calculate totals for each period
    # Calculate % change
    # Return comparison
```

**Tool 4: categorize_transaction**
```python
@tool
def categorize_transaction(description: str) -> str:
    """Suggest category for a transaction description."""
    # Use LLM to classify
    # Return suggested category
```

**Tool 5: generate_report**
```python
@tool
def generate_report(date_from: str, date_to: str) -> str:
    """Generate spending summary report by category."""
    # Aggregate by category
    # Calculate percentages
    # Return formatted report
```

- [ ] Test each tool individually

### 3.2 Agent Setup
- [ ] Create `backend/agent/agent.py`:
  - Initialize ChatOpenAI (gpt-4o-mini for cost)
  - Bind tools to agent
  - System prompt for financial assistant
- [ ] Create `backend/agent/memory.py`:
  - Session-based conversation memory
  - Load/save to chat_messages table
- [ ] Test: Agent responds to queries using tools

### 3.3 RAG Retrieval
- [ ] Create `backend/agent/retriever.py`:
  - pgvector retriever setup
  - Combine with tool calling
- [ ] Test: "Show me my coffee purchases" returns relevant transactions

---

## Phase 4: FastAPI Backend
**Executor:** Claude Code | **Time:** 1.5 hours

### 4.1 API Structure
- [ ] Create `backend/main.py`:
  ```python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware

  app = FastAPI(title="Financial Document Analyzer")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:3000"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### 4.2 Endpoints
- [ ] `POST /api/chat` - Main chat endpoint
  ```python
  @app.post("/api/chat")
  async def chat(request: ChatRequest) -> ChatResponse:
      # 1. Get or create session
      # 2. Load conversation history
      # 3. Run agent with message
      # 4. Save response to history
      # 5. Return response + tools_used
  ```
- [ ] `POST /api/upload` - File upload endpoint
  ```python
  @app.post("/api/upload")
  async def upload_file(file: UploadFile) -> UploadResponse:
      # 1. Validate file type (CSV/PDF)
      # 2. Parse transactions
      # 3. Generate embeddings
      # 4. Store in database
      # 5. Return count
  ```
- [ ] `GET /api/history/{session_id}` - Get chat history
- [ ] `GET /api/health` - Health check
- [ ] Create `backend/models.py` with Pydantic schemas
- [ ] Test: All endpoints work with curl/Postman

---

## Phase 5: Next.js Frontend
**Executor:** Claude Code | **Time:** 2 hours

### 5.1 Layout & Styling
- [ ] Create app layout with sidebar + main area
- [ ] Add header with title
- [ ] Dark mode support (optional)

### 5.2 Chat Component
- [ ] Create `components/ChatWidget.tsx`:
  - Message list with scroll
  - User/assistant message bubbles
  - Tool usage indicators
  - Loading state
- [ ] Create `components/ChatInput.tsx`:
  - Text input with send button
  - Enter to send
  - Disable while loading

### 5.3 File Upload Component
- [ ] Create `components/FileUpload.tsx`:
  - Drag-and-drop zone
  - File type validation (CSV only for MVP)
  - Upload progress indicator
  - Success/error feedback

### 5.4 API Integration
- [ ] Create `lib/api.ts`:
  - `sendMessage(message, sessionId)`
  - `uploadFile(file)`
  - `getHistory(sessionId)`
- [ ] Handle session persistence (localStorage)
- [ ] Test: Full flow works end-to-end

---

## Phase 6: Local Integration Testing
**Executor:** Manual + Claude Code | **Time:** 1 hour

### 6.1 End-to-End Test
- [ ] Start all services: `docker compose up -d` + backend + frontend
- [ ] Upload sample CSV via UI
- [ ] Test queries:
  - [ ] "How much did I spend on food this month?"
  - [ ] "What are my top 5 expense categories?"
  - [ ] "Compare November vs December spending"
  - [ ] "Show transactions over $100"
  - [ ] "What category would 'UBER TRIP' be?"
- [ ] Verify conversation memory works (multi-turn)
- [ ] Test error handling (invalid file, API error)

### 6.2 Performance Check
- [ ] Response time < 3 seconds
- [ ] Embeddings generated correctly
- [ ] No memory leaks in backend

---

## Phase 7: Deployment
**Executor:** Manual (Terraform) or Claude Code | **Time:** 2 hours

### Option A: Vercel + Supabase (Recommended - FREE)

#### 7A.1 Supabase Setup
- [ ] Create Supabase project
- [ ] Enable pgvector extension
- [ ] Run schema.sql in SQL Editor
- [ ] Get connection string
- [ ] Upload sample data

#### 7A.2 Backend Deployment (Vercel Serverless)
- [ ] Convert FastAPI to Vercel serverless functions
- [ ] Create `api/` folder in frontend project
- [ ] Deploy to Vercel
- [ ] Set environment variables

#### 7A.3 Frontend Deployment
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Auto-deploy on push

### Option B: AWS (If you want Terraform practice)

#### 7B.1 Infrastructure (Terraform)
- [ ] Create `deploy/terraform/main.tf`:
  - VPC + Subnets (or use default)
  - RDS PostgreSQL (db.t3.micro - free tier eligible)
  - Lambda function (Python 3.12)
  - API Gateway
  - S3 bucket for uploads
  - IAM roles
- [ ] Create `deploy/terraform/variables.tf`
- [ ] Create `deploy/terraform/outputs.tf`
- [ ] Run `terraform plan` and review

#### 7B.2 Lambda Deployment
- [ ] Package backend as Lambda layer
- [ ] Create `deploy/lambda/handler.py` (Mangum adapter)
- [ ] Deploy via Terraform
- [ ] Test API Gateway endpoints

#### 7B.3 Frontend to Vercel (still free)
- [ ] Update API URL to AWS API Gateway
- [ ] Deploy frontend to Vercel

---

## Phase 8: Ingestion Pipeline (Optional Enhancement)
**Executor:** Claude Code + Terraform | **Time:** 1 hour

### 8.1 Local Ingestion Script
- [ ] Create `scripts/ingest.py`:
  - Watch folder for new CSVs
  - Auto-process on drop
- [ ] Test locally

### 8.2 AWS Ingestion (If using Option B)
- [ ] S3 bucket notification trigger
- [ ] Lambda function for processing
- [ ] Deploy via Terraform
- [ ] Test: Drop CSV in S3 → appears in database

---

## Phase 9: Portfolio Deliverables
**Executor:** Manual + Claude Code | **Time:** 2 hours

### 9.1 Documentation
- [ ] Polish README.md with:
  - Screenshots
  - Architecture diagram
  - Setup instructions
  - Demo queries
- [ ] Add LICENSE (MIT)

### 9.2 Architecture Diagram
- [ ] Create diagram showing:
  - User → Next.js → FastAPI → PostgreSQL
  - LangChain agent + tools
  - S3 → Lambda ingestion (if applicable)
- [ ] Export as PNG for Upwork portfolio

### 9.3 Video Walkthrough
- [ ] Record 3-5 minute demo:
  - Show UI
  - Upload a file
  - Ask questions
  - Show tool usage
  - Brief code walkthrough
- [ ] Upload to YouTube/Loom

### 9.4 Upwork Portfolio Item
- [ ] Create portfolio entry with:
  - Title: "RAG-Powered Financial Document Analyzer"
  - Description: Problem → Solution → Tech Stack → Results
  - Screenshots (3-4)
  - Live demo link
  - GitHub link (if public)

---

## Quick Start Commands

```bash
# Phase 1: Setup
cd /Volumes/Chocoflan/Projects/financial-document-analyzer
docker compose up -d
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# Development
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Watch logs
docker compose logs -f

# Testing
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on food?"}'
```

---

## Decision Points (Need Your Input)

### D1: LLM Model Choice
- [ ] **gpt-4o-mini** ($0.15/1M input) - Recommended for cost
- [ ] **gpt-4o** ($2.50/1M input) - Better quality
- [ ] **Claude 3 Haiku** ($0.25/1M input) - If you prefer Anthropic

### D2: Deployment Target
- [ ] **Option A: Vercel + Supabase** - $0/month, easiest
- [ ] **Option B: AWS Full** - $5-15/month, shows AWS skills

### D3: PDF Support
- [ ] **MVP: CSV only** - Faster to build
- [ ] **Full: CSV + PDF** - More impressive, needs pypdf/pdfplumber

### D4: Public or Private Repo
- [ ] **Public** - Portfolio visibility, sanitized data required
- [ ] **Private** - Can use real data structure

---

## Progress Tracker

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Environment Setup | ⬜ Not Started | | |
| 2. Database & Data | ⬜ Not Started | | |
| 3. LangChain Agent | ⬜ Not Started | | |
| 4. FastAPI Backend | ⬜ Not Started | | |
| 5. Next.js Frontend | ⬜ Not Started | | |
| 6. Integration Testing | ⬜ Not Started | | |
| 7. Deployment | ⬜ Not Started | | |
| 8. Ingestion Pipeline | ⬜ Not Started | | |
| 9. Portfolio Deliverables | ⬜ Not Started | | |

---

**Next Step:** Answer Decision Points (D1-D4), then start Phase 1.

**To delegate to Claude Code:** "Start Phase 1" or "Do task 1.1"
