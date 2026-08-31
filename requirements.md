# DevRoute — Requirements Document
### AI-Powered Personalized Learning Path Recommender (GitHub-to-Skill-Gap Concept)

## 1. Project Overview

DevRoute takes a learner's **target role** (e.g. "Senior Full-Stack Engineer") and an optional **GitHub username** (or pasted resume/LinkedIn text), automatically infers what skills the learner already has by analyzing their public repos, computes the gap to the target role using an LLM, and renders an **interactive dependency graph** showing what's done (green), in-progress (yellow), and missing (red) — with a learning path and explanations attached to every node.

No 20-question onboarding form. The GitHub profile *is* the profiling engine.

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + TailwindCSS | Fast dev loop, matches existing MERN skillset |
| Graph Visualization | React Flow | Purpose-built for node/edge dependency graphs, drag/zoom/pan out of the box |
| State/Data fetching | React Query (TanStack) + Axios | Caching, loading/error states without boilerplate |
| Backend | Python + FastAPI | Async, auto-generated API docs (Swagger/OpenAPI), first-class fit for LLM/AI-heavy backends |
| Backend Server | Uvicorn (ASGI) | Standard FastAPI dev/production server |
| HTTP Client (backend→GitHub) | httpx (async) | Non-blocking calls to GitHub API and raw file fetches |
| External Data Source | GitHub REST API v3 (unauthenticated) | 60 req/hr/IP is enough for a demo; no OAuth needed |
| AI/LLM | Anthropic Claude API via `anthropic` Python SDK (or OpenAI, swappable) | Structured JSON output for skill extraction, gap analysis, explanations |
| Validation | Pydantic (built into FastAPI) | Enforce LLM JSON output + request/response schemas before sending to frontend |
| Env/config | python-dotenv | Load `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, etc. from `.env` |
| DB (optional/stretch) | MongoDB Atlas via `pymongo` / `motor` (async) | Cache GitHub fetch + generated paths so repeat calls are instant |
| Deployment | Vercel (frontend) + Render (backend, Python web service) | Matches existing deployment experience; Render supports Python natively |

## 3. Functional Requirements

Mapped directly to the assignment's "what to build" list:

1. **Conversational Interface**
   - Single input: target role (free text, e.g. "Senior Full-Stack Engineer")
   - Optional: GitHub username field
   - Optional fallback: paste resume/LinkedIn text (if no GitHub, or private profile)

2. **Learner Profiling Engine**
   - Fetch public repos via GitHub API: languages, topics, README snippets, `package.json` / `requirements.txt` / `pom.xml` dependency names
   - Aggregate into a `knownSkills[]` list with confidence/evidence (e.g. "React — inferred from 4 repos using react + tailwind")

3. **Recommendation Engine**
   - LLM call: `knownSkills[] + targetRole` → structured skill-gap JSON
   - Each gap skill includes: category, difficulty, why it matters, 1-2 suggested resources (course/doc/project)

4. **Personalized Learning Path Generator**
   - Transform LLM output into a **DAG** (nodes = skills, edges = prerequisites)
   - Node status: `completed` | `in-progress` | `missing`
   - Topological layout so prerequisites visually sit before dependents

5. **AI Explanation Assistant**
   - Click any node → panel shows: why this skill matters for the target role, why it was marked done/missing, and a short Q&A chat scoped to that node

6. **Dashboard**
   - Overall readiness % (completed nodes / total nodes)
   - Milestone list (grouped skill clusters, e.g. "Containerization", "Caching")
   - "Next 3 recommended actions" widget

## 4. Non-Functional Requirements

- GitHub fetch + parse should resolve in under ~3 seconds for a typical profile (10-30 repos)
- Must handle gracefully: private/empty GitHub profiles, GitHub API rate-limit errors, malformed LLM JSON (retry once, then fallback message)
- LLM responses must be schema-validated (Pydantic) before being trusted by the frontend — never render raw unvalidated JSON into the graph
- Responsive layout (demo will likely run on a laptop screen — projector-safe font sizes/contrast for judging)
- No auth/login required for MVP — public data only

## 5. API Contracts

```
POST /api/analyze
  body: { githubUsername?: string, targetRole: string, resumeText?: string }
  returns: { knownSkills: Skill[], reposAnalyzed: number, sourceUsed: "github" | "resume" }

POST /api/generate-path
  body: { knownSkills: Skill[], targetRole: string }
  returns: { nodes: SkillNode[], edges: Edge[], summary: string, readinessPercent: number }

POST /api/explain-node
  body: { nodeId: string, nodeContext: object, targetRole: string }
  returns: { explanation: string }

POST /api/ask
  body: { nodeId: string, question: string, conversationHistory: Message[] }
  returns: { answer: string }
```

## 6. Data Models

```ts
type Skill = {
  name: string;
  evidence?: string;        // e.g. "found in 4 repos: repo-a, repo-b..."
  confidence: "high" | "medium" | "low";
};

type SkillNode = {
  id: string;
  label: string;
  category: string;          // e.g. "Frontend", "DevOps", "Backend"
  status: "completed" | "in-progress" | "missing";
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];   // node ids
  resources: { title: string; url: string; type: "course" | "doc" | "project" }[];
};

type Edge = { source: string; target: string };
```

## 7. MVP Scope vs Stretch Goals

**MVP (must work for demo):**
- Manual target role + GitHub username input
- GitHub fetch → skill inference → LLM gap analysis → graph render
- Color-coded interactive graph (React Flow)
- Click-node explanation panel
- Basic readiness % dashboard

**Stretch (only if time remains):**
- Resume/LinkedIn text parsing as an alternate profiling input
- MongoDB caching of past analyses (instant re-load for same username)
- Progress tracking across sessions (mark nodes as "started learning")
- Multi-turn chat assistant across the whole graph (not just per-node)
- Export path as PDF/shareable link
