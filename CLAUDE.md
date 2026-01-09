# Project Instructions for Claude

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
