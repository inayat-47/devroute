# DevRoute — AI-Powered Personalized Learning Path Recommender

DevRoute analyzes your GitHub profile to infer your existing skills, computes the gap to your target role using an LLM (Claude), and renders an interactive color-coded dependency graph showing what you've mastered, what's in progress, and what's missing — with AI-powered explanations for every skill node.

## Quick Start

### Prerequisites
- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.10 and pip

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # Fill in ANTHROPIC_API_KEY (needed from Phase 2)
uvicorn app.main:app --reload # Starts on http://localhost:8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                   # Starts on http://localhost:5173
```

### Verify

- Frontend: http://localhost:5173 — should show the DevRoute landing page
- Backend health: http://localhost:8000/api/health — should return `{"status": "ok"}`
- API docs (auto-generated): http://localhost:8000/docs

## Project Structure

```
devroute/
├── frontend/                  # React (Vite) + TailwindCSS
│   └── src/
│       ├── api/               # Axios client & API call functions
│       ├── components/        # Reusable UI components
│       ├── hooks/             # Custom React hooks
│       ├── pages/             # Page-level components (one per route)
│       ├── App.jsx            # Root component
│       └── main.jsx           # Entry point
│
├── backend/                   # Python + FastAPI
│   └── app/
│       ├── routers/           # API route handlers (like Express Router)
│       ├── services/          # Business logic & external API clients
│       ├── schemas/           # Pydantic models (request/response validation)
│       └── main.py            # FastAPI app entry point
│
├── requirements.md            # Project requirements (source of truth)
├── workflow.md                # Phase-by-phase build workflow
├── PROGRESS.md                # Cross-session build progress tracker
└── README.md                  # This file
```
