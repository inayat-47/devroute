"""AI Explanation and Q&A Assistant service."""

from __future__ import annotations

import logging
from typing import Optional

from app.schemas.explain import Message
from app.services.groq_client import (
    GROQ_MODEL_FAST,
    call_groq_text,
)

logger = logging.getLogger("devroute.explanation")


def _get_skill_name_from_id(node_id: str) -> str:
    """Helper to extract a friendly skill name from node slug."""
    clean = node_id.replace("node-", "")
    clean = clean.replace("-", " ")
    return clean.title()


async def generate_node_explanation(
    node_id: str,
    node_context: dict,
    target_role: str,
) -> str:
    """
    Generate a tailored 2-4 sentence explanation for a skill node.
    Uses GROQ_MODEL_FAST for instant speed.
    """
    label = node_context.get("label") or _get_skill_name_from_id(node_id)
    status = node_context.get("status") or "missing"
    category = node_context.get("category") or "General"
    difficulty = node_context.get("difficulty") or "intermediate"

    # Human-friendly status translation
    status_desc = "Mastered / Already Known"
    if status == "missing":
        status_desc = "a Gap / Needs to be Learned"
    elif status == "in-progress":
        status_desc = "Currently In Progress"

    system_prompt = (
        "You are an expert engineering mentor and career coach. Your task is to provide direct, "
        "highly specific advice without introductory boilerplate or generic filler."
    )

    user_prompt = (
        f"In exactly 2 to 4 sentences, explain why the skill '{label}' (category: '{category}', "
        f"difficulty: '{difficulty}') is critical for someone targeting the role of '{target_role}', "
        f"and why it is currently marked as '{status_desc}' in their profile. "
        f"Make the response extremely specific to how '{label}' relates to '{target_role}', and avoid "
        f"any generic career platitudes."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    explanation = await call_groq_text(
        messages=messages,
        model=GROQ_MODEL_FAST,
        temperature=0.3,
        max_tokens=500,
    )
    return explanation.strip()


async def generate_scoped_answer(
    node_id: str,
    question: str,
    conversation_history: list[Message],
) -> str:
    """
    Generate a mentorship answer strictly scoped to the skill node.
    Uses GROQ_MODEL_FAST.
    """
    skill_name = _get_skill_name_from_id(node_id)

    system_prompt = (
        f"You are a friendly, expert engineering mentor. You are helping a student with the skill '{skill_name}'. "
        f"Your conversation is strictly scoped to '{skill_name}'. "
        f"Answer the student's question clearly and concisely (in 2-4 sentences if possible). "
        f"Do not talk about unrelated topics. If the student asks about something outside of '{skill_name}', "
        f"politely guide them back to learning '{skill_name}'."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history:
        messages.append({"role": msg.role, "content": msg.content})

    # Add the latest user question
    messages.append({"role": "user", "content": question})

    answer = await call_groq_text(
        messages=messages,
        model=GROQ_MODEL_FAST,
        temperature=0.4,
        max_tokens=800,
    )
    return answer.strip()
