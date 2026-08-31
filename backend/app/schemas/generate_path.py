"""Pydantic schemas for the POST /api/generate-path endpoint and LLM output validation."""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analyze import Skill


# ---------------------------------------------------------------------------
# API Request / Response models
# ---------------------------------------------------------------------------

class Resource(BaseModel):
    """A learning resource attached to a skill node."""
    title: str = Field(..., description="Title of the learning resource")
    url: str = Field(..., description="Web URL to documentation, course, or reference project")
    type: Literal["course", "doc", "project"] = Field(..., description="Resource format")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class SkillNode(BaseModel):
    """A node in the learning path DAG."""
    id: str = Field(..., description="Unique node ID (e.g. 'node-docker')")
    label: str = Field(..., description="Display name of the skill")
    category: str = Field(..., description="Skill domain (e.g. 'Backend', 'Frontend', 'DevOps')")
    status: Literal["completed", "in-progress", "missing"] = Field(
        ..., description="Learner status for this skill"
    )
    difficulty: Literal["beginner", "intermediate", "advanced"] = Field(
        ..., description="Skill difficulty level"
    )
    why_it_matters: Optional[str] = Field(
        None, alias="whyItMatters", description="Rationale for why this skill matters for the role"
    )
    prerequisites: list[str] = Field(
        default_factory=list, description="List of prerequisite node IDs"
    )
    resources: list[Resource] = Field(
        default_factory=list, description="1-2 recommended resources"
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class Edge(BaseModel):
    """A directed dependency edge (source must be learned before target)."""
    id: Optional[str] = Field(None, description="Edge ID (e.g. 'e-docker-kubernetes')")
    source: str = Field(..., description="Prerequisite node ID")
    target: str = Field(..., description="Dependent node ID")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class GeneratePathRequest(BaseModel):
    """Request body for POST /api/generate-path."""
    known_skills: list[Skill] = Field(default_factory=list, alias="knownSkills")
    target_role: str = Field(..., alias="targetRole", description="Target career role (e.g. 'Senior Full-Stack Engineer')")

    model_config = ConfigDict(populate_by_name=True)


class GeneratePathResponse(BaseModel):
    """Response returned by POST /api/generate-path."""
    nodes: list[SkillNode] = Field(..., description="All DAG skill nodes (completed + missing)")
    edges: list[Edge] = Field(..., description="Prerequisite dependency edges between nodes")
    summary: str = Field(..., description="2-3 sentence overview of the learner's skill gap")
    readiness_percent: int = Field(..., alias="readinessPercent", description="Readiness percentage (0-100)")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


# ---------------------------------------------------------------------------
# Strict LLM output validation schemas (ConfigDict(extra="forbid"))
# ---------------------------------------------------------------------------

class LLMResourceItem(BaseModel):
    title: str = Field(..., description="Name of the course, doc, or project")
    url: str = Field(..., description="Valid URL to the resource")
    type: Literal["course", "doc", "project"] = Field(..., description="Type of resource")

    model_config = ConfigDict(extra="forbid")


class LLMSkillItem(BaseModel):
    name: str = Field(..., description="Canonical skill name")
    alreadyKnown: bool = Field(..., description="True if learner already has this skill per knownSkills")
    category: str = Field(..., description="Category cluster, e.g. 'Frontend', 'Backend', 'DevOps', 'Database'")
    difficulty: Literal["beginner", "intermediate", "advanced"] = Field(..., description="Skill difficulty")
    whyItMatters: str = Field(..., description="Short explanation of why this skill is needed for the target role")
    prerequisites: list[str] = Field(default_factory=list, description="Other skill names in this list required before learning this")
    resources: list[LLMResourceItem] = Field(default_factory=list, description="1-2 suggested resources")

    model_config = ConfigDict(extra="forbid")


class LLMGapAnalysisOutput(BaseModel):
    skills: list[LLMSkillItem] = Field(..., description="Full list of skills required for the role")
    summary: str = Field(..., description="2-3 sentence natural-language summary of the skill gap")

    model_config = ConfigDict(extra="forbid")
