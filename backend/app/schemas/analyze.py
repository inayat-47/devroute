"""
Pydantic schemas for the /api/analyze endpoint.

These enforce the API contract defined in requirements.md:
  Request:  { githubUsername?, targetRole, resumeText? }
  Response: { knownSkills[], reposAnalyzed, sourceUsed }
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Body for POST /api/analyze."""

    github_username: Optional[str] = Field(
        None,
        alias="githubUsername",
        description="Public GitHub username to scan for repos.",
    )
    target_role: Optional[str] = Field(
        None,
        alias="targetRole",
        description="Optional target career goal (e.g. 'Senior Full-Stack Engineer').",
    )
    resume_text: Optional[str] = Field(
        None,
        alias="resumeText",
        description="Fallback: pasted resume / LinkedIn text for keyword extraction.",
    )

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class Skill(BaseModel):
    """A single inferred skill with provenance."""

    name: str = Field(..., description="Normalized skill name, e.g. 'React'.")
    evidence: Optional[str] = Field(
        None,
        description="Human-readable provenance, e.g. 'found in 4 repos as a dependency'.",
    )
    confidence: Literal["high", "medium", "low"] = Field(
        ...,
        description="How many independent signals confirmed this skill.",
    )


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    """Response for POST /api/analyze."""

    known_skills: list[Skill] = Field(
        default_factory=list,
        alias="knownSkills",
        description="Skills inferred from the user's profile.",
    )
    repos_analyzed: int = Field(
        0,
        alias="reposAnalyzed",
        description="Number of public repos scanned (0 if resume path used).",
    )
    source_used: Literal["github", "resume"] = Field(
        ...,
        alias="sourceUsed",
        description="Which profiling path was taken.",
    )
    note: Optional[str] = Field(
        None,
        description="Optional note, e.g. when no repos are found.",
    )

    model_config = {"populate_by_name": True}
