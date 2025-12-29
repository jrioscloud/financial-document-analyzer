# Financial Document Analyzer - Project Specs

**Purpose:** Portfolio piece for Full Stack AI profile
**Positioning:** "Representation of a project built for a client under NDA"
**Timeline:** 5 days (by January 2nd, 2025)

---

## Goal

Build a RAG-powered chatbot that consolidates and analyzes financial data from **multiple sources**:
- **Upwork transactions** (freelance income)
- **Bank statements** (Nu Bank, BBVA - credit/debit)

Answer questions about spending, income, and patterns across all accounts using LangChain tool calling.

---

## What This Proves to Clients

| Capability | How It's Demonstrated |
|------------|----------------------|
| RAG Pipeline | Document → Embeddings → pgvector → Retrieval |
| Multi-Source Integration | Upwork + Nu Bank + BBVA → unified schema |
| Tool Calling | `search_transactions`, `analyze_spending`, `compare_periods` |
| Session Memory | Conversation history persisted |
| Production Deploy | AWS Lambda or Vercel (not localhost) |
| Full Stack | Next.js frontend + FastAPI backend |
| Event-Driven Ingestion | S3 upload → Lambda → Auto-embed into pgvector |
| Infrastructure as Code | Terraform modules for S3 + Lambda |

---

## Tech Stack

| Layer | Technology | Why (Capturely Data - Dec 2025) |
|-------|------------|--------------------------------|
| Frontend | Next.js 14 + Tailwind + shadcn/ui | 709 mentions (8.5% of jobs) |
| Backend | FastAPI + Python | 105 + 371 mentions |
| AI Framework | LangChain + LangGraph | RAG: 93 mentions (growing) |
| Database | PostgreSQL + pgvector | 133 mentions |
| LLM | OpenAI gpt-4o-mini (cost) or Claude | - |
| Deploy | Vercel (frontend) + Supabase (DB) | 51 + 201 mentions |
| IaC | Terraform (optional AWS path) | 65 mentions (differentiator) |

**Market Positioning Note:** Clients say "RAG" (93 mentions) not "LangChain" (13 mentions). Lead with RAG in portfolio description.

---

## Supported Data Sources

| Source | Format | Currency | Example Columns |
|--------|--------|----------|-----------------|
| **Upwork** | CSV | USD | Date, Type, Contract_Details, Client, Amount_USD |
| **Nu Bank Credit** | CSV | MXN | Fecha, Categoria, Descripcion, Monto, Tipo |
| **Nu Bank Debit** | CSV | MXN | Fecha, Tipo, Descripcion, Monto, Cajita |
| **BBVA Credit** | CSV | MXN | Fecha_Operacion, Fecha_Cargo, Descripcion, Monto |
| **BBVA Debit** | CSV | MXN | Fecha, Descripcion, Monto, Saldo, Beneficiario |

**Auto-Detection:** Parser detects source from headers + filename automatically.

**Source Location:** `/Volumes/Chocoflan/Documents/FN_Upwork_unlocked/financial_analysis/`

---

## Demo Data

For public demo, data will be **anonymized**:
- Merchant names: "Starbucks" → "Coffee Shop A"
- Client names: "Kevin Dorry" → "Client A"
- Amounts: Rounded
- Dates: Shifted by random offset

---

## Database Schema

```sql
-- Core transaction data (multi-source)
transactions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,       -- Normalized: positive=income, negative=expense
  amount_original DECIMAL(12,2),        -- Original value before normalization
  currency VARCHAR(3) DEFAULT 'USD',    -- USD or MXN
  category TEXT,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')),
  source_bank VARCHAR(50),              -- upwork, nu_credit, nu_debit, bbva_credit, bbva_debit
  source_file TEXT,
  original_data JSONB,                  -- Full original CSV row (for audit)
  embedding vector(1536),               -- OpenAI text-embedding-3-small
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Schema migrations tracking
schema_migrations (
  version VARCHAR(14) PRIMARY KEY,
  name VARCHAR(255),
  applied_at TIMESTAMP
)

-- Session memory
chat_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

chat_messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tools_used TEXT[],
  created_at TIMESTAMP
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
├── IMPLEMENTATION_PLAN.md    # Detailed checklist
├── README.md                 # Public-facing docs
├── docker-compose.yml        # Local dev (PostgreSQL + pgvector)
├── .env.example              # Environment variables template
│
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   ├── agent/               # LangChain agent module
│   │   ├── agent.py         # Agent setup + system prompt
│   │   ├── tools.py         # 5 tool definitions
│   │   ├── memory.py        # Session-based memory
│   │   └── retriever.py     # pgvector RAG retriever
│   ├── db/
│   │   ├── schema.sql       # Database schema
│   │   └── init.py          # Schema initialization
│   └── utils/
│       ├── csv_parser.py    # CSV transaction parser
│       └── embeddings.py    # OpenAI embedding generation
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main chat page
│   │   └── layout.tsx       # App layout
│   ├── components/
│   │   ├── ChatWidget.tsx   # Message list + bubbles
│   │   ├── ChatInput.tsx    # Input + send button
│   │   └── FileUpload.tsx   # Drag-drop CSV upload
│   ├── lib/
│   │   └── api.ts           # API client functions
│   └── package.json
│
├── data/
│   └── sample_transactions.csv  # Anonymized demo data
│
├── scripts/
│   └── ingest.py            # Local file watcher (optional)
│
└── deploy/
    ├── terraform/           # AWS infrastructure (Option B)
    │   ├── main.tf
    │   ├── ingestion.tf     # S3 + Lambda trigger
    │   ├── variables.tf
    │   └── outputs.tf
    ├── lambda/              # Lambda function code
    │   ├── handler.py       # Mangum adapter for FastAPI
    │   └── requirements.txt
    └── vercel.json          # Vercel config (Option A)
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

## Deployment & Decisions

| Decision | Choice |
|----------|--------|
| **LLM Model** | gpt-4o-mini ($0.15/1M input) |
| **Deployment** | Vercel + Supabase ($0/month) |
| **File Support** | CSV only (MVP) |
| **Repo Visibility** | Public (anonymized data) |

**Deployment Stack:**
- **Frontend:** Vercel (free tier, auto-deploy from GitHub)
- **Database:** Supabase (free tier, pgvector included)
- **Terraform:** Reference code in `deploy/terraform/` (not deployed, shows IaC skills)

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

## Automated Ingestion Pipeline

**Use Case:** Drop monthly bank CSV exports into S3 → automatically parsed, embedded, and queryable.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   S3 Bucket     │────▶│  Lambda         │────▶│   PostgreSQL    │
│   /uploads/     │     │  process-doc    │     │   + pgvector    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
   PUT event              ┌─────┴─────┐
   (CSV/PDF)              │           │
                    Parse file   Generate embeddings
                                 (OpenAI/Bedrock)
```

### Components

| Component | Details |
|-----------|---------|
| **S3 Bucket** | `financial-docs-{env}` with prefixes: `uploads/csv/`, `uploads/pdf/` |
| **Lambda** | `process-financial-document` - Python 3.12, 1024MB, 5min timeout |
| **Trigger** | S3 PUT event on `uploads/*` |
| **Embeddings** | OpenAI `text-embedding-3-small` or AWS Bedrock Titan |

### Lambda Handler (Simplified)

```python
def handler(event, context):
    # 1. Get file from S3 event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    # 2. Download and parse
    obj = s3.get_object(Bucket=bucket, Key=key)
    if key.endswith('.csv'):
        transactions = parse_csv(obj['Body'])
    elif key.endswith('.pdf'):
        transactions = extract_pdf_transactions(obj['Body'])

    # 3. Generate embeddings
    embeddings = openai.embeddings.create(
        model="text-embedding-3-small",
        input=[t.description for t in transactions]
    )

    # 4. Store in pgvector
    with get_db_connection() as conn:
        for txn, emb in zip(transactions, embeddings.data):
            conn.execute(
                "INSERT INTO transactions (date, description, amount, category, embedding) "
                "VALUES (%s, %s, %s, %s, %s)",
                (txn.date, txn.description, txn.amount, txn.category, emb.embedding)
            )

    return {"status": "processed", "records": len(transactions)}
```

### Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 100 invocations/month | ~$0.01 |
| S3 | 1GB storage | ~$0.02 |
| OpenAI embeddings | 50K tokens/month | ~$0.01 |
| **Total** | | **< $1/month** |

### Terraform (Infrastructure as Code)

```hcl
# deploy/terraform/ingestion.tf

resource "aws_s3_bucket" "uploads" {
  bucket = "financial-docs-${var.environment}"
}

resource "aws_lambda_function" "processor" {
  function_name = "process-financial-document"
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  memory_size   = 1024
  timeout       = 300

  environment {
    variables = {
      DB_CONNECTION_STRING = var.db_connection_string
      OPENAI_API_KEY       = var.openai_api_key
    }
  }
}

resource "aws_s3_bucket_notification" "trigger" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }
}
```

### What This Proves to Clients

| Skill | Evidence |
|-------|----------|
| **Event-driven architecture** | S3 triggers Lambda automatically |
| **Serverless** | No servers to manage, scales to zero |
| **IaC** | Terraform modules (your moat) |
| **RAG ingestion** | Document → Embeddings → Vector store |
| **Cost optimization** | < $1/month for demo workload |

---

**Status:** SPECS COMPLETE - Ready to build