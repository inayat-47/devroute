"""
Router for POST /api/analyze

Orchestrates the GitHub ingestion service and the resume fallback,
returning normalized Skill[] data for the frontend / Phase 2 LLM pipeline.
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.github_service import analyze_github_profile
from app.services.resume_service import extract_skills_from_text

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    """
    Profile a learner's existing skills.

    Priority:
        1. GitHub username → scan public repos
        2. Resume text → keyword extraction
        3. Neither → 422 (need at least one valid input)
    """
    username = (body.github_username or "").strip()
    resume = (body.resume_text or "").strip()

    # --- Path 1: GitHub ---
    if username:
        try:
            skills, repos_analyzed = await analyze_github_profile(username)

            note = None
            if repos_analyzed == 0:
                note = (
                    f"GitHub user '{username}' has no public repos. "
                    "Try pasting your resume text instead."
                )
            elif not skills:
                note = (
                    f"Scanned {repos_analyzed} repos but couldn't infer any "
                    "recognizable skills. You can supplement with resume text."
                )

            return AnalyzeResponse(
                known_skills=skills,
                repos_analyzed=repos_analyzed,
                source_used="github",
                note=note,
            )

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail=(
                    "GitHub API request timed out. Please try again in a few "
                    "moments, or paste your resume text instead."
                ),
            )
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status == 404:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"GitHub user '{username}' not found. "
                        "Check the username and try again."
                    ),
                )
            if status in (403, 429):
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "GitHub API rate limit reached. Try again in a few "
                        "minutes, or paste your resume text instead."
                    ),
                )
            if status == 401:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "GitHub API authentication error. The configured "
                        "GITHUB_TOKEN may be invalid. The request will "
                        "proceed without authentication."
                    ),
                )
            # Re-raise unexpected GitHub errors
            raise HTTPException(
                status_code=502,
                detail=f"GitHub API error: {exc.response.status_code} {exc.response.text[:200]}",
            )

    # --- Path 2: Resume text ---
    if resume:
        skills = extract_skills_from_text(resume)
        return AnalyzeResponse(
            known_skills=skills,
            repos_analyzed=0,
            source_used="resume",
            note=None if skills else "No recognizable skills found in the pasted text.",
        )

    # --- Path 3: Neither provided (Fresh learner profile) ---
    return AnalyzeResponse(
        known_skills=[],
        repos_analyzed=0,
        source_used="resume",
        note="No GitHub profile or resume text provided. Starting with a fresh skill profile.",
    )
