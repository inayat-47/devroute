# DevRoute — Build Progress

> **Purpose:** Single source of truth for cross-session resumability.
> On any new session, read `requirements.md` → `workflow.md` → this file, then resume from the next incomplete phase.

## Phase Status

| Phase | Name | Status | Date Completed |
|-------|------|--------|----------------|
| 0 | Project Scaffolding | ✅ DONE | 2026-08-30 |
| 1 | GitHub Data Ingestion Service | ✅ DONE | 2026-08-30 |
| 2 | LLM Skill-Gap Analysis Engine | ✅ DONE | 2026-08-30 |
| 3 | Frontend: Conversational Input UI | ✅ DONE | 2026-08-30 |
| 4 | Frontend: Interactive Dependency Graph | ✅ DONE | 2026-08-31 |
| 5 | AI Explanation Assistant | ✅ DONE | 2026-08-31 |
| 6 | Dashboard | ✅ DONE | 2026-08-31 |
| 7 | Polish + Deploy | ⬜ NOT STARTED | — |

## Phase 0 Notes
- Frontend: React (Vite) + TailwindCSS v4, folder structure created (`components/`, `pages/`, `hooks/`, `api/`)
- Backend: FastAPI with CORS, health check at `GET /api/health`, folder structure (`routers/`, `services/`, `schemas/`)
- Axios client configured with Vite dev proxy to backend
- `.env.example` files on both sides
- Root `README.md` with run instructions
- `requirements.txt` with all core Python deps

## Phase 1 Notes
- `POST /api/analyze` implemented and verified
- GitHub REST API ingestion with concurrent manifest fetching (`asyncio.gather` + `asyncio.Semaphore`)
- Intentional scope limit: capped to the 15 most recently updated public repos for high-confidence signals and sub-3s response times
- Manifest parsers: `package.json`, `requirements.txt`, `pom.xml`
- Canonical skill normalization map + multi-signal confidence scoring (`high`/`medium`/`low`)
- Resume/pasted-text keyword extraction fallback
- Error handling for 404 (user not found), 429 (rate limit), 422 (invalid/missing input)

## Phase 2 Notes
- `POST /api/generate-path` implemented and verified end-to-end
- Groq client wrapper (`app/services/groq_client.py`) using `openai/gpt-oss-120b` for heavy reasoning
- Single LLM call returns structured skill list + natural-language gap summary
- Strict Pydantic output schema validation (`ConfigDict(extra="forbid")`) with single-retry error feedback loop
- Prerequisite DAG resolution into `SkillNode[]` and `Edge[]` with unresolvable dependency dropping/logging
- `readinessPercent` calculation with standard mathematical round-half-up
- Error handling with distinct 429 (rate limit) and 502 (AI validation failure)

## Phase 3 Notes
- `src/api/types.ts` TypeScript types matching backend Pydantic models
- `src/api/devroute.ts` Axios client with Vite dev proxy integration
- `src/hooks/useGenerateGraph.ts` React Query mutation chaining `/api/analyze` and `/api/generate-path`
- Multi-stage loading indicators ("Analyzing GitHub profile..." -> "Generating learning path...")
- Distinct error state handling: 404 inline GitHub error, 429 GitHub rate limit banner, 429 AI busy banner, general retry alerts
- `src/pages/LandingPage.tsx` conversational landing UI with role quick-picks, collapsible resume toggle, and submit validation
- `src/pages/GraphPage.tsx` placeholder preview displaying readiness percent badge, metrics, summary card, and raw JSON payload inspector
- Full visual and functional E2E flow verified with browser subagent

## Phase 5 Notes
- `POST /api/explain-node` and `POST /api/ask` endpoints implemented
- Schemas in `app/schemas/explain.py`, service in `app/services/explanation_service.py`, router in `app/routers/explain.py`
- `call_groq_text()` added to `groq_client.py` for plain-text completions (reuses existing client)
- Both endpoints use `GROQ_MODEL_FAST` for instant panel responsiveness
- 429 rate-limit returns inline-friendly error messages
- `NodeExplanationPanel.tsx` renders in the Phase 4 aside with:
  - React Query explanation fetch keyed by nodeId (cached, no refetch on re-select)
  - Loading skeleton, error+retry state, and explanation text
  - Resources rendered as linked list
  - Compact per-node scoped chat box with conversation history, typing indicator, and inline error
  - Chat history resets on node change
- `types.ts` extended with `Message`, `ExplainNodeRequest/Response`, `AskRequest/Response`
- `devroute.ts` extended with `explainNode()` and `askQuestion()` API functions
- Backend endpoints tested and verified (200 with role-specific responses)

## Phase 6 Notes
- Graph/Dashboard tab toggle added to GraphPage header (no separate route, same in-memory data)
- `ReadinessRing.tsx`: Large SVG circular progress ring with projector-safe contrast and glow effect
- `MilestoneList.tsx`: Groups nodes by category, shows per-category progress bar and X/Y count, node labels with status-colored dots (green/amber/red)
- `NextActionsCard.tsx`: Top 3 missing nodes sorted by ascending unmet-prerequisite count, with difficulty badge, category tag, first resource link; clicking switches to Graph tab with node pre-selected
- Dashboard and graph share the exact same nodes/edges array — zero data drift
- Production build passes cleanly (290 modules, 0 errors)

## Next Phase
**Phase 7 — Polish + Deploy**
