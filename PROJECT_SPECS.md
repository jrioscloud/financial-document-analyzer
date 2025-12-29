# Financial Document Analyzer - Project Specs

**Purpose:** Portfolio piece for Full Stack AI profile
**Positioning:** "Representation of a project built for a client under NDA"
**Timeline:** 5 days (by January 2nd, 2025)

---

## Goal

Build a RAG-powered chatbot that analyzes financial documents (CSV/PDF), answers questions about spending, and demonstrates tool calling with LangChain.

---

## What This Proves to Clients

| Capability | How It's Demonstrated |
|------------|----------------------|
| RAG Pipeline | Document → Embeddings → pgvector → Retrieval |
| Tool Calling | `search_transactions`, `analyze_spending`, `compare_periods` |
| Session Memory | Conversation history persisted |
| Production Deploy | AWS Lambda or Vercel (not localhost) |
| Full Stack | Next.js frontend + FastAPI backend |

---

## Tech Stack

| Layer | Technology | Why (Job Mentions) |
|-------|------------|-------------------|
| Frontend | Next.js 14 + Tailwind + shadcn/ui | 753 mentions |
| Backend | FastAPI + Python | 368 + 105 mentions |
| AI Framework | LangChain + LangGraph | +77% growth |
| Database | PostgreSQL + pgvector | 131 mentions |
| LLM | OpenAI GPT-4 (or Claude API) | - |
| Deploy | Vercel (frontend) + AWS Lambda (backend) | 828 mentions |

---

## Demo Data

**Source:** `/Volumes/Chocoflan/Documents/FN_Upwork_unlocked/financial_analysis/`

For public demo, data will be **anonymized**:
- Merchant names: "Starbucks" → "Coffee Shop A"
- Amounts: Rounded
- Dates: Shifted

**Schema:**
```
transactions (
  id SERIAL PRIMARY KEY,
  date DATE,
  description TEXT,
  amount DECIMAL,
  category TEXT,
  type TEXT  -- 'income' | 'expense'
)
```

---

## Agent Tools

| Tool | Input | Output |
|------|-------|--------|
| `search_transactions` | keyword, date_range | List of matching transactions |
| `analyze_spending` | category, date_range | Total, average, count |
| `compare_periods` | period_a, period_b | Comparison with % change |
| `categorize_transaction` | description | Suggested category |
| `generate_report` | date_range | Summary by category |

---

## API Endpoints

```
POST /api/chat
  Body: { message: string, session_id?: string }
  Response: { answer: string, session_id: string, tools_used: string[] }

POST /api/upload
  Body: FormData (CSV or PDF file)
  Response: { transactions_count: number, status: string }

GET /api/history/{session_id}
  Response: { messages: Message[] }

GET /api/health
  Response: { status: "ok", version: string }
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│  FastAPI        │────▶│   PostgreSQL    │
│   /app/chat     │     │  /api/chat      │     │   + pgvector    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        │               │   LangChain     │             │
        │               │   Agent + Tools │─────────────┘
        │               └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────▶│   OpenAI API    │
                        └─────────────────┘
```

---

## File Structure

```
financial-document-analyzer/
├── PROJECT_SPECS.md          # This file
├── README.md                 # Public-facing docs
├── backend/
│   ├── main.py              # FastAPI app
│   ├── agent.py             # LangChain agent + tools
│   ├── embeddings.py        # pgvector operations
│   ├── models.py            # Pydantic schemas
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Chat UI
│   │   └── api/             # Next.js API routes (proxy)
│   ├── components/
│   │   ├── ChatWidget.tsx
│   │   ├── FileUpload.tsx
│   │   └── TransactionList.tsx
│   └── package.json
├── data/
│   └── sample_transactions.csv  # Anonymized demo data
├── docker-compose.yml        # Local dev
└── deploy/
    ├── lambda/              # AWS Lambda config
    └── vercel.json          # Vercel config
```

---

## 5-Day Build Plan

| Day | Focus | Deliverables |
|-----|-------|--------------|
| 1 | Data + DB | CSV parser, pgvector setup, embed sample data |
| 2 | Agent | LangChain agent with 5 tools, RAG retrieval |
| 3 | Backend | FastAPI endpoints, session management |
| 4 | Frontend | Next.js chat UI, file upload component |
| 5 | Deploy | AWS/Vercel deploy, README, architecture diagram |

---

## Deployment Options

| Option | Cost | Complexity |
|--------|------|------------|
| **Vercel + Supabase** | $0 | Low |
| **Vercel + Railway** | $5-10/mo | Low |
| **AWS Lambda + RDS** | $15-25/mo | Medium |

**Chosen:** Vercel (frontend) + Supabase (DB) for free tier

---

## Portfolio Deliverables

- [ ] Live demo: `https://financial-analyzer.vercel.app`
- [ ] Architecture diagram (for Upwork portfolio)
- [ ] Case study article: "Building a RAG Financial Analyzer"
- [ ] Video walkthrough (3-5 min)
- [ ] GitHub repo (public, sanitized data)

---

## References

- **Planning doc:** `/Volumes/Chocoflan/Documents/FN_Upwork_unlocked/specialized_profiles/full_stack_ai_profile/portfolio_items_plan.md`
- **Financial data:** `/Volumes/Chocoflan/Documents/FN_Upwork_unlocked/financial_analysis/`
- **LangChain learning:** `/Volumes/Chocoflan/Documents/FN_Upwork_unlocked/learning/langchain_study_tracker.md`

---

**Status:** SPECS COMPLETE - Ready to build
