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
