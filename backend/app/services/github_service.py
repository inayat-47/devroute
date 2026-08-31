"""
GitHub Data Ingestion Service

Responsible for:
1. Fetching a user's public repos via the GitHub REST API v3
2. Pulling primary language, topics, and manifest files (package.json,
   requirements.txt, pom.xml) from each repo
3. Parsing dependency names from manifest files
4. Aggregating all signals into a normalized Skill[] with evidence + confidence

Uses httpx (async) for non-blocking HTTP calls.
Optionally uses GITHUB_TOKEN from env to raise the rate limit from 60 → 5 000 req/hr.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from typing import Any, Optional

import httpx

from app.schemas.analyze import Skill

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GITHUB_API = "https://api.github.com"
RAW_GITHUB = "https://raw.githubusercontent.com"

# Manifest files we look for in each repo (in priority order)
MANIFEST_FILES = ["package.json", "requirements.txt", "pom.xml"]

# Maximum repos to scan (intentional scope limit: analyzing the 15 most
# recently updated public repos gives high-confidence skill signals while
# keeping response times under ~2-3 seconds)
MAX_REPOS = 15

# Timeout for general GitHub API requests (seconds)
REQUEST_TIMEOUT = 5.0

# Timeout for raw manifest file fetches (seconds) — keeps slow repos from hanging
RAW_FILE_TIMEOUT = 2.5

# Concurrency limit for parallel repo processing
MAX_CONCURRENT_REQUESTS = 15

# ---------------------------------------------------------------------------
# Normalization map — maps raw identifiers to canonical skill names.
# This prevents duplicates like "javascript" vs "JavaScript" vs "JS".
# ---------------------------------------------------------------------------

_NORMALIZE: dict[str, str] = {
    # Languages
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "python": "Python",
    "py": "Python",
    "java": "Java",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "c": "C",
    "ruby": "Ruby",
    "php": "PHP",
    "dart": "Dart",
    "scala": "Scala",
    "r": "R",
    "shell": "Shell/Bash",
    "bash": "Shell/Bash",
    "html": "HTML",
    "css": "CSS",
    "scss": "CSS",
    "sass": "CSS",
    "sql": "SQL",
    "lua": "Lua",
    "perl": "Perl",
    "elixir": "Elixir",
    "haskell": "Haskell",
    "clojure": "Clojure",
    "objective-c": "Objective-C",

    # Frontend frameworks / libraries
    "react": "React",
    "reactjs": "React",
    "react-native": "React Native",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "svelte": "Svelte",
    "sveltekit": "SvelteKit",
    "tailwindcss": "Tailwind CSS",
    "tailwind": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "material-ui": "Material UI",
    "mui": "Material UI",
    "chakra-ui": "Chakra UI",
    "styled-components": "Styled Components",
    "emotion": "Emotion",
    "redux": "Redux",
    "zustand": "Zustand",
    "mobx": "MobX",
    "react-query": "React Query",
    "@tanstack/react-query": "React Query",
    "react-router": "React Router",
    "react-router-dom": "React Router",
    "framer-motion": "Framer Motion",
    "three": "Three.js",
    "threejs": "Three.js",
    "d3": "D3.js",
    "d3.js": "D3.js",
    "jquery": "jQuery",
    "webpack": "Webpack",
    "vite": "Vite",
    "rollup": "Rollup",
    "parcel": "Parcel",
    "babel": "Babel",
    "eslint": "ESLint",
    "prettier": "Prettier",
    "storybook": "Storybook",

    # Backend frameworks
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "spring": "Spring",
    "spring-boot": "Spring Boot",
    "springboot": "Spring Boot",
    "nestjs": "NestJS",
    "nest.js": "NestJS",
    "koa": "Koa",
    "hapi": "Hapi",
    "rails": "Ruby on Rails",
    "ruby-on-rails": "Ruby on Rails",
    "laravel": "Laravel",
    "gin": "Gin",
    "fiber": "Fiber",
    "actix": "Actix",
    "rocket": "Rocket",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "grpc": "gRPC",

    # Databases
    "mongodb": "MongoDB",
    "mongoose": "MongoDB",
    "pymongo": "MongoDB",
    "motor": "MongoDB",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "pg": "PostgreSQL",
    "psycopg2": "PostgreSQL",
    "mysql": "MySQL",
    "mysql2": "MySQL",
    "sqlite": "SQLite",
    "sqlite3": "SQLite",
    "redis": "Redis",
    "ioredis": "Redis",
    "elasticsearch": "Elasticsearch",
    "dynamodb": "DynamoDB",
    "firebase": "Firebase",
    "firestore": "Firebase",
    "supabase": "Supabase",
    "prisma": "Prisma",
    "@prisma/client": "Prisma",
    "sequelize": "Sequelize",
    "typeorm": "TypeORM",
    "sqlalchemy": "SQLAlchemy",
    "drizzle-orm": "Drizzle ORM",
    "knex": "Knex.js",

    # DevOps / Infra
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "jenkins": "Jenkins",
    "github-actions": "GitHub Actions",
    "ci-cd": "CI/CD",
    "ci/cd": "CI/CD",
    "nginx": "Nginx",
    "aws": "AWS",
    "gcp": "Google Cloud",
    "azure": "Azure",
    "heroku": "Heroku",
    "vercel": "Vercel",
    "netlify": "Netlify",
    "linux": "Linux",

    # Testing
    "jest": "Jest",
    "mocha": "Mocha",
    "chai": "Chai",
    "cypress": "Cypress",
    "playwright": "Playwright",
    "selenium": "Selenium",
    "pytest": "pytest",
    "unittest": "unittest",
    "vitest": "Vitest",
    "testing-library": "Testing Library",
    "@testing-library/react": "Testing Library",

    # AI / ML
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "torch": "PyTorch",
    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "keras": "Keras",
    "numpy": "NumPy",
    "pandas": "pandas",
    "matplotlib": "Matplotlib",
    "scipy": "SciPy",
    "opencv": "OpenCV",
    "cv2": "OpenCV",
    "huggingface": "Hugging Face",
    "transformers": "Hugging Face",
    "langchain": "LangChain",
    "openai": "OpenAI API",

    # Mobile
    "flutter": "Flutter",
    "swiftui": "SwiftUI",
    "jetpack-compose": "Jetpack Compose",
    "expo": "Expo",
    "ionic": "Ionic",

    # Auth / Security
    "jwt": "JWT",
    "jsonwebtoken": "JWT",
    "passport": "Passport.js",
    "oauth": "OAuth",
    "auth0": "Auth0",
    "bcrypt": "bcrypt",
    "helmet": "Helmet",

    # Misc tools
    "git": "Git",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "npm": "npm",
    "yarn": "Yarn",
    "pnpm": "pnpm",
    "socket.io": "Socket.IO",
    "websocket": "WebSockets",
    "websockets": "WebSockets",
    "celery": "Celery",
    "rabbitmq": "RabbitMQ",
    "kafka": "Kafka",
    "stripe": "Stripe",
    "twilio": "Twilio",
    "sendgrid": "SendGrid",
    "axios": "Axios",
    "httpx": "httpx",
    "requests": "Requests",
    "pydantic": "Pydantic",
    "uvicorn": "Uvicorn",
    "gunicorn": "Gunicorn",
    "reactflow": "React Flow",
    "@xyflow/react": "React Flow",
}


def _normalize_skill(raw: str) -> str:
    """Return canonical skill name, or title-cased raw input if unknown."""
    key = raw.strip().lower()
    return _NORMALIZE.get(key, raw.strip().title())


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

def _build_headers() -> dict[str, str]:
    """Build request headers, including auth token if available."""
    headers: dict[str, str] = {
        "Accept": "application/vnd.github.mercy-preview+json",  # topics preview
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN", "").split("#")[0].strip()
    if token and token.startswith(("ghp_", "gho_", "github_pat_")):
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def fetch_user_repos(
    client: httpx.AsyncClient,
    username: str,
) -> list[dict[str, Any]]:
    """
    Fetch the most recently updated public repos for *username* up to MAX_REPOS.
    Scope is intentionally capped to MAX_REPOS (~15-20) sorted by updated_at descending
    for fast analysis and high-confidence, up-to-date skill extraction.

    Raises:
        httpx.HTTPStatusError  — caller should handle 404 / 403 / 429
        httpx.TimeoutException — timeout handling
    """
    resp = await client.get(
        f"{GITHUB_API}/users/{username}/repos",
        params={
            "per_page": MAX_REPOS,
            "page": 1,
            "sort": "updated",
            "direction": "desc",
            "type": "owner",  # skip forks by default
        },
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    repos = resp.json()
    return repos[:MAX_REPOS]


async def fetch_raw_file(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    path: str,
    branch: str = "main",
) -> Optional[str]:
    """
    Fetch a single file's raw content from a repo with a strict per-request timeout.
    Returns None if the file doesn't exist (404), times out, or any error occurs.
    """
    url = f"{RAW_GITHUB}/{owner}/{repo}/{branch}/{path}"
    try:
        resp = await client.get(url, timeout=RAW_FILE_TIMEOUT)
        if resp.status_code == 200:
            return resp.text
    except (httpx.HTTPError, httpx.TimeoutException, Exception):
        pass

    return None


# ---------------------------------------------------------------------------
# Manifest parsers
# ---------------------------------------------------------------------------

def parse_package_json(content: str) -> list[str]:
    """Extract dependency names from a package.json file."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []

    deps: list[str] = []
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        section = data.get(key)
        if isinstance(section, dict):
            deps.extend(section.keys())
    return deps


def parse_requirements_txt(content: str) -> list[str]:
    """Extract package names from a Python requirements.txt."""
    deps: list[str] = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        # Handle lines like: package==1.0, package>=2.0, package[extra]
        name = re.split(r"[>=<!;\[\]]", line)[0].strip()
        if name:
            deps.append(name)
    return deps


def parse_pom_xml(content: str) -> list[str]:
    """Extract artifactId names from a Maven pom.xml."""
    deps: list[str] = []
    try:
        root = ET.fromstring(content)
        # Maven namespace
        ns = {"m": "http://maven.apache.org/POM/4.0.0"}
        for dep in root.findall(".//m:dependency", ns):
            artifact_id = dep.find("m:artifactId", ns)
            if artifact_id is not None and artifact_id.text:
                deps.append(artifact_id.text)
        # Fallback: no namespace
        if not deps:
            for dep in root.findall(".//dependency"):
                artifact_id = dep.find("artifactId")
                if artifact_id is not None and artifact_id.text:
                    deps.append(artifact_id.text)
    except ET.ParseError:
        pass
    return deps


_PARSERS = {
    "package.json": parse_package_json,
    "requirements.txt": parse_requirements_txt,
    "pom.xml": parse_pom_xml,
}


# ---------------------------------------------------------------------------
# Skill aggregation engine
# ---------------------------------------------------------------------------

class _SkillAccumulator:
    """
    Tracks how many independent signals confirm each skill.

    Signal types:
        - "language"    — repo's primary language field
        - "topic"       — repo topic tag
        - "dependency"  — found in a manifest file
        - "repo_name"   — repo name itself matches a known skill

    Confidence mapping:
        3+ signals → high
        2  signals → medium
        1  signal  → low
    """

    def __init__(self) -> None:
        # skill_name → set of (signal_type, repo_name) tuples
        self._signals: dict[str, set[tuple[str, str]]] = defaultdict(set)

    def add(self, raw_skill: str, signal_type: str, repo_name: str) -> None:
        canonical = _normalize_skill(raw_skill)
        if not canonical:
            return
        self._signals[canonical].add((signal_type, repo_name))

    def to_skills(self) -> list[Skill]:
        """Convert accumulated signals into a sorted Skill[] list."""
        results: list[Skill] = []
        for name, signals in sorted(self._signals.items()):
            signal_types = {s[0] for s in signals}
            repo_names = sorted({s[1] for s in signals})

            # Build evidence string
            parts: list[str] = []
            for stype in ("language", "topic", "dependency", "repo_name"):
                repos_for_type = sorted({s[1] for s in signals if s[0] == stype})
                if repos_for_type:
                    label = {
                        "language": "primary language in",
                        "topic": "topic tag on",
                        "dependency": "dependency in",
                        "repo_name": "repo name matches",
                    }[stype]
                    parts.append(f"{label} {', '.join(repos_for_type)}")
            evidence = "; ".join(parts)

            # Confidence based on number of distinct signal types
            n_types = len(signal_types)
            if n_types >= 3:
                confidence = "high"
            elif n_types >= 2:
                confidence = "medium"
            else:
                confidence = "low"

            results.append(Skill(
                name=name,
                evidence=evidence,
                confidence=confidence,
            ))

        # Sort: high confidence first, then medium, then low; alphabetical within
        order = {"high": 0, "medium": 1, "low": 2}
        results.sort(key=lambda s: (order[s.confidence], s.name))
        return results


# ---------------------------------------------------------------------------
# Per-repo worker
# ---------------------------------------------------------------------------

async def _process_repo(
    client: httpx.AsyncClient,
    repo: dict[str, Any],
    fallback_username: str,
    acc: _SkillAccumulator,
    semaphore: asyncio.Semaphore,
) -> None:
    """
    Extract signals for a single repo, including concurrent manifest fetching.
    """
    repo_name: str = repo.get("name", "")
    default_branch: str = repo.get("default_branch", "main")
    owner: str = repo.get("owner", {}).get("login", fallback_username)

    # Signal 1: primary language
    lang = repo.get("language")
    if lang:
        acc.add(lang, "language", repo_name)

    # Signal 2: topics
    for topic in repo.get("topics", []):
        acc.add(topic, "topic", repo_name)

    # Signal 3: repo name itself (e.g. "react-todo-app" → React)
    name_lower = repo_name.lower().replace("_", "-")
    for token in re.split(r"[-\s]", name_lower):
        if token in _NORMALIZE:
            acc.add(token, "repo_name", repo_name)

    # Signal 4: manifest file dependencies
    # Order manifests based on primary language heuristic to avoid unnecessary 404s
    manifest_order = list(MANIFEST_FILES)
    if lang:
        lang_lower = lang.lower()
        if lang_lower in ("python",):
            manifest_order = ["requirements.txt", "package.json", "pom.xml"]
        elif lang_lower in ("java", "kotlin", "scala"):
            manifest_order = ["pom.xml", "package.json", "requirements.txt"]
        elif lang_lower in ("javascript", "typescript"):
            manifest_order = ["package.json", "requirements.txt", "pom.xml"]

    async with semaphore:
        for manifest in manifest_order:
            content = await fetch_raw_file(
                client, owner, repo_name, manifest, default_branch,
            )
            if content is not None:
                parser = _PARSERS[manifest]
                try:
                    dep_names = parser(content)
                    for dep in dep_names:
                        acc.add(dep, "dependency", repo_name)
                except Exception:
                    pass
                break  # only parse the first manifest found per repo


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_github_profile(username: str) -> tuple[list[Skill], int]:
    """
    Full pipeline: fetch repos → parse manifests concurrently → aggregate skills.

    Returns (skills, repos_analyzed).

    Raises:
        httpx.HTTPStatusError — 404 for bad username, 403 for rate-limit
        httpx.TimeoutException — on GitHub API request timeout
    """
    acc = _SkillAccumulator()

    async with httpx.AsyncClient(
        headers=_build_headers(),
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    ) as client:
        repos = await fetch_user_repos(client, username)

        if not repos:
            return [], 0

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        tasks = [
            _process_repo(client, repo, username, acc, semaphore)
            for repo in repos
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    return acc.to_skills(), len(repos)

