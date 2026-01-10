# Financial Document Analyzer - Implementation Plan

**Timeline:** 5 days (December 29, 2025 → January 2, 2026)
**Status:** ✅ Core MVP COMPLETE + Deployed
**Production:** https://finanalyzer-demo.vercel.app/
**Cost:** $0/month (Supabase + Vercel free tiers)

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

- [x] **OpenAI API key** - Get from https://platform.openai.com/api-keys
- [x] **Docker Desktop** - For local PostgreSQL + pgvector
- [x] **Node.js 18+** - For Next.js frontend
- [x] **Python 3.11+** - For FastAPI backend
- [x] **Supabase account** (optional) - For production DB

---

## Phase 1: Local Environment Setup
**Executor:** Claude Code | **Time:** 30 min
**Status:** ✅ COMPLETE (2025-12-29)

### 1.1 Docker Compose for Database
- [x] Create `docker-compose.yml` with PostgreSQL + pgvector
- [x] Add healthcheck for database readiness
- [x] Create `.env.example` with required variables
- [x] Test: `docker compose up -d` starts successfully *(verified)*

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
- [x] Test: `pip install -r requirements.txt` succeeds *(verified)*

### 1.3 Frontend Environment
- [x] Initialize Next.js 14 app in `frontend/`
- [x] Install shadcn/ui components (button, input, card, scroll-area)
- [x] Configure Tailwind CSS
- [x] Test: `npm run dev` shows default page *(verified)*

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
**Status:** ✅ COMPLETE (2025-12-29)

### 2.1 Database Schema
- [x] Create `backend/db/schema.sql` with multi-source support:
  - schema_migrations table for version tracking
  - transactions table with: amount_original, currency, source_bank, original_data (JSONB)
  - chat_sessions and chat_messages tables
  - Indexes for date, category, type, source, amount
- [x] Create `backend/db/init.py` to run schema
- [x] Test: Schema creates successfully in Docker PostgreSQL *(verified in Supabase)*

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
- [x] Create sample transactions in Supabase:
  - 10 sample transactions inserted via SQL (Phase 7.1)
  - Real user data uploaded via production UI
- [x] Test: Sample CSV loads into database *(verified)*

### 2.4 Embedding Generation
- [x] Create `backend/utils/embeddings.py`:
  - `generate_embedding()` for single text
  - `generate_embeddings_batch()` with batching
  - `embed_transactions()` to add embeddings to parsed data
- [x] Test: Sample transactions have embeddings *(verified in production)*

### 2.5 Database Migrations
- [x] Add Alembic to requirements.txt
- [x] schema_migrations table for tracking applied migrations
- [x] Schema.sql sufficient for MVP *(Alembic optional, not needed)*

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
- [x] Test: All endpoints work with curl/Postman *(verified in production)*

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
- [x] Test: Full flow works end-to-end *(verified in production)*

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
- [x] Table rendering: Added `remark-gfm` plugin for GFM table support (2025-12-30)
- [x] Math/LaTeX rendering: Added `remark-math` + `rehype-katex` for equations (2025-12-30)
- [x] Math typography: Fixed KaTeX serif fonts blending poorly with UI, added brand colors and proper spacing (2026-01-02)

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
- [x] Protect API endpoints with JWT validation ✅ (2025-12-30)
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

**Status:** ✅ COMPLETE (2025-12-30)

**Test User Credentials:**
- See `frontend/.env.local` for test user credentials (not committed)

### 7.2 Backend Deployment (Vercel Serverless)
- [x] Convert FastAPI to Vercel serverless functions
- [x] Create `api/` folder in frontend project
- [x] Deploy to Vercel
- [x] Set environment variables:
  - `DATABASE_URL` ✅
  - `OPENAI_API_KEY` ✅
  - `NEXT_PUBLIC_SUPABASE_URL` ✅
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅

**Files Created:**
- `frontend/api/index.py` - FastAPI app for Vercel
- `frontend/api/requirements.txt` - Python dependencies
- `frontend/api/agent/` - LangChain agent module
- `frontend/api/db/` - Database module
- `frontend/api/utils/` - CSV parser and embeddings
- `frontend/vercel.json` - Vercel configuration

**Security (2025-12-30):**
- `/api/chat` and `/api/upload` require valid Supabase JWT token
- `verify_auth` dependency validates token with Supabase Auth API
- Frontend sends `Authorization: Bearer <token>` header on all authenticated requests
- Prevents unauthorized access to OpenAI-powered endpoints

**Status:** ✅ COMPLETE (2025-12-30)

### 7.3 Frontend Deployment
- [x] Push to GitHub (public repo)
- [x] Connect to Vercel
- [x] Auto-deploy on push
- [x] Verify live demo works

**Production URL:** https://finanalyzer-demo.vercel.app/
**Status:** ✅ DEPLOYED (2025-12-30)

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
**Status:** ✅ COMPLETE (2025-12-30)

### 8.1 Local Ingestion Script
- [x] Create `scripts/ingest.py`:
  - Watch folder for new CSVs (`--watch /path/to/folder`)
  - Process single file (`--file /path/to/file.csv`)
  - Process all files in folder (`--folder /path/to/folder`)
  - Auto-process and embed on drop
  - Connect to Supabase directly via DATABASE_URL
- [x] Uses existing `csv_parser` and `embeddings` modules
- [ ] Test locally with sample CSV *(manual)*

**Usage:**
```bash
# Process a single file
python scripts/ingest.py --file data/transactions.csv

# Process all CSVs in a folder
python scripts/ingest.py --folder data/

# Watch folder for new files (poll every 5 seconds)
python scripts/ingest.py --watch ~/Downloads --interval 5
```

**Files Created:**
- `scripts/ingest.py` - CLI tool for local CSV ingestion

### 8.2 Terraform Reference (SKIPPED)
*Deferred - User requested NOT to implement this phase.*

~~Add to `deploy/terraform/ingestion.tf` for portfolio:~~
- ~~S3 bucket with event notification~~
- ~~Lambda function for processing~~
- ~~IAM roles and policies~~

*Can be added later if needed for portfolio reference.*


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

## Phase 8.6: UI/UX Enhancements
**Executor:** Claude Code | **Time:** 1 hour
**Status:** ✅ COMPLETE (2025-12-30)

### 8.6.1 Animations & Transitions
Added micro-interactions and transitions following the aesthetic skill framework (BEAUTIFUL → RIGHT → SATISFYING → PEAK stages):

**New Keyframe Animations (`globals.css`):**
| Animation | Description | Duration |
|-----------|-------------|----------|
| `fade-in-up` | Fade in while sliding up | 0.6s |
| `scale-bounce` | Scale up with bounce effect | 0.5s |
| `shake` | Horizontal shake (for errors) | 0.5s |
| `typing-dot` | Typing indicator dots | 1.4s |
| `ripple` | Button click ripple effect | 0.6s |
| `slide-down` | Slide down from top | 0.3s |
| `spin-pulse` | Rotating with pulse | 2s |
| `gradient-shift` | Animated gradient movement | 3s |
| `check-draw` | Checkmark drawing animation | 0.3s |
| `underline-grow` | Nav link underline on hover | 0.3s |
| `shimmer` | Skeleton loading effect | 1.5s |

**Utility Classes:**
- `.stagger-1` through `.stagger-6` - Staggered animation delays (0.1s increments)
- `.typing-dots` - Three-dot typing indicator
- `.skeleton` - Loading placeholder with shimmer
- `.nav-link` - Animated underline on hover
- `.card-glow` - Card hover glow effect
- `.btn-ripple` - Button click ripple effect
- `.gradient-border-animated` - Animated gradient border

### 8.6.2 Context-Aware Empty State
**Problem:** Empty state always showed query suggestions even without data, confusing new users.

**Solution:** Made `ChatWidget` context-aware with `hasData` prop:

```tsx
// When hasData is false (new user, no uploads):
<EmptyState>
  "Upload a CSV to get started"
  [Upload CSV Button]
</EmptyState>

// When hasData is true (data uploaded):
<EmptyState>
  "Try asking..."
  [Query Suggestion Buttons]
</EmptyState>
```

**Files Modified:**
- `frontend/src/components/ChatWidget.tsx` - Added `hasData`, `onUploadClick` props
- `frontend/src/app/app/page.tsx` - Added `hasData` state with localStorage persistence

### 8.6.3 Data Status Indicator
Added visual indicator in sidebar when data has been loaded:

```tsx
{hasData && (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
    <svg className="w-4 h-4 text-brand-400 animate-check">...</svg>
    <span className="text-xs text-brand-400">Data loaded</span>
  </div>
)}
```

### 8.6.4 Animation Locations
| Component | Animations Applied |
|-----------|-------------------|
| Landing Page Nav | `nav-link` underline animation |
| Landing Page Features | `stagger-1` through `stagger-6` on cards |
| Landing Page Demo | `gradient-border-animated` |z
| Chat Empty State | `animate-fade-in`, `interactive-lift` on buttons |
| Data Status | `animate-fade-in`, `animate-check` on icon |
| Error Banner | `animate-slide-up` |
| Typing Indicator | `typing-dots` animation |

---

## Phase 8.7: Data Visibility
**Executor:** Claude Code | **Time:** 1 hour
**Status:** ✅ COMPLETE (2025-12-30)

### 8.7.1 Backend Enhancements
- [x] Add `/api/transactions` endpoint with pagination and filtering
  - Supports: `page`, `limit`, `search`, `category`, `source`, `date_from`, `date_to`
- [x] Update `/api/stats` to include file list with transaction counts

### 8.7.2 Frontend Features
- [x] **Collapsible File List** in sidebar
  - Shows uploaded filenames
  - Transaction count per file
  - Source bank indicator
  - Expand/collapse toggle

- [x] **Transaction Browser Modal** (`TransactionBrowser.tsx`)
  - Searchable by description
  - Filterable by category and source
  - Paginated results (25 per page)
  - Formatted amounts and dates
  - Category badges

- [x] **"View All →" Button** to open browser from stats panel

### 8.7.3 API Types Added
```typescript
interface FileInfo { filename, count, date_range, source }
interface Transaction { id, date, description, amount, currency, category, ... }
interface TransactionsResponse { transactions, total, page, limit, total_pages }
interface TransactionFilters { search?, category?, source?, date_from?, date_to? }
```

---

## Phase 9: Portfolio Deliverables
**Executor:** Manual + Claude Code | **Time:** 2 hours
**Status:** ⬜ Not Started

**Reference:** See `PORTFOLIO_ITEMS.md` for detailed case study format and content for each feature.

### 9.1 Portfolio Case Studies (6 Items)
Each item follows AWS case study format. Full details in `PORTFOLIO_ITEMS.md`.

| # | Portfolio Item | PDF | Video |
|---|----------------|-----|-------|
| 1 | RAG Semantic Search | [ ] `01_RAG_Semantic_Search_Case_Study.pdf` | [ ] 2-min |
| 2 | LangChain 5-Tool Agent | [ ] `02_LangChain_Agent_Case_Study.pdf` | [ ] 3-min |
| 3 | Multi-Source Data Pipeline | [ ] `03_Multi_Source_Pipeline_Case_Study.pdf` | [ ] 2-min |
| 4 | Production Auth & Security | [ ] `04_Production_Security_Case_Study.pdf` | [ ] 2-min |
| 5 | Conversational Memory | [ ] `05_Conversational_Memory_Case_Study.pdf` | [ ] 2-min |
| 6 | Next.js Chat Interface | [ ] `06_Chat_Interface_Case_Study.pdf` | [ ] 2-min |

**PDF Location:** `docs/case_studies/`
**Video Location:** YouTube (unlisted) or Loom

### 9.2 Documentation
- [ ] Polish README.md with:
  - Screenshots (4 minimum)
  - Architecture diagram
  - Setup instructions
  - Demo queries
- [ ] Add LICENSE (MIT)

### 9.3 Architecture Diagram
- [ ] Create diagram showing:
  - User → Next.js → FastAPI → PostgreSQL
  - LangChain agent + tools
  - pgvector semantic search flow
- [ ] Export as PNG for Upwork portfolio
- [ ] Export as SVG for README

### 9.4 Screenshots
- [ ] Landing page (full page)
- [ ] Chat with tool badge visible
- [ ] Report/table output
- [ ] Transaction browser

**Location:** `docs/screenshots/`

### 9.5 Video Walkthrough
- [ ] Record 5-min combined demo:
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
| 7. Deployment | ✅ Complete | 2025-12-29 | 2025-12-30 |
| 8. Ingestion Pipeline | ✅ Complete | 2025-12-30 | 2025-12-30 |
| **8.5 Landing Page & Routing** | ✅ Complete | 2025-12-29 | 2025-12-29 |
| **8.6 UI/UX Enhancements** | ✅ Complete | 2025-12-30 | 2025-12-30 |
| **8.7 Data Visibility** | ✅ Complete | 2025-12-30 | 2025-12-30 |
| 9. Portfolio Deliverables | ⬜ Not Started | | |
| **10.1 PDF Processing** | ⬜ Not Started | | |
| **10.2 n8n Webhook** | ⬜ Not Started | | |
| **10.3 Spending Charts** | ⬜ Not Started | | |
| **10.4 Voice Input** | ⬜ Not Started | | |
| **10.5 LinkedIn OAuth** | ✅ Complete | 2025-01-01 | 2025-01-01 |

---

## Phase 10: Market-Aligned Enhancements

**Source:** Capturely Q4 2025 job analysis (9,000+ notifications)
**Rationale:** High-demand features that differentiate portfolio and match market needs

### 10.1 PDF Processing
**Executor:** Claude Code | **Time:** 4 hours
**Status:** ⬜ Not Started
**Market Signal:** 19 document AI jobs, "PDF" mentioned in 21+ RAG job descriptions

#### Why This Matters
- Most RAG jobs mention document processing
- CSV-only limits portfolio appeal
- PDF is the universal business document format

#### Implementation

**Step 1: Add Dependencies**
```bash
# backend/requirements.txt
pdfplumber>=0.11.0
PyPDF2>=3.0.0  # Fallback for encrypted PDFs
```

**Step 2: Create PDF Parser**
```python
# backend/utils/pdf_parser.py
import pdfplumber

def parse_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, chunk into paragraphs."""
    chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                # Chunk by paragraphs or fixed size
                paragraphs = text.split('\n\n')
                for i, para in enumerate(paragraphs):
                    if len(para.strip()) > 50:  # Skip tiny fragments
                        chunks.append({
                            'content': para.strip(),
                            'source': f'page_{page_num + 1}_chunk_{i}',
                            'page': page_num + 1
                        })
    return chunks
```

**Step 3: Update Upload Endpoint**
```python
@app.post("/api/upload")
async def upload_file(file: UploadFile):
    if file.filename.endswith('.pdf'):
        chunks = parse_pdf(file)
        # Generate embeddings for each chunk
        # Store in documents table (new)
    elif file.filename.endswith('.csv'):
        # Existing CSV logic
```

**Step 4: Add Documents Table**
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,  -- page_1_chunk_0
    page INTEGER,
    embedding vector(1536),
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

**Step 5: Update RAG Retrieval**
- Search both `transactions` and `documents` tables
- Combine results by similarity score

#### Files to Create/Modify
- [ ] `backend/utils/pdf_parser.py` - New: PDF text extraction
- [ ] `backend/api/index.py` - Update upload endpoint
- [ ] `backend/db/schema.sql` - Add documents table
- [ ] `frontend/src/components/FileUpload.tsx` - Accept .pdf files

#### Test Cases
- [ ] Upload single-page PDF
- [ ] Upload multi-page PDF
- [ ] Query: "What does the document say about X?"
- [ ] Mixed query: CSV transactions + PDF context

---

### 10.2 n8n Webhook Endpoint
**Executor:** Claude Code | **Time:** 2 hours
**Status:** ⬜ Not Started
**Market Signal:** 274 n8n jobs in Capturely - MASSIVE demand

#### Why This Matters
- n8n is the fastest-growing automation platform
- Shows integration capability
- Differentiator: "n8n-compatible" in portfolio

#### Implementation

**Step 1: Create Webhook Endpoint**
```python
# backend/api/webhook.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class WebhookPayload(BaseModel):
    transactions: Optional[List[dict]] = None
    query: Optional[str] = None
    session_id: Optional[str] = None
    action: str  # "ingest" | "query" | "report"

@router.post("/api/webhook")
async def webhook(payload: WebhookPayload):
    """
    n8n-compatible webhook for automated workflows.

    Actions:
    - ingest: Add transactions from external source
    - query: Ask a question, get AI response
    - report: Generate spending report for date range
    """
    if payload.action == "ingest":
        # Parse and store transactions
        count = await ingest_transactions(payload.transactions)
        return {"status": "success", "count": count}

    elif payload.action == "query":
        # Run through agent
        response = await agent_query(payload.query, payload.session_id)
        return {"status": "success", "response": response}

    elif payload.action == "report":
        # Generate report
        report = await generate_report(payload.session_id)
        return {"status": "success", "report": report}

    raise HTTPException(400, f"Unknown action: {payload.action}")
```

**Step 2: Add API Key Auth (Optional)**
```python
# Simple API key for webhook security
API_KEY = os.getenv("WEBHOOK_API_KEY")

@router.post("/api/webhook")
async def webhook(
    payload: WebhookPayload,
    x_api_key: str = Header(None)
):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")
    # ... rest of handler
```

**Step 3: Document n8n Integration**
Create `docs/n8n_integration.md` with:
- Webhook URL format
- Payload examples for each action
- n8n node configuration screenshots

#### Files to Create/Modify
- [ ] `backend/api/webhook.py` - New: Webhook handler
- [ ] `backend/api/index.py` - Register webhook router
- [ ] `docs/n8n_integration.md` - New: Integration guide
- [ ] `.env.example` - Add WEBHOOK_API_KEY

#### Portfolio Value
Add to portfolio description:
> "n8n-compatible webhook endpoint for automated data ingestion and AI queries"

---

### 10.3 Spending Charts (Recharts)
**Executor:** Claude Code | **Time:** 3 hours
**Status:** ⬜ Not Started
**Market Signal:** Visual demos convert better, "dashboard" mentioned in 5+ jobs

#### Why This Matters
- Text-only responses are boring in demos
- Charts show data visualization capability
- Recharts is the React standard

#### Implementation

**Step 1: Add Recharts**
```bash
cd frontend && npm install recharts
```

**Step 2: Create Chart Component**
```tsx
// frontend/src/components/SpendingChart.tsx
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ChartData {
  chart_type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

export function SpendingChart({ chartData }: { chartData: ChartData }) {
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (chartData.chart_type === 'pie') {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{chartData.title}</h3>
        <PieChart width={400} height={300}>
          <Pie data={chartData.data} dataKey="value" nameKey="name" cx="50%" cy="50%">
            {chartData.data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>
    );
  }

  // Bar chart for comparisons
  return (
    <BarChart width={500} height={300} data={chartData.data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" fill="#22c55e" />
    </BarChart>
  );
}
```

**Step 3: Add generate_chart Tool**
```python
# backend/agent/tools.py
@tool
def generate_chart(
    chart_type: str,
    date_from: str = None,
    date_to: str = None,
    group_by: str = "category"
) -> str:
    """
    Generate chart data for spending visualization.

    Args:
        chart_type: "pie" for category breakdown, "bar" for period comparison
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        group_by: "category" or "month"

    Returns:
        JSON string with chart_type, title, and data array
    """
    # Query database for aggregated data
    # Return JSON that frontend can render
```

**Step 4: Update ChatWidget to Render Charts**
```tsx
// In ChatWidget.tsx, check for chart data in response
if (message.chartData) {
  return <SpendingChart chartData={message.chartData} />;
}
```

#### Files to Create/Modify
- [ ] `frontend/src/components/SpendingChart.tsx` - New: Chart component
- [ ] `backend/agent/tools.py` - Add generate_chart tool
- [ ] `frontend/src/components/ChatWidget.tsx` - Render charts in messages
- [ ] `backend/models.py` - Add ChartData model

#### Test Cases
- [ ] "Show me a pie chart of spending by category"
- [ ] "Compare my spending month over month"
- [ ] Chart renders correctly in chat

---

### 10.4 Voice Input (Whisper)
**Executor:** Claude Code | **Time:** 4 hours
**Status:** ⬜ Not Started
**Market Signal:** 22 voice AI jobs, differentiator for demos

#### Why This Matters
- Voice input is impressive in demos
- Shows multi-modal capability
- OpenAI Whisper is easy to integrate

#### Implementation

**Step 1: Create Transcription Endpoint**
```python
# backend/api/transcribe.py
from openai import OpenAI
from fastapi import UploadFile

client = OpenAI()

@router.post("/api/transcribe")
async def transcribe(audio: UploadFile):
    """Transcribe audio to text using Whisper."""
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio.file
    )
    return {"text": transcript.text}
```

**Step 2: Add Voice Button to Chat**
```tsx
// frontend/src/components/VoiceInput.tsx
import { useState, useRef } from 'react';

export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob);

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const { text } = await res.json();
      onTranscript(text);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? '🔴 Stop' : '🎤 Voice'}
    </button>
  );
}
```

#### Files to Create/Modify
- [ ] `backend/api/transcribe.py` - New: Whisper endpoint
- [ ] `frontend/src/components/VoiceInput.tsx` - New: Voice button
- [ ] `frontend/src/components/ChatInput.tsx` - Integrate voice button

#### Test Cases
- [ ] Record audio, get transcription
- [ ] Transcription flows into chat input
- [ ] Full flow: Voice → Transcribe → Query → Response

---

### 10.5 LinkedIn OAuth (Supabase Provider)
**Executor:** Claude Code | **Time:** 30 min
**Status:** ✅ Complete (2025-01-01)
**Purpose:** Add LinkedIn sign-in option to demonstrate OAuth/OIDC integration for portfolio

#### Why This Matters
- Demonstrates OAuth2/OIDC implementation
- Shows multi-provider authentication capability
- Reuses existing Supabase Auth infrastructure
- Portfolio proof for LinkedIn-related consulting work

#### Prerequisites
- [x] LinkedIn Developer App created at https://www.linkedin.com/developers/
- [x] Products enabled: "Sign In with LinkedIn using OpenID Connect"
- [x] Authorized redirect URI: `https://udutjcqqasibewbmkgej.supabase.co/auth/v1/callback`

#### Implementation

**Step 1: Configure Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Providers
2. Find LinkedIn and toggle **Enable**
3. Enter:
   - **Client ID:** From LinkedIn Developer App
   - **Client Secret:** From LinkedIn Developer App
4. Copy the **Callback URL** shown
5. Save changes

**Step 2: Add Callback URL to LinkedIn**
1. Go to LinkedIn Developer Portal → Your App → Auth tab
2. Add Supabase callback URL to "Authorized redirect URLs for your app":
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
3. Save

**Step 3: Update Login Page**
```tsx
// frontend/src/app/login/page.tsx
// Add LinkedIn sign-in button next to email/password form

const handleLinkedInLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${window.location.origin}/app`,
      scopes: 'openid profile email'
    }
  })
  if (error) {
    setError(error.message)
  }
}

// In JSX, add button:
<button
  onClick={handleLinkedInLogin}
  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
>
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
  Sign in with LinkedIn
</button>
```

**Step 4: Handle OAuth Callback (Already handled by Supabase)**
Supabase middleware already handles the callback. User will be redirected to `/app` after successful LinkedIn auth.

**Step 5: Display LinkedIn Profile Data**
```tsx
// In /app page, after auth:
const { data: { user } } = await supabase.auth.getUser()

// LinkedIn data available in:
// user.user_metadata.full_name
// user.user_metadata.avatar_url
// user.user_metadata.email
// user.user_metadata.provider_id (LinkedIn user ID)
```

#### Files Modified
| Action | File | Description |
|--------|------|-------------|
| MODIFIED | `frontend/src/app/login/page.tsx` | Added LinkedIn OAuth button with OIDC flow |

#### Environment Variables
No new env vars needed - Supabase handles LinkedIn credentials in dashboard.

#### Configuration Applied
- LinkedIn Client ID: `78n9890iwl54bj`
- Supabase Site URL: Updated from `localhost:3000` → `https://finanalyzer-demo.vercel.app`
- Feature Flag: `NEXT_PUBLIC_ENABLE_LINKEDIN_AUTH` (enabled in production)

#### Test Cases
- [x] Click "Sign in with LinkedIn" → redirects to LinkedIn
- [x] Authorize on LinkedIn → redirects back to app
- [x] User is authenticated and can access `/app`
- [x] Supabase Site URL correctly set for production redirects

#### LinkedIn OIDC Scopes Available
| Scope | Data Returned |
|-------|---------------|
| `openid` | Required for OIDC |
| `profile` | name, picture |
| `email` | email address |

**Note:** LinkedIn OIDC does NOT return `headline` (job title) by default. That requires additional API calls with the access token - a more advanced implementation.

#### Portfolio Value
> "Multi-provider authentication: Email/password + LinkedIn OAuth using Supabase Auth with OpenID Connect"

---

### 10.6 Chat History Persistence
**Executor:** Claude Code | **Time:** 1 hour
**Status:** ✅ Complete (2026-01-09)
**Purpose:** Enable users to see and load previous conversations

#### Problem
- Chat history was only stored in browser localStorage
- Conversations lost when clearing browser data or switching devices
- No way to see previous sessions in the UI

#### Implementation

**Step 1: Database Schema Update**
Added columns to `chat_sessions` table:
```sql
ALTER TABLE chat_sessions ADD COLUMN title TEXT;
ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0;
```

**Step 2: Backend Changes**
- `SessionMemory` now tracks and persists session titles (from first user message)
- Message count updated on each new message
- New `/api/sessions` endpoint lists recent sessions

**Step 3: Frontend Changes**
- Sidebar shows collapsible "Recent Chats" section
- Sessions loaded from backend instead of localStorage
- Click to load any previous conversation
- Auto-refresh after sending messages

#### Files Modified
| File | Changes |
|------|---------|
| `backend/db/schema.sql` | Added title, message_count columns with migration |
| `backend/agent/memory.py` | Title tracking, list_sessions() function |
| `backend/main.py` | `/api/sessions` endpoint |
| `frontend/src/lib/api.ts` | `getSessions()` API function |
| `frontend/src/app/app/page.tsx` | Chat history sidebar UI |

#### Commits
- `94cda75` - feat: Add persistent chat history with backend storage

---

### 10.7 Agent UX Improvements
**Executor:** Claude Code | **Time:** 1 hour
**Status:** ✅ Complete (2026-01-09)
**Purpose:** Make AI responses friendlier, cleaner, and match the landing page demo quality

#### Problem
- Agent responses used verbose markdown tables that looked cluttered
- Response format inconsistent with polished demo on landing page
- Tone was too formal/clinical

#### Implementation

**Step 1: System Prompt Overhaul**
Updated `backend/agent/agent.py` with comprehensive formatting rules:

```python
## CRITICAL Formatting Rules
- **NEVER use markdown tables** (no | pipes |)
- Use simple `-` bullet lists for breakdowns
- Always include a **Total** line at the end
- Keep breakdown to top 5-7 categories max
```

**Step 2: Response Pattern Examples**
Added explicit examples for each query type:

```
For spending queries:
Here's your spending breakdown for **September 2025**:

- Transportation - **$7,370.56 MXN**
- Restaurants - **$5,197.14 MXN**
- Travel - **$2,070.00 MXN**

**Total: $16,476.64 MXN**
```

**Step 3: Tone Guidelines**
- Conversational and friendly
- Celebrate wins (spending decreases)
- Keep insights brief and actionable

#### Files Modified
| File | Changes |
|------|---------|
| `backend/agent/agent.py` | Complete system prompt rewrite |

#### Commits
- `4c98931` - feat: Improve agent system prompt for friendlier responses
- `2d18701` - fix: Update agent prompt to use clean list format instead of tables

---

### 10.8 MDX Component Rendering
**Executor:** Claude Code | **Time:** 2 hours
**Status:** ✅ Complete (2026-01-09)
**Purpose:** Rich component rendering for structured financial data

#### Problem
- Raw markdown doesn't capture the visual polish of the landing page demo
- Need consistent, beautiful rendering for spending breakdowns, comparisons, etc.

#### Solution: Smart Markdown with Component Detection
Instead of true MDX (which requires compilation), use pattern detection to auto-upgrade markdown to styled React components.

**Approach:**
1. LLM outputs markdown in specific formats (via system prompt)
2. Frontend detects patterns (bullet lists with amounts, comparison patterns)
3. Auto-render with custom styled components
4. Fallback to standard markdown if no pattern matches

**Components Created:**
| Component | Pattern Detected | Renders As |
|-----------|------------------|------------|
| `SpendingBreakdown` | Bullet list with category - amount | Styled list with totals |
| `ComparisonView` | Lines with → arrows and percentages | Side-by-side comparison |
| `TransactionList` | Date - Description - Amount format | Searchable transaction table |
| `TotalLine` | Lines starting with "Total:" | Highlighted total row |

**System Prompt Additions:**
```
Available output components (frontend will auto-detect and style):

1. SPENDING BREAKDOWN - Use this format:
   - Category Name - **$X,XXX.XX**
   - Another Category - **$XXX.XX**
   **Total: $X,XXX.XX**

2. COMPARISON - Use this format:
   - Category: **$XXX** → **$XXX** (↑/↓ X%)

3. TRANSACTION LIST - Use this format:
   - Date - DESCRIPTION - **$XXX.XX**
```

#### Files Created/Modified
| File | Changes |
|------|---------|
| `frontend/src/components/chat/SpendingBreakdown.tsx` | New: Styled spending list |
| `frontend/src/components/chat/ComparisonView.tsx` | New: Side-by-side comparison |
| `frontend/src/components/chat/TotalLine.tsx` | New: Highlighted total |
| `frontend/src/components/ChatWidget.tsx` | Pattern detection + component rendering |
| `backend/agent/agent.py` | Output format documentation |

#### Benefits
- Consistent, beautiful rendering matching landing page quality
- No true MDX compilation needed (simpler, faster)
- Graceful fallback to markdown
- Backend-aware of available visual components

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

**Next Step:** Phase 9 Portfolio Deliverables OR Phase 10 Enhancements

**Current Status (2026-01-09):**
- Production URL: https://finanalyzer-demo.vercel.app/
- Database: Supabase PostgreSQL + pgvector
- Backend: FastAPI on Vercel serverless
- Frontend: Next.js 14 on Vercel
- Auth: ✅ Email/password + LinkedIn OAuth (multi-provider)
- All core phases (1-8.7): ✅ Complete
- Phase 10.5 LinkedIn OAuth: ✅ Complete
- Phase 10.6 Chat History Persistence: ✅ Complete
- Phase 10.7 Agent UX Improvements: ✅ Complete
- Phase 10.8 MDX Component Rendering: ✅ Complete

**Pending Work:**
| Phase | Description | Effort |
|-------|-------------|--------|
| 9.x | Portfolio Deliverables (PDFs, videos, screenshots) | Manual |
| 10.1 | PDF Processing | 4 hrs |
| 10.2 | n8n Webhook | 2 hrs |
| 10.3 | Spending Charts | 3 hrs |
| 10.4 | Voice Input | 4 hrs |

---

## Phase 11: Market-Driven Features (Capturely Analysis - Jan 2026)

Based on Capturely job intelligence database (9,000+ notifications analyzed).

### Market Demand Rankings

| Feature | Jobs | Trend | Priority |
|---------|------|-------|----------|
| Automation | 161 | Growing | 🔥 HIGH |
| Chat interfaces | 110 | Stable | ✅ Done |
| AI Agent (agentic) | 99 | 🔥 +46% | ✅ Done |
| Document processing | 40 | Stable | MEDIUM |
| Pipeline orchestration | 35 | Growing | ✅ Done |
| Integration/API | 192 | High | 🔥 HIGH |
| Data visualization | 205 | High | 🔥 HIGH |

### 11.1 Scheduled Reports (Automation - 161 jobs)
**Match:** "automation", "scheduled", "workflow"

```python
# New tool: schedule_report
@tool
def schedule_report(
    frequency: str,  # daily, weekly, monthly
    report_type: str,  # spending_summary, category_breakdown
    email: str
) -> str:
    """Schedule automated financial reports."""
```

**Implementation:**
- [ ] Supabase scheduled functions OR n8n webhook
- [ ] Email delivery via Resend/SendGrid
- [ ] Report templates (spending summary, alerts)

**Effort:** 4 hrs

### 11.2 External Integrations (API - 192 jobs)
**Match:** "integration", "API", "connect", "webhook"

**Options:**
1. **Plaid integration** - Auto-import bank transactions
2. **Stripe integration** - Import business revenue
3. **QuickBooks/Xero** - Accounting sync
4. **Webhook endpoints** - Let users push data

**MVP:** Webhook endpoint to receive transactions via API

```python
@app.post("/api/webhook/transactions")
async def receive_transactions(
    data: List[Transaction],
    api_key: str = Header(...)
):
    """Receive transactions from external systems."""
```

**Effort:** 3 hrs

### 11.3 Spending Visualizations (Data - 205 jobs) ✅ COMPLETED
**Match:** "data", "visualization", "charts", "dashboard"

**Components:**
- [x] Spending by category (pie chart) - `SpendingPieChart.tsx`
- [x] Spending over time (area chart) - `SpendingLineChart.tsx`
- [x] Income vs expenses tracking - integrated in line chart
- [x] Top categories (horizontal bar) - `SpendingBarChart.tsx`

**Additional Implementation:**
- [x] Icon-based sidebar navigation (`IconSidebar.tsx`) - 64px collapsed
- [x] Dashboard view with stats cards (`Dashboard.tsx`)
- [x] View switching between Chat and Dashboard modes
- [x] Enhanced `/api/stats` with `category_amounts` and `monthly_spending`
- [x] Collapsible sidebar panel for chat history
- [x] Recharts library with OKLCH color palette
- [x] Sankey flow chart (`SpendingFlowChart.tsx`) - gradient flows from total to categories
- [x] Pointer cursor for all interactive elements (global CSS fix)

**Tech:** Recharts in Next.js with dark mode support

**Effort:** 4 hrs (Completed Jan 2026)

### 11.4 PDF Bank Statement Processing (Document - 40 jobs)
**Match:** "document", "PDF", "OCR", "extract"

**Implementation:**
- [ ] PDF upload endpoint
- [ ] pypdf2 or pdfplumber for text extraction
- [ ] LLM-based transaction parsing
- [ ] Support major bank statement formats

**Effort:** 6 hrs

### 11.5 Multi-Step Agent Workflows (AI Agent - 99 jobs)
**Match:** "agentic", "autonomous", "multi-step"

**Current:** Agent uses 1-2 tools per query
**Enhanced:** Agent can plan and execute 5+ step workflows

```python
# Example: "Analyze my spending and create a budget"
# Step 1: generate_report() → get spending by category
# Step 2: compare_periods() → identify trends
# Step 3: (new) suggest_budget() → create recommendations
# Step 4: (new) set_alerts() → configure overspending alerts
```

**New tools:**
- [ ] `suggest_budget` - AI-generated budget recommendations
- [ ] `set_alert` - Spending threshold alerts
- [ ] `find_savings` - Identify potential savings

**Effort:** 5 hrs

### 11.6 Voice Input (Voice AI - 56 jobs)
**Match:** "voice", "speech", "assistant"

**Implementation:**
- [ ] Web Speech API for browser voice input
- [ ] Whisper API for backend transcription
- [ ] Voice command shortcuts ("show last month's spending")

**Effort:** 4 hrs

### Feature Priority Matrix

| Feature | Market Demand | Effort | Demo Impact | Priority |
|---------|---------------|--------|-------------|----------|
| Spending Charts | 205 jobs | 4 hrs | HIGH | 🔥 1st |
| Webhook API | 192 jobs | 3 hrs | MEDIUM | 2nd |
| Scheduled Reports | 161 jobs | 4 hrs | HIGH | 3rd |
| PDF Processing | 40 jobs | 6 hrs | HIGH | 4th |
| Voice Input | 56 jobs | 4 hrs | WOW factor | 5th |
| Multi-Step Agent | 99 jobs | 5 hrs | MEDIUM | 6th |

### Recommended Next Sprint

**Week of Jan 13-17:**
1. ✅ Portfolio piece #1 complete (thumbnail, PDF, video)
2. [ ] **11.3 Spending Charts** - Highest demand + demo impact
3. [ ] **11.2 Webhook API** - "Integration" keyword popular

**Week of Jan 20-24:**
4. [ ] **11.1 Scheduled Reports** - Automation keyword
5. [ ] **11.4 PDF Processing** - Document keyword
