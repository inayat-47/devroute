"""Shared Groq client wrapper and helpers for DevRoute AI features."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

from dotenv import load_dotenv
from groq import AsyncGroq, RateLimitError, APIError

load_dotenv()

logger = logging.getLogger("devroute.groq")
logging.basicConfig(level=logging.INFO)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Default models
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_MODEL_FAST = os.getenv("GROQ_MODEL_FAST", "openai/gpt-oss-20b")


class GroqRateLimitException(Exception):
    """Raised when Groq API rate limit is exceeded."""
    pass


class GroqServiceException(Exception):
    """Raised when Groq API encounters a general error."""
    pass


def get_groq_client() -> AsyncGroq:
    """Instantiate and return an AsyncGroq client."""
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment or .env file.")
    return AsyncGroq(api_key=api_key, max_retries=1)


async def call_groq_json(
    prompt: str,
    system_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    """
    Call Groq with JSON object response format enforcement.
    Returns the raw response string (guaranteed to be syntactically valid JSON).
    """
    selected_model = model or GROQ_MODEL
    print(f"[Groq Call] Using model: {selected_model}")
    logger.info(f"Calling Groq with model: {selected_model}")

    client = get_groq_client()

    try:
        response = await client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=max_tokens,
        )

        content = response.choices[0].message.content or "{}"
        return content

    except RateLimitError as exc:
        logger.warning(f"Groq rate limit encountered: {exc}")
        raise GroqRateLimitException("AI provider is busy, please try again shortly.") from exc
    except APIError as exc:
        if exc.status_code in (429, 413) or "rate_limit" in str(exc).lower():
            raise GroqRateLimitException("AI provider is busy, please try again shortly.") from exc
        logger.error(f"Groq API error: {exc}")
        raise GroqServiceException(f"Groq API error: {exc.message}") from exc
    except Exception as exc:
        logger.error(f"Unexpected error communicating with Groq: {exc}")
        raise GroqServiceException(f"AI service error: {str(exc)}") from exc


async def call_groq_text(
    messages: list[dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.4,
    max_tokens: int = 2048,
) -> str:
    """
    Call Groq for a plain text completion.
    Accepts a list of message objects: [{"role": "system", "content": "..."}, ...]
    """
    selected_model = model or GROQ_MODEL_FAST
    print(f"[Groq Call] Using model: {selected_model}")
    logger.info(f"Calling Groq text completion with model: {selected_model}")

    client = get_groq_client()

    try:
        response = await client.chat.completions.create(
            model=selected_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except RateLimitError as exc:
        logger.warning(f"Groq rate limit encountered: {exc}")
        raise GroqRateLimitException("AI provider is busy, please try again shortly.") from exc
    except APIError as exc:
        if exc.status_code in (429, 413) or "rate_limit" in str(exc).lower():
            raise GroqRateLimitException("AI provider is busy, please try again shortly.") from exc
        logger.error(f"Groq API error: {exc}")
        raise GroqServiceException(f"Groq API error: {exc.message}") from exc
    except Exception as exc:
        logger.error(f"Unexpected error communicating with Groq: {exc}")
        raise GroqServiceException(f"AI service error: {str(exc)}") from exc

