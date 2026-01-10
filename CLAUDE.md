# Project Instructions for Claude

## Capturely - Market Intelligence Integration

This project uses **Capturely** for market research and feature prioritization.

### Quick Database Queries

```bash
# Check Capturely status
docker ps --filter "name=capturely"

# Search job demand by keyword
docker exec capturely_postgres psql -U capturely -d capturely -c "
SELECT title FROM notifications
WHERE notification_date >= '2025-12-01'
  AND title ILIKE '%KEYWORD%'
ORDER BY notification_date DESC LIMIT 10;"

# Count keyword demand
docker exec capturely_postgres psql -U capturely -d capturely -c "
SELECT COUNT(*) FROM notifications
WHERE notification_date >= '2025-12-01' AND title ILIKE '%RAG%';"

# Compare feature demand
docker exec capturely_postgres psql -U capturely -d capturely -c "
SELECT
  'RAG' as feature, COUNT(*) FROM notifications WHERE title ILIKE '%RAG%' AND notification_date >= '2025-12-01'
UNION ALL
SELECT 'AI Agent', COUNT(*) FROM notifications WHERE title ILIKE '%agent%' AND title ILIKE '%AI%' AND notification_date >= '2025-12-01'
UNION ALL
SELECT 'Automation', COUNT(*) FROM notifications WHERE title ILIKE '%automation%' AND notification_date >= '2025-12-01'
ORDER BY count DESC;"
```

### Market Demand (Jan 2026)

| Feature | Jobs | Priority |
|---------|------|----------|
| Full-Stack | 486 | Core |
| SaaS | 403 | Core |
| AI/ML | 358 | Core |
| MVP | 176 | Core |
| RAG | 106 | ✅ Implemented |
| AI Agent | 99 | ✅ Implemented |
| Automation | 161 | 🔜 Next |
| Document | 40 | 🔜 Next |
| Pipeline | 35 | ✅ Implemented |

### Portfolio Assets Location
```
/Volumes/Chocoflan/Projects/financial-document-analyzer/portfolio_assets/
├── thumbnails/   # Upwork thumbnail images
├── screenshots/  # App screenshots for demos
└── pdfs/         # Case study PDFs
```

---

## Credentials & Environment

- **Demo credentials are in `frontend/.env.local`** - check there before asking for login info
- Test user: see `.env.local` for email/password

## Terminology

- **"The app"** = The authenticated app at `/app` (after login), NOT the landing page
- **"Chat history"** or **"conversation history"** = Messages shown in the actual app interface after login
- **"Landing page demo"** = The static demo preview on the homepage at `/`

## Project Structure

- `frontend/` - Next.js 16 app
- `backend/` - FastAPI + LangChain
- Production URL: https://finanalyzer-demo.vercel.app/

## Testing Changes

1. Always use Playwright MCP to verify changes in the actual app
2. Log in with credentials from `.env.local` to test authenticated features
3. Don't confuse landing page demo with the actual app functionality

## Aesthetic Framework & Styling

The project follows a 4-stage aesthetic framework defined in `frontend/src/app/globals.css`:

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `gradient-brand` | Primary green gradient for buttons/icons |
| `gradient-border-animated` | Animated gradient border (use for main containers) |
| `glow` / `glow-sm` | Subtle glow effects |
| `animate-glow-pulse` | Pulsing glow animation |
| `glass` / `glass-strong` | Glassmorphism backgrounds |
| `interactive-lift` | Hover lift effect for buttons |
| `btn-glow` | Button glow on hover |
| `animate-slide-up` | Entrance animation |
| `chat-bubble-user` | User message gradient |
| `chat-bubble-ai` | AI message glass style |

### Color System (OKLCH)

- **Brand green:** `--brand-500` through `--brand-900`
- Use `text-brand-400` for highlights in dark mode
- Use `bg-brand-500/10` for subtle backgrounds

### Landing Page as Reference

The landing page (`frontend/src/app/page.tsx`) is the aesthetic benchmark. When styling `/app`:
- Use `gradient-border-animated` instead of `gradient-border` for main chat container
- Add `animate-glow-pulse` for visual polish
- Match the window chrome styling (red/yellow/green dots)
- Use `gradient-brand` for primary action buttons
