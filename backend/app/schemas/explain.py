"""Pydantic schemas for the AI explanation and Q&A endpoints."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ExplainNodeRequest(BaseModel):
    """Request schema for POST /api/explain-node."""
    node_id: str = Field(..., alias="nodeId", description="ID of the clicked node")
    node_context: dict = Field(..., alias="nodeContext", description="Context of the node, containing label, status, etc.")
    target_role: str = Field(..., alias="targetRole", description="Target career role")

    model_config = ConfigDict(populate_by_name=True)


class ExplainNodeResponse(BaseModel):
    """Response schema for POST /api/explain-node."""
    explanation: str = Field(..., description="Tailored natural-language explanation")


class Message(BaseModel):
    """A chat message inside conversation history."""
    role: Literal["user", "assistant"] = Field(..., description="Message sender")
    content: str = Field(..., description="Text content of the message")


class AskRequest(BaseModel):
    """Request schema for POST /api/ask."""
    node_id: str = Field(..., alias="nodeId", description="ID of the skill node")
    question: str = Field(..., description="User's new question")
    conversation_history: list[Message] = Field(
        default_factory=list,
        alias="conversationHistory",
        description="Scoped Q&A conversation history for this node"
    )

    model_config = ConfigDict(populate_by_name=True)


class AskResponse(BaseModel):
    """Response schema for POST /api/ask."""
    answer: str = Field(..., description="Mentorship answer to the follow-up question")
