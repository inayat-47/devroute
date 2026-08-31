"""
Resume / pasted-text skill extraction service.

Fallback path when no GitHub username is provided.
Phase 1 uses simple keyword matching against a curated skills list.
(Phase 2+ can optionally upgrade this to an LLM call.)
"""

from __future__ import annotations

import re

from app.schemas.analyze import Skill

# ---------------------------------------------------------------------------
# Known skills list — matched via case-insensitive regex word boundaries.
# Each entry: (display_name, [patterns])
# ---------------------------------------------------------------------------

_SKILL_PATTERNS: list[tuple[str, list[str]]] = [
    # Languages
    ("JavaScript", [r"\bjavascript\b", r"\bjs\b"]),
    ("TypeScript", [r"\btypescript\b", r"\bts\b"]),
    ("Python", [r"\bpython\b"]),
    ("Java", [r"\bjava\b"]),
    ("C++", [r"\bc\+\+\b", r"\bcpp\b"]),
    ("C#", [r"\bc#\b", r"\bcsharp\b"]),
    ("Go", [r"\bgolang\b", r"\bgo\b"]),
    ("Rust", [r"\brust\b"]),
    ("Ruby", [r"\bruby\b"]),
    ("PHP", [r"\bphp\b"]),
    ("Swift", [r"\bswift\b"]),
    ("Kotlin", [r"\bkotlin\b"]),
    ("Dart", [r"\bdart\b"]),
    ("Scala", [r"\bscala\b"]),
    ("R", [r"\br\b"]),
    ("SQL", [r"\bsql\b"]),
    ("HTML", [r"\bhtml\b"]),
    ("CSS", [r"\bcss\b"]),

    # Frontend
    ("React", [r"\breact\b", r"\breactjs\b"]),
    ("React Native", [r"\breact[\s-]?native\b"]),
    ("Next.js", [r"\bnext\.?js\b", r"\bnextjs\b"]),
    ("Vue.js", [r"\bvue\.?js\b", r"\bvuejs\b", r"\bvue\b"]),
    ("Angular", [r"\bangular\b"]),
    ("Svelte", [r"\bsvelte\b"]),
    ("Tailwind CSS", [r"\btailwind\b"]),
    ("Bootstrap", [r"\bbootstrap\b"]),
    ("Redux", [r"\bredux\b"]),
    ("jQuery", [r"\bjquery\b"]),
    ("Webpack", [r"\bwebpack\b"]),
    ("Vite", [r"\bvite\b"]),

    # Backend
    ("Node.js", [r"\bnode\.?js\b", r"\bnodejs\b"]),
    ("Express.js", [r"\bexpress\.?js\b", r"\bexpressjs\b", r"\bexpress\b"]),
    ("FastAPI", [r"\bfastapi\b"]),
    ("Django", [r"\bdjango\b"]),
    ("Flask", [r"\bflask\b"]),
    ("Spring Boot", [r"\bspring[\s-]?boot\b"]),
    ("Spring", [r"\bspring\b"]),
    ("NestJS", [r"\bnest\.?js\b", r"\bnestjs\b"]),
    ("Ruby on Rails", [r"\brails\b", r"\bruby[\s-]?on[\s-]?rails\b"]),
    ("Laravel", [r"\blaravel\b"]),
    ("GraphQL", [r"\bgraphql\b"]),
    ("REST APIs", [r"\brest\s?api\b", r"\brestful\b"]),
    ("gRPC", [r"\bgrpc\b"]),

    # Databases
    ("MongoDB", [r"\bmongodb\b", r"\bmongoose\b"]),
    ("PostgreSQL", [r"\bpostgresql\b", r"\bpostgres\b"]),
    ("MySQL", [r"\bmysql\b"]),
    ("SQLite", [r"\bsqlite\b"]),
    ("Redis", [r"\bredis\b"]),
    ("Firebase", [r"\bfirebase\b"]),
    ("Supabase", [r"\bsupabase\b"]),
    ("Elasticsearch", [r"\belasticsearch\b"]),
    ("DynamoDB", [r"\bdynamodb\b"]),

    # ORMs
    ("Prisma", [r"\bprisma\b"]),
    ("Sequelize", [r"\bsequelize\b"]),
    ("TypeORM", [r"\btypeorm\b"]),
    ("SQLAlchemy", [r"\bsqlalchemy\b"]),

    # DevOps / Cloud
    ("Docker", [r"\bdocker\b"]),
    ("Kubernetes", [r"\bkubernetes\b", r"\bk8s\b"]),
    ("Terraform", [r"\bterraform\b"]),
    ("Ansible", [r"\bansible\b"]),
    ("Jenkins", [r"\bjenkins\b"]),
    ("GitHub Actions", [r"\bgithub[\s-]?actions\b"]),
    ("CI/CD", [r"\bci/?cd\b"]),
    ("AWS", [r"\baws\b", r"\bamazon[\s-]?web[\s-]?services\b"]),
    ("Google Cloud", [r"\bgcp\b", r"\bgoogle[\s-]?cloud\b"]),
    ("Azure", [r"\bazure\b"]),
    ("Linux", [r"\blinux\b"]),
    ("Nginx", [r"\bnginx\b"]),
    ("Vercel", [r"\bvercel\b"]),
    ("Heroku", [r"\bheroku\b"]),

    # Testing
    ("Jest", [r"\bjest\b"]),
    ("Cypress", [r"\bcypress\b"]),
    ("Playwright", [r"\bplaywright\b"]),
    ("Selenium", [r"\bselenium\b"]),
    ("pytest", [r"\bpytest\b"]),

    # AI / ML
    ("TensorFlow", [r"\btensorflow\b"]),
    ("PyTorch", [r"\bpytorch\b"]),
    ("scikit-learn", [r"\bscikit[\s-]?learn\b", r"\bsklearn\b"]),
    ("Keras", [r"\bkeras\b"]),
    ("NumPy", [r"\bnumpy\b"]),
    ("pandas", [r"\bpandas\b"]),
    ("OpenCV", [r"\bopencv\b"]),
    ("Hugging Face", [r"\bhugging[\s-]?face\b"]),
    ("LangChain", [r"\blangchain\b"]),

    # Mobile
    ("Flutter", [r"\bflutter\b"]),
    ("SwiftUI", [r"\bswiftui\b"]),
    ("Jetpack Compose", [r"\bjetpack[\s-]?compose\b"]),

    # Auth
    ("JWT", [r"\bjwt\b"]),
    ("OAuth", [r"\boauth\b"]),

    # Misc
    ("Git", [r"\bgit\b"]),
    ("WebSockets", [r"\bwebsocket\b"]),
    ("Agile", [r"\bagile\b", r"\bscrum\b"]),
    ("Microservices", [r"\bmicroservices?\b"]),
]


def extract_skills_from_text(text: str) -> list[Skill]:
    """
    Scan *text* for known technology keywords and return matching skills.
    Each match gets confidence "medium" (single source — pasted text).
    """
    results: list[Skill] = []
    seen: set[str] = set()

    for display_name, patterns in _SKILL_PATTERNS:
        if display_name in seen:
            continue
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                # Find a short snippet around the match for evidence
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    start = max(0, match.start() - 30)
                    end = min(len(text), match.end() + 30)
                    snippet = text[start:end].replace("\n", " ").strip()
                    evidence = f'mentioned in resume text: "…{snippet}…"'
                else:
                    evidence = "mentioned in resume text"

                results.append(Skill(
                    name=display_name,
                    evidence=evidence,
                    confidence="medium",
                ))
                seen.add(display_name)
                break  # found this skill, move to next

    results.sort(key=lambda s: s.name)
    return results
