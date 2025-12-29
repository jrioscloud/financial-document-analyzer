# Financial Document Analyzer

RAG-powered chatbot for analyzing financial documents with LangChain tool calling.

## Stack

- **Frontend:** Next.js 14 + Tailwind + shadcn/ui
- **Backend:** FastAPI + LangChain + LangGraph
- **Database:** PostgreSQL + pgvector
- **Deploy:** Vercel + Supabase

## Features

- Upload CSV/PDF financial documents
- Natural language queries about spending
- Tool calling (search, analyze, compare)
- Session memory for multi-turn conversations

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Demo Queries

```
"How much did I spend on restaurants this month?"
"What are my top 5 expense categories?"
"Compare July vs August spending"
"Show transactions over $1,000"
```

## Architecture

See `PROJECT_SPECS.md` for detailed specs.

---

*This project represents work built for a client under NDA. The architecture and patterns are identical - only the domain and data have been changed.*
