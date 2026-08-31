"""LLM Skill-Gap Analysis Engine.

Orchestrates prompt construction, Groq LLM invocation with strict Pydantic validation
and single-retry recovery, DAG prerequisite resolution, and readiness score calculation.
"""

from __future__ import annotations

import json
import logging
import math
import re
from typing import Optional

from pydantic import ValidationError

from app.schemas.analyze import Skill
from app.schemas.generate_path import (
    Edge,
    GeneratePathResponse,
    LLMGapAnalysisOutput,
    Resource,
    SkillNode,
)
from app.services.groq_client import (
    GROQ_MODEL,
    GroqRateLimitException,
    GroqServiceException,
    call_groq_json,
)

logger = logging.getLogger("devroute.gap_analysis")


# ---------------------------------------------------------------------------
# Prompt Templates
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert technical curriculum designer and senior engineering career mentor.
Your task is to analyze a learner's target role and their existing verified skills, then generate a comprehensive, structured skill-gap curriculum and dependency DAG.

CRITICAL RULES:
1. Output MUST be valid JSON adhering strictly to the required schema.
2. Do NOT output markdown code blocks (no ```json ... ```), preamble, commentary, or text outside the JSON object.
3. Every skill item must strictly contain ONLY these fields:
   - "name": string (canonical skill name, e.g. "Docker", "PostgreSQL", "React")
   - "alreadyKnown": boolean (true if the learner already has this skill based on their verified knownSkills list, false if it is a gap)
   - "category": string (e.g. "Frontend", "Backend", "DevOps", "Database", "Architecture", "Testing", "Security")
   - "difficulty": string (one of: "beginner", "intermediate", "advanced")
   - "whyItMatters": string (1-2 sentences on why this skill is required for the target role)
   - "prerequisites": array of strings (exact names of foundational skills from this same list that must be learned BEFORE this skill. E.g. "Docker" is a prerequisite for "Kubernetes")
   - "resources": array of 1-2 objects, each having "title" (string), "url" (valid documentation, course, or tutorial URL), and "type" (one of "course", "doc", "project")
4. Include a top-level "summary" field (2-3 sentences explaining the overall readiness, key gaps, and recommended first steps).
5. Ensure prerequisite dependencies make logical sense: foundational concepts (e.g. Git, Linux, Docker, Python/JS, SQL) must come before advanced tools/architectures (e.g. CI/CD, Kubernetes, Microservices, Next.js).
"""


def build_gap_analysis_prompt(target_role: str, known_skills: list[Skill]) -> str:
    """Build the user prompt for the skill-gap analysis LLM call."""
    if known_skills:
        # Prioritize top skills by confidence and format compactly
        order = {"high": 0, "medium": 1, "low": 2}
        sorted_skills = sorted(known_skills, key=lambda s: order.get(s.confidence, 3))
        
        # Primary verified skills (top 30)
        primary_skills = sorted_skills[:30]
        skill_lines = []
        for s in primary_skills:
            ev = f" - {s.evidence[:50]}" if s.evidence else ""
            skill_lines.append(f"- {s.name} [{s.confidence} confidence{ev}]")
        
        # Additional summary of remaining skills if profile is large
        if len(sorted_skills) > 30:
            extra_names = [s.name for s in sorted_skills[30:70]]
            skill_lines.append(f"- Also familiar with: {', '.join(extra_names)}")

        skills_formatted = "\n".join(skill_lines)
    else:
        skills_formatted = "None provided (beginner / fresh profile)"

    return f"""Analyze the skill gap for the following learner:

TARGET ROLE:
{target_role}

KNOWN / VERIFIED SKILLS ALREADY POSSESSED BY LEARNER:
{skills_formatted}

INSTRUCTIONS:
1. Identify 12 to 18 essential skills required to succeed in the role "{target_role}", ranging from foundational to advanced.
2. For each skill, evaluate whether the learner already knows it based on their KNOWN / VERIFIED SKILLS list above.
   - If the skill matches or is demonstrated by their known skills, set "alreadyKnown": true.
   - If the learner lacks this skill or needs to acquire it, set "alreadyKnown": false.
3. Formulate clear prerequisite relationships using the exact "name" of other skills in your output list.
4. Provide high-quality official documentation or well-known learning resources for each skill.
5. Provide a 2-3 sentence executive "summary" of their gap and readiness.

REQUIRED JSON SCHEMA:
{{
  "skills": [
    {{
      "name": "Docker",
      "alreadyKnown": false,
      "category": "DevOps",
      "difficulty": "intermediate",
      "whyItMatters": "Containerization is standard for packaging microservices and ensuring reproducible deployments in modern engineering teams.",
      "prerequisites": ["Linux Fundamentals"],
      "resources": [
        {{
          "title": "Docker Official Getting Started Guide",
          "url": "https://docs.docker.com/get-started/",
          "type": "doc"
        }}
      ]
    }}
  ],
  "summary": "You have a solid foundation in core development but need to strengthen your containerization and cloud orchestration skills to meet Senior requirements."
}}
"""


# ---------------------------------------------------------------------------
# ID Normalization & DAG Transformation
# ---------------------------------------------------------------------------

def _slugify(name: str) -> str:
    """Create a URL-safe node ID from a skill name."""
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return f"node-{clean}" if clean else "node-skill"


def transform_llm_output_to_graph(output: LLMGapAnalysisOutput) -> GeneratePathResponse:
    """
    Transform validated LLM output into SkillNode[] and Edge[] DAG.
    Validates prerequisite references, drops unresolvable dependencies with a warning,
    and computes overall readiness percentage.
    """
    # 1. Build lookup tables for name -> id and name -> node
    name_to_id: dict[str, str] = {}
    nodes_dict: dict[str, SkillNode] = {}

    for item in output.skills:
        node_id = _slugify(item.name)
        # Ensure unique IDs in case of duplicate naming
        base_id = node_id
        counter = 1
        while node_id in nodes_dict:
            node_id = f"{base_id}-{counter}"
            counter += 1

        name_to_id[item.name.strip().lower()] = node_id

        # Convert resources
        resources = [
            Resource(title=r.title, url=r.url, type=r.type)
            for r in item.resources
        ]

        node = SkillNode(
            id=node_id,
            label=item.name.strip(),
            category=item.category.strip(),
            status="completed" if item.alreadyKnown else "missing",
            difficulty=item.difficulty,
            why_it_matters=item.whyItMatters.strip(),
            prerequisites=[],  # Will be populated with resolved node IDs below
            resources=resources,
        )
        nodes_dict[node_id] = node

    # 2. Resolve prerequisites and construct edges
    edges: list[Edge] = []
    seen_edges: set[tuple[str, str]] = set()

    for item in output.skills:
        current_id = name_to_id.get(item.name.strip().lower())
        if not current_id:
            continue

        resolved_prereqs: list[str] = []
        for prereq_name in item.prerequisites:
            prereq_key = prereq_name.strip().lower()
            prereq_id = name_to_id.get(prereq_key)

            if prereq_id and prereq_id != current_id:
                resolved_prereqs.append(prereq_id)
                edge_pair = (prereq_id, current_id)
                if edge_pair not in seen_edges:
                    seen_edges.add(edge_pair)
                    edges.append(
                        Edge(
                            id=f"e-{prereq_id}-{current_id}",
                            source=prereq_id,
                            target=current_id,
                        )
                    )
            else:
                logger.warning(
                    f"Prerequisite '{prereq_name}' for skill '{item.name}' "
                    f"could not be resolved to any node in the skill list. Dropping dependency."
                )

        nodes_dict[current_id].prerequisites = resolved_prereqs

    nodes = list(nodes_dict.values())

    # 3. Compute readiness percentage (standard mathematical round-half-up)
    total_nodes = len(nodes)
    completed_nodes = sum(1 for n in nodes if n.status == "completed")
    readiness_percent = (
        int(math.floor(((completed_nodes / total_nodes) * 100) + 0.5))
        if total_nodes > 0
        else 0
    )

    return GeneratePathResponse(
        nodes=nodes,
        edges=edges,
        summary=output.summary.strip(),
        readiness_percent=readiness_percent,
    )


# ---------------------------------------------------------------------------
# Core Service Logic: LLM Call with Single Retry
# ---------------------------------------------------------------------------

async def generate_skill_gap_path(
    target_role: str,
    known_skills: list[Skill],
    model: Optional[str] = None,
) -> GeneratePathResponse:
    """
    Generate a full skill-gap learning path for target_role given known_skills.

    Flow:
    1. Construct prompt using GROQ_MODEL.
    2. Invoke Groq in JSON mode.
    3. Validate with strict Pydantic schema (extra='forbid').
    4. If validation fails, retry once with the error details.
    5. Transform validated data into final response with nodes, edges, readinessPercent.
    """
    selected_model = model or GROQ_MODEL
    user_prompt = build_gap_analysis_prompt(target_role, known_skills)

    # Attempt 1
    raw_response = ""
    try:
        raw_response = await call_groq_json(
            prompt=user_prompt,
            system_prompt=SYSTEM_PROMPT,
            model=selected_model,
            temperature=0.2,
        )
        parsed_output = LLMGapAnalysisOutput.model_validate_json(raw_response)
        return transform_llm_output_to_graph(parsed_output)

    except (ValidationError, json.JSONDecodeError) as first_err:
        logger.warning(
            f"First LLM gap analysis attempt failed validation: {first_err}. "
            "Retrying once with corrective prompt..."
        )

        # Attempt 2: Corrective retry
        retry_prompt = (
            f"{user_prompt}\n\n"
            f"IMPORTANT: Your previous output failed schema validation with error:\n"
            f"{str(first_err)}\n\n"
            f"Fix all issues and output strictly valid JSON matching the schema with NO extra fields."
        )

        try:
            raw_response = await call_groq_json(
                prompt=retry_prompt,
                system_prompt=SYSTEM_PROMPT,
                model=selected_model,
                temperature=0.1,
            )
            parsed_output = LLMGapAnalysisOutput.model_validate_json(raw_response)
            return transform_llm_output_to_graph(parsed_output)
        except ValidationError as second_err:
            logger.error(f"Second LLM gap analysis attempt failed schema validation: {second_err}")
            raise ValueError(f"AI response failed schema validation: {second_err}") from second_err
        except json.JSONDecodeError as json_err:
            logger.error(f"Second LLM gap analysis attempt returned invalid JSON: {json_err}")
            raise ValueError(f"AI response was not valid JSON: {json_err}") from json_err
