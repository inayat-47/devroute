"""
DevRoute Backend — FastAPI Application Entry Point

This is the equivalent of your Express app.js / server.js.

Key differences from Express you'll notice:
- FastAPI uses Python decorators (@app.get, @app.post) instead of app.get("/path", handler)
- Routes can be split into "routers" (like Express Router) and included via app.include_router()
- FastAPI auto-generates Swagger docs at /docs — no need for swagger-jsdoc
- CORS is middleware-based, similar to Express cors() middleware
- Uvicorn is the ASGI server (like nodemon but for Python async apps)
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file (equivalent to require('dotenv').config())
load_dotenv()

# Reduce httpx noise (suppress 404 probe logs for missing manifest files)
logging.getLogger("httpx").setLevel(logging.WARNING)

app = FastAPI(
    title="DevRoute API",
    description="AI-Powered Personalized Learning Path Recommender — Backend API",
    version="0.1.0",
)

# --- CORS Configuration ---
# In Express you'd do: app.use(cors({ origin: [...] }))
# FastAPI uses middleware classes instead.
# For development, we allow all origins. In production, restrict to your Vercel domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Alternate dev port
        "https://devroute.vercel.app", #deploy
    ],
    allow_credentials=True,
    allow_methods=["*"],           # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],           # Allow all headers
)


# Include all route modules (like app.use("/api", analyzeRouter) in Express)
from app.routers.analyze import router as analyze_router  # noqa: E402
from app.routers.generate_path import router as generate_path_router  # noqa: E402
from app.routers.explain import router as explain_router  # noqa: E402

app.include_router(analyze_router)
app.include_router(generate_path_router)
app.include_router(explain_router)


# --- Health Check ---
# Simple endpoint to confirm the backend is running.
# Useful for deployment health probes (Render checks this) and frontend connectivity tests.
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
