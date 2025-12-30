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
**Status:** ✅ COMPLETE (2025-12-29)

### 6.1 End-to-End Test
- [x] Start all services: `docker compose up -d` + backend + frontend
- [x] Upload sample CSV via UI
- [x] Test queries:
  - [x] "Show me my transactions from December 2024" ✅
  - [x] "Generate a spending report for November 2024" ✅
  - [x] "What is the biggest transaction?" ✅
- [x] Verify conversation memory works (multi-turn) ✅
- [x] Tool badges display correctly (`search_transactions`, `generate_report`) ✅

### 6.2 Fixes Applied During Testing
- [x] CORS: Added port 3001 to allowed origins
- [x] Date awareness: Agent now knows current date (2025-12-29)
- [x] Suggestion buttons: Wired up onClick handlers
- [x] Markdown rendering: Added ReactMarkdown for formatted responses

### 6.3 Known Issues
- [ ] Duplicate transactions when CSV uploaded multiple times (needs dedup logic)

---

## Phase 7: Deployment
**Executor:** Manual + Claude Code | **Time:** 2 hours
**Chosen:** Vercel + Supabase ($0/month)

### 7.1 Supabase Setup
- [X] Create Supabase project at https://supabase.com
- [X] Enable pgvector extension (Database → Extensions → vector)
- [X] Run schema.sql in SQL Editor (executed 2025-12-29)
- [X] Get connection string: `postgresql://postgres:[YOUR-PASSWORD]@db.udutjcqqasibewbmkgej.supabase.co:5432/postgres`
- [X] Upload sample data via SQL (10 sample transactions inserted)

### 7.1.5 Authentication (Supabase Auth) - REQUIRED BEFORE DEPLOY
**Decision:** Use Supabase Auth to protect the app from unauthorized access and brute force attacks.
**Cost:** $0 (included in Supabase free tier - 50,000 MAU)

**Why Supabase Auth over simple password:**
- Built-in rate limiting (blocks brute force)
- Exponential backoff on failed attempts
- Secure password hashing (bcrypt)
- Session management with JWT tokens
- Protection against automated/GPT attacks

**Implementation:**
- [x] Enable Auth in Supabase dashboard (Authentication → Settings)
- [x] Create admin user via Supabase dashboard: jaime.rios@hey.com
- [x] Install `@supabase/supabase-js` in frontend
- [x] Create login page (`/login`)
- [x] Add auth middleware to protect `/app` route
- [ ] Protect API endpoints with session validation *(deferred - frontend auth sufficient for MVP)*
- [x] Add logout functionality

**Auth Flow:**
```
User visits /app → Not authenticated? → Redirect to /login →
Enter email + password → Supabase validates (rate limited) →
JWT session created → Redirect to /app → Access granted
```

**Files Created/Modified:**
- [x] `frontend/src/lib/supabase/client.ts` - Browser client
- [x] `frontend/src/lib/supabase/server.ts` - Server client
- [x] `frontend/src/lib/supabase/middleware.ts` - Session refresh helper
- [x] `frontend/src/app/login/page.tsx` - Login page
- [x] `frontend/src/middleware.ts` - Route protection
- [x] `frontend/src/app/app/page.tsx` - Added logout button
- [x] `.env.example` - Added Supabase env vars

**Status:** ✅ CODE COMPLETE (2025-12-30)
**Remaining:** Enable Auth + Create user in Supabase dashboard (manual steps)

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

## Phase 8.5: Landing Page & Routing
**Executor:** Claude Code | **Time:** 1 hour
**Status:** ✅ COMPLETE (2025-12-29)

### 8.5.1 Routing Structure
Convert standalone `index.html` to Next.js App Router with proper routing:

```
/                   → Landing Page (marketing/portfolio)
/app                → Chat Application (current functionality)
```

### 8.5.2 Implementation Steps

**Step 1: Create App Route**
- [x] Create `frontend/src/app/app/page.tsx`
- [x] Move current `frontend/src/app/page.tsx` content to `app/app/page.tsx`
- [x] This creates the `/app` route for the chat interface

**Step 2: Convert Landing Page**
- [x] Convert `index.html` (root) → `frontend/src/app/page.tsx`
- [x] Keep existing Tailwind styles (already compatible)
- [x] Use Next.js `Link` component for navigation
- [x] Reuse existing CSS variables from `globals.css`

**Step 3: Update CTAs**
All buttons should link to `/app`:
- [x] "Get Started" button (nav) → `/app`
- [x] "Upload Documents" button (hero) → `/app`
- [x] "Watch Demo" button → `#demo` anchor (stays on landing)
- [x] "Start Free Analysis" button (CTA section) → `/app`

**Step 4: Shared Components**
- [x] Extract `BrandIcon` to `components/BrandIcon.tsx` (used in both pages)
- [x] Keep navigation consistent between pages

### 8.5.3 User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  LANDING PAGE (/)                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Nav: Logo | Features | Demo | [Get Started → /app]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Hero Section                                        │   │
│  │  "Understand Your Finances With AI Precision"        │   │
│  │  [Upload Documents → /app]  [Watch Demo → #demo]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #demo - Interactive Chat Preview (static mockup)    │   │
│  │  Shows: User question → AI response with tool badge  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #features - 6 Tool Cards Grid                       │   │
│  │  Search | Analyze | Compare | Categorize | Report    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tech Stack: Next.js • FastAPI • LangChain • etc     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Final CTA: [Start Free Analysis → /app]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Footer: Logo | GitHub link                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ User clicks CTA
┌─────────────────────────────────────────────────────────────┐
│  APP PAGE (/app)                                            │
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │   Sidebar    │      Chat Interface                   │   │
│  │  ┌────────┐  │  ┌────────────────────────────────┐  │   │
│  │  │ Logo   │  │  │  Window Chrome (dots)          │  │   │
│  │  ├────────┤  │  ├────────────────────────────────┤  │   │
│  │  │New Chat│  │  │  Messages + Tool Badges        │  │   │
│  │  ├────────┤  │  │                                │  │   │
│  │  │ Upload │  │  │  - User bubbles (right)        │  │   │
│  │  │  CSV   │  │  │  - AI bubbles (left)           │  │   │
│  │  ├────────┤  │  │  - Markdown formatting         │  │   │
│  │  │        │  │  ├────────────────────────────────┤  │   │
│  │  │        │  │  │  Chat Input                    │  │   │
│  │  ├────────┤  │  └────────────────────────────────┘  │   │
│  │  │ Footer │  │                                      │   │
│  │  │  Tags  │  │                                      │   │
│  │  └────────┘  │                                      │   │
│  └──────────────┴──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 8.5.4 Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `frontend/src/app/app/page.tsx` | Chat app (move from page.tsx) |
| MODIFY | `frontend/src/app/page.tsx` | Landing page (convert from index.html) |
| CREATE | `frontend/src/components/BrandIcon.tsx` | Shared logo component |
| DELETE | `/index.html` | No longer needed after conversion |

### 8.5.5 Source Reference
The landing page HTML is at: `/Volumes/Chocoflan/Projects/financial-document-analyzer/index.html`
- Already uses Tailwind CSS (CDN version)
- Already has matching brand colors (brand-500 = #22c55e)
- Already has glass, glow, animation utilities
- Static chat mockup demonstrates tool usage

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
| **D9: Authentication** | ✅ Supabase Auth | Free, built-in brute force protection, rate limiting |

**Note:** Terraform folder (`deploy/terraform/`) kept for reference but not deployed. Shows IaC skills without incurring AWS costs.

---

## Progress Tracker

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Environment Setup | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 2. Database & Data | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 3. LangChain Agent | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 4. FastAPI Backend | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 5. Next.js Frontend | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 6. Integration Testing | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 7. Deployment | 🔄 In Progress | 2025-12-29 | |
| 8. Ingestion Pipeline | ⬜ Not Started | | |
| **8.5 Landing Page & Routing** | ✅ Complete | 2025-12-29 | 2025-12-29 |
| 9. Portfolio Deliverables | ⬜ Not Started | | |

---

## Market-Driven Feature Opportunities (from Capturely Q4 2025)

Based on 223 RAG/AI/Document jobs captured in the last 60 days:

| Feature | Job Count | Priority | Effort | Notes |
|---------|-----------|----------|--------|-------|
| **PDF Processing** | 21 | 🔴 HIGH | Medium | Add PyPDF2/pdfplumber, extract text → embeddings |
| **n8n/Workflow Integration** | 12 | 🟡 MEDIUM | Low | Show webhook endpoints, automation potential |
| **Voice/Speech Input** | 7 | 🟡 MEDIUM | Medium | Add Whisper API for voice queries |
| **Dashboard/Viz Charts** | 5 | 🟢 LOW | Medium | Recharts for spending pie/bar charts |
| **Compliance/Redaction** | 4 | 🟢 LOW | High | PII detection, auto-redact before storage |
| **Knowledge Graphs** | 3 | 🟢 LOW | High | Neo4j integration, entity relationships |

### Recommended Additions for Portfolio Impact:

1. **PDF Support (High ROI)** - Most requested, relatively easy to add
   - Use `pdfplumber` for text extraction
   - Same embedding pipeline as CSV
   - Shows document versatility
   - **Status:** ✅ APPROVED - Add to Phase 10

2. **Spending Charts (Visual Impact)** - Makes demos more impressive
   - Pie chart by category
   - Bar chart for monthly comparison
   - Use Recharts library
   - **Status:** ✅ APPROVED - Add to Phase 10
   - **Implementation:** Add `generate_chart` tool that returns structured JSON
   - **System prompt addition:** "You can generate charts using Recharts. Return chart data as JSON with {chart_type, data, title}."
   - **Frontend:** Check response for chart JSON → render with Recharts component

3. **Voice Input (Differentiator)** - Unique feature for demos
   - OpenAI Whisper API
   - "Ask with voice" button
   - Shows multi-modal capability
   - **Status:** ⬜ Deferred (nice-to-have)

---

## Bug Fix: File Date Context (Priority: HIGH)

**Problem:** When user uploads `BBVA_TDC_Julio_2025.csv` and asks "show me this month's spending", the agent interprets "this month" as December 2025 (current calendar month) instead of July 2025 (the file's date range).

**Root Cause:** Upload response returns transaction count but doesn't pass file metadata to the agent's context. The agent has no knowledge of:
- Which file was uploaded
- What date range the transactions cover
- What the "relevant" time period is for this session

### Proposed Fix

**Step 1: Calculate date range after upload**
```python
# In upload endpoint, after parsing:
min_date = min(t['date'] for t in transactions)
max_date = max(t['date'] for t in transactions)
```

**Step 2: Store in session metadata**
```python
session.set_context({
    "last_uploaded_file": filename,
    "data_date_range": {"start": min_date, "end": max_date},
    "data_month": "July 2025"  # Human-readable
})
```

**Step 3: Inject into agent system prompt**
```
User uploaded "BBVA_TDC_Julio_2025.csv" with 109 transactions.
Data date range: 2025-06-23 to 2025-07-20 (primarily July 2025).
When user refers to "this month" or "my spending", assume they mean the uploaded data period (July 2025), not the current calendar month.
```

### Files Modified
- [x] `backend/main.py` - Calculate date range, store in session, return in response
- [x] `backend/agent/memory.py` - Add file context storage (set_file_context, get_file_context_prompt)
- [x] `backend/agent/agent.py` - Inject file context into system prompt via create_agent()
- [x] `backend/models.py` - Add DateRange model, session_id to UploadResponse

### Status: ✅ COMPLETE (2025-12-30)

**Commit:** `fix: Agent now uses uploaded file date range instead of current calendar month`

---

## Architecture: LLM Categorization at Ingestion (Priority: MEDIUM)

**Problem:** Categories from bank CSVs are inconsistent and in Spanish (e.g., "Conveniencia", "Supermercado"). User wants LLM to normalize categories during upload while preserving original data.

### Current Flow
```
CSV Upload → Parse (keep bank's category) → Generate Embeddings → Store
```

### Proposed Flow ✅ APPROVED
```
CSV Upload → Parse → LLM Categorize (batch) → Generate Embeddings → Store
                          ↓
              Preserve original in JSONB
```

**Frontend Navigation:** No new tab needed for MVP. Categorization happens silently during upload. Users interact via chat. Optional "Transactions" browser tab can be added later for viewing/filtering data.

### Schema Changes

```sql
-- Current:
category TEXT,           -- Bank's raw category
original_data JSONB,     -- Full original row

-- Proposed:
category TEXT,           -- LLM-assigned normalized category
original_category TEXT,  -- Bank's raw category (for audit/comparison)
original_data JSONB,     -- Full original row (already exists)
```

### Category Options

**Option A: Predefined List (Recommended for Consistency)**
```python
NORMALIZED_CATEGORIES = [
    "Food & Dining",       # Restaurants, groceries, coffee, delivery
    "Transportation",      # Uber, DiDi, gas, parking, flights
    "Shopping",            # Amazon, retail, clothing
    "Bills & Utilities",   # Phone, internet, electricity, rent
    "Entertainment",       # Netflix, Spotify, games, movies
    "Health & Wellness",   # Pharmacy, gym, doctor, vitamins
    "Subscriptions",       # Recurring digital services
    "Income",              # Salary, freelance, refunds
    "Transfers",           # Between accounts, payments
    "Other"                # Uncategorized
]
```

**Option B: LLM-Inferred (More Flexible)**
- Let LLM create categories based on transaction patterns
- Less consistent across uploads
- May create duplicates ("Food" vs "Food & Dining")

### Batching Strategy (Cost Optimization) ✅ APPROVED
Instead of 1 LLM call per transaction, batch 20-50 transactions:

```python
def categorize_batch(transactions: list[dict]) -> dict[int, str]:
    """Categorize multiple transactions in one LLM call."""
    prompt = f"""
Categorize these transactions. Use ONLY these categories:
{NORMALIZED_CATEGORIES}

Transactions:
{format_transactions(transactions)}

Return JSON mapping index to category:
{{"0": "Food & Dining", "1": "Bills & Utilities", ...}}
"""
    response = llm.invoke(prompt)
    return json.loads(response)
```

**Cost Estimate:**
- 100 transactions ≈ 5,000 tokens
- gpt-4o-mini: $0.15/1M input tokens
- Cost per 100 transactions: ~$0.001

### Embedding Enhancement ✅ APPROVED
Embeddings will include the normalized category for improved semantic search:

**Current:**
```
"7 ELEVEN T2695 TORREAX"
```

**Enhanced:**
```
"7 ELEVEN T2695 TORREAX [Food & Dining] convenience store purchase"
```

This could improve semantic search relevance.

### Decision Points

| Question | Options | Decision |
|----------|---------|----------|
| **D5: Category List** | A) Predefined list (consistent) / B) LLM-inferred (flexible) | ✅ A - Predefined |
| **D6: Language** | A) English / B) Spanish / C) Both (display preference) | ✅ A - English |
| **D7: Re-categorization** | A) Allow user corrections / B) Read-only | ✅ B - Read-only (MVP) |
| **D8: Enhanced Embeddings** | A) Include category in embedding / B) Description only | ✅ A - Include category |

### Files to Create/Modify
- [ ] `backend/utils/categorizer.py` - New: LLM categorization logic
- [ ] `backend/utils/csv_parser.py` - Integrate categorization into pipeline
- [ ] `backend/db/schema.sql` - Add `original_category` column
- [ ] `backend/db/migrations/002_add_original_category.sql` - Migration for existing data

### Status: ✅ All Decisions Made - Ready to Implement

---

**Next Step:** Phase 7 - Deployment (Vercel + Supabase)

**Current Status (2025-12-29):**
- Database: Running on port 5434 (PostgreSQL + pgvector)
- Backend: Running on port 8000 (FastAPI + LangChain)
- Frontend: Running on port 3001 (Next.js 16 + Tailwind v4)
- Integration: ✅ All core features working
- Markdown: ✅ ReactMarkdown for formatted responses

**Ready for:** Deploy to production OR add PDF/Charts for enhanced portfolio
