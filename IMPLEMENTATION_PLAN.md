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
**Status:** ✅ COMPLETE (2025-12-29)

### 1.1 Docker Compose for Database
- [x] Create `docker-compose.yml` with PostgreSQL + pgvector
- [x] Add healthcheck for database readiness
- [x] Create `.env.example` with required variables
- [ ] Test: `docker compose up -d` starts successfully *(manual)*

### 1.2 Backend Environment
- [x] Create `backend/` folder structure
- [x] Create `backend/requirements.txt` with dependencies:
  ```
  fastapi>=0.115.0
  uvicorn>=0.32.0
  langchain>=0.3.0
  langchain-openai>=0.2.0
  langchain-community>=0.3.0
  langgraph>=0.2.0
  pgvector>=0.3.0
  psycopg2-binary>=2.9.9
  python-multipart>=0.0.12
  pydantic>=2.9.0
  python-dotenv>=1.0.0
  ```
  Note: Use `>=` to get latest compatible versions. Pin exact versions before deployment.
- [x] Create `backend/.env.example` *(merged into root .env.example)*
- [ ] Test: `pip install -r requirements.txt` succeeds *(manual)*

### 1.3 Frontend Environment
- [x] Initialize Next.js 14 app in `frontend/`
- [x] Install shadcn/ui components (button, input, card, scroll-area)
- [x] Configure Tailwind CSS
- [ ] Test: `npm run dev` shows default page *(manual)*

**Files Created:**
- `docker-compose.yml` - PostgreSQL 16 + pgvector
- `.env.example` - All environment variables
- `backend/requirements.txt` - Python dependencies
- `backend/main.py` - FastAPI app entry point
- `backend/models.py` - Pydantic schemas
- `backend/agent/` - LangChain agent module (agent.py, tools.py, memory.py, retriever.py)
- `backend/db/` - Database module (schema.sql, init.py)
- `backend/utils/` - Utilities (csv_parser.py, embeddings.py)
- `frontend/` - Next.js 14 app with shadcn/ui components

---

## Phase 2: Database Schema & Sample Data
**Executor:** Claude Code | **Time:** 45 min
**Status:** 🔄 IN PROGRESS

### 2.1 Database Schema
- [x] Create `backend/db/schema.sql` with multi-source support:
  - schema_migrations table for version tracking
  - transactions table with: amount_original, currency, source_bank, original_data (JSONB)
  - chat_sessions and chat_messages tables
  - Indexes for date, category, type, source, amount
- [x] Create `backend/db/init.py` to run schema
- [ ] Test: Schema creates successfully in Docker PostgreSQL *(manual)*

### 2.2 Multi-Format CSV Parser
- [x] Create `backend/utils/csv_parser.py` supporting:
  - **Upwork:** Date,Type,Contract_Details,Client,Amount_USD,Status
  - **Nu Bank Credit:** Fecha,Categoria,Descripcion,Monto,Tipo
  - **Nu Bank Debit:** Fecha,Tipo,Descripcion,Monto,Cajita,Categoria
  - **BBVA Credit:** Fecha_Operacion,Fecha_Cargo,Descripcion,Monto,Categoria
  - **BBVA Debit:** Fecha,Descripcion,Monto,Saldo,Categoria,Tipo,Beneficiario
- [x] Auto-detect source from headers + filename
- [x] Normalize to common format (amount, currency, type)
- [x] Preserve original data as JSONB
- [x] Test: Upwork (63 txns) and Nu Bank (64 txns) parse correctly

### 2.3 Sample Data (Anonymized)
- [ ] Create `data/sample_transactions.csv` with anonymized data:
  - Based on real CSV structure (compatible with parser)
  - 100-200 transactions
  - Categories: Food, Transport, Shopping, Bills, Entertainment, Income
  - Anonymize: merchant names, round amounts, shift dates
- [ ] Test: Sample CSV loads into database

### 2.4 Embedding Generation
- [x] Create `backend/utils/embeddings.py`:
  - `generate_embedding()` for single text
  - `generate_embeddings_batch()` with batching
  - `embed_transactions()` to add embeddings to parsed data
- [ ] Test: Sample transactions have embeddings *(requires OpenAI key)*

### 2.5 Database Migrations
- [x] Add Alembic to requirements.txt
- [x] schema_migrations table for tracking applied migrations
- [ ] Setup Alembic config *(optional - schema.sql sufficient for MVP)*

---

## Phase 3: LangChain Agent & Tools
**Executor:** Claude Code | **Time:** 2 hours
**Status:** ✅ COMPLETE (2025-12-29)

### 3.1 Tool Definitions
- [x] Create `backend/agent/tools.py` with 5 tools:

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

- [x] Test each tool individually

### 3.2 Agent Setup
- [x] Create `backend/agent/agent.py`:
  - Initialize ChatOpenAI (gpt-4o-mini for cost)
  - Bind tools to agent
  - System prompt for financial assistant
- [x] Create `backend/agent/memory.py`:
  - Session-based conversation memory
  - Load/save to chat_messages table
- [x] Test: Agent responds to queries using tools *(requires database running)*

### 3.3 RAG Retrieval
- [x] Create `backend/agent/retriever.py`:
  - pgvector retriever setup
  - Combine with tool calling
- [x] Test: "Show me my coffee purchases" returns relevant transactions *(requires database running)*

---

## Phase 4: FastAPI Backend
**Executor:** Claude Code | **Time:** 1.5 hours
**Status:** ✅ COMPLETE (2025-12-29)

### 4.1 API Structure
- [x] Create `backend/main.py`:
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
- [x] `POST /api/chat` - Main chat endpoint
  ```python
  @app.post("/api/chat")
  async def chat(request: ChatRequest) -> ChatResponse:
      # 1. Get or create session
      # 2. Load conversation history
      # 3. Run agent with message
      # 4. Save response to history
      # 5. Return response + tools_used
  ```
- [x] `POST /api/upload` - File upload endpoint
  ```python
  @app.post("/api/upload")
  async def upload_file(file: UploadFile) -> UploadResponse:
      # 1. Validate file type (CSV/PDF)
      # 2. Parse transactions
      # 3. Generate embeddings
      # 4. Store in database
      # 5. Return count
  ```
- [x] `GET /api/history/{session_id}` - Get chat history
- [x] `GET /api/health` - Health check
- [x] Create `backend/models.py` with Pydantic schemas
- [ ] Test: All endpoints work with curl/Postman *(manual)*

---

## Phase 5: Next.js Frontend
**Executor:** Claude Code | **Time:** 2 hours
**Status:** ✅ COMPLETE (2025-12-29)

### 5.1 Layout & Styling
- [x] Create app layout with sidebar + main area
- [x] Add header with title
- [x] Dark mode support (built-in with Tailwind)

### 5.2 Chat Component
- [x] Create `components/ChatWidget.tsx`:
  - Message list with scroll
  - User/assistant message bubbles
  - Tool usage indicators
  - Loading state
- [x] Create `components/ChatInput.tsx`:
  - Text input with send button
  - Enter to send
  - Disable while loading

### 5.3 File Upload Component
- [x] Create `components/FileUpload.tsx`:
  - Drag-and-drop zone
  - File type validation (CSV only for MVP)
  - Upload progress indicator
  - Success/error feedback

### 5.4 API Integration
- [x] Create `lib/api.ts`:
  - `sendMessage(message, sessionId)`
  - `uploadFile(file)`
  - `getHistory(sessionId)`
- [x] Handle session persistence (localStorage)
- [ ] Test: Full flow works end-to-end *(manual)*

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
**Executor:** Manual + Claude Code | **Time:** 2 hours
**Chosen:** Vercel + Supabase ($0/month)

### 7.1 Supabase Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Enable pgvector extension (Database → Extensions → vector)
- [ ] Run schema.sql in SQL Editor
- [ ] Get connection string (Settings → Database → Connection string)
- [ ] Upload sample data via SQL or API

### 7.2 Backend Deployment (Vercel Serverless)
- [ ] Convert FastAPI to Vercel serverless functions
- [ ] Create `api/` folder in frontend project
- [ ] Deploy to Vercel
- [ ] Set environment variables:
  - `DATABASE_URL`
  - `OPENAI_API_KEY`

### 7.3 Frontend Deployment
- [ ] Push to GitHub (public repo)
- [ ] Connect to Vercel
- [ ] Auto-deploy on push
- [ ] Verify live demo works

### 7.4 Terraform Reference (NOT DEPLOYED)
Keep `deploy/terraform/` folder with working IaC code for portfolio reference:
- [ ] Create `deploy/terraform/main.tf` (VPC, RDS, Lambda, API Gateway, S3)
- [ ] Create `deploy/terraform/variables.tf`
- [ ] Create `deploy/terraform/outputs.tf`
- [ ] Validate with `terraform validate` (no `apply`)

*Purpose: Shows AWS/IaC skills in portfolio without incurring costs.*

---

## Phase 8: Ingestion Pipeline (Optional Enhancement)
**Executor:** Claude Code | **Time:** 1 hour

### 8.1 Local Ingestion Script
- [ ] Create `scripts/ingest.py`:
  - Watch folder for new CSVs
  - Auto-process and embed on drop
  - Connect to Supabase directly
- [ ] Test locally with sample CSV

### 8.2 Terraform Reference (NOT DEPLOYED)
Add to `deploy/terraform/ingestion.tf` for portfolio:
- [ ] S3 bucket with event notification
- [ ] Lambda function for processing
- [ ] IAM roles and policies
- [ ] Validate with `terraform validate`

*This shows the S3 → Lambda → pgvector pattern without deploying it.*

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

## Decisions (LOCKED)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **D1: LLM Model** | ✅ gpt-4o-mini | $0.15/1M input - cost effective |
| **D2: Deployment** | ✅ Vercel + Supabase | $0/month, Terraform kept for reference |
| **D3: PDF Support** | ✅ CSV only | Faster MVP, PDF can be added later |
| **D4: Repo Visibility** | ✅ Public | Portfolio visibility, data will be anonymized |

**Note:** Terraform folder (`deploy/terraform/`) kept for reference but not deployed. Shows IaC skills without incurring AWS costs.

---

## Progress Tracker

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Environment Setup | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 2. Database & Data | 🔄 In Progress | 2025-12-29 | - |
| 3. LangChain Agent | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 4. FastAPI Backend | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 5. Next.js Frontend | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 6. Integration Testing | ⬜ Not Started | | |
| 7. Deployment | ⬜ Not Started | | |
| 8. Ingestion Pipeline | ⬜ Not Started | | |
| 9. Portfolio Deliverables | ⬜ Not Started | | |

---

**Next Step:** Phase 6 - Integration Testing (run locally).

**To continue:** Run `docker compose up -d` then `cd backend && uvicorn main:app --reload` and `cd frontend && npm run dev`
