"""Router for the AI Explanation Assistant endpoints."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.explain import (
    AskRequest,
    AskResponse,
    ExplainNodeRequest,
    ExplainNodeResponse,
)
from app.services.explanation_service import (
    generate_node_explanation,
    generate_scoped_answer,
)
from app.services.groq_client import GroqRateLimitException, GroqServiceException

logger = logging.getLogger("devroute.routers.explain")

router = APIRouter(prefix="/api", tags=["explanation"])


@router.post("/explain-node", response_model=ExplainNodeResponse)
async def explain_node(body: ExplainNodeRequest) -> ExplainNodeResponse:
    """
    Explain in 2-4 sentences why a specific skill matters for a target role
    and why it matches the current learner's completion status.
    """
    try:
        explanation = await generate_node_explanation(
            node_id=body.node_id,
            node_context=body.node_context,
            target_role=body.target_role,
        )
        return ExplainNodeResponse(explanation=explanation)

    except GroqRateLimitException as exc:
        logger.warning(f"Groq rate limit hit in explain-node: {exc}")
        raise HTTPException(
            status_code=429,
            detail="AI provider is busy, please try again shortly.",
        )
    except GroqServiceException as exc:
        logger.error(f"Groq service error in explain-node: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate node explanation: {str(exc)}",
        )
    except Exception as exc:
        logger.error(f"Unexpected error in explain-node: {exc}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal server error occurred while generating explanation.",
        )


@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest) -> AskResponse:
    """
    Ask follow-up questions scoped to a specific skill node.
    """
    try:
        answer = await generate_scoped_answer(
            node_id=body.node_id,
            question=body.question,
            conversation_history=body.conversation_history,
        )
        return AskResponse(answer=answer)

    except GroqRateLimitException as exc:
        logger.warning(f"Groq rate limit hit in ask: {exc}")
        raise HTTPException(
            status_code=429,
            detail="AI provider is busy, please try again shortly.",
        )
    except GroqServiceException as exc:
        logger.error(f"Groq service error in ask: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate answer from AI: {str(exc)}",
        )
    except Exception as exc:
        logger.error(f"Unexpected error in ask: {exc}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal server error occurred while processing your question.",
        )
