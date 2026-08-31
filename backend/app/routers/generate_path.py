"""Router for POST /api/generate-path

Generates an interactive skill dependency graph and gap analysis for a target role.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.generate_path import GeneratePathRequest, GeneratePathResponse
from app.services.gap_analysis_service import generate_skill_gap_path
from app.services.groq_client import GroqRateLimitException, GroqServiceException

logger = logging.getLogger("devroute.routers.generate_path")

router = APIRouter(prefix="/api", tags=["generate-path"])


@router.post("/generate-path", response_model=GeneratePathResponse)
async def generate_path(body: GeneratePathRequest) -> GeneratePathResponse:
    """
    Generate a personalized learning path and skill gap graph for a target role.

    - Compares target role requirements with learner's known skills.
    - Generates DAG nodes with completion status and prerequisite edges.
    - Calculates readiness percentage and provides a summary.
    """
    if not body.target_role or not body.target_role.strip():
        raise HTTPException(
            status_code=422,
            detail="Target role (targetRole) is required to generate a learning path.",
        )

    try:
        response = await generate_skill_gap_path(
            target_role=body.target_role.strip(),
            known_skills=body.known_skills,
        )
        return response

    except GroqRateLimitException as exc:
        logger.warning(f"Groq rate limit hit during generate-path: {exc}")
        raise HTTPException(
            status_code=429,
            detail="AI provider is busy, please try again shortly.",
        )
    except (ValueError, GroqServiceException) as exc:
        logger.error(f"Failed to generate valid learning path from AI: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate structured learning path: {str(exc)}",
        )
    except Exception as exc:
        logger.error(f"Unexpected error in /generate-path: {exc}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal server error occurred while analyzing skill gaps.",
        )
