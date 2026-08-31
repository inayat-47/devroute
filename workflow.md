# DevRoute — Antigravity Build Workflow (Phase-by-Phase)

## How to use this file
Paste **one phase at a time** into Antigravity, in order. Each phase ends with an
explicit **APPROVAL GATE** — do not let Antigravity move to the next phase until
you've reviewed the output of the current one. This keeps context small, output
reviewable, and avoids the agent silently drifting from the spec across a huge
one-shot prompt.

Reference `requirements.md` alongside every phase prompt (attach it or paste the
relevant section) so Antigravity always has the schema/contracts in front of it.

---

## Phase 0 — Project Scaffolding
**Goal:** Empty but runnable full-stack skeleton.
**Deliverables:**
- `/frontend` — React (Vite) + Tailwind, folder structure (`components/`, `pages/`, `hooks/`, `api/`)
- `/backend` — FastAPI app, folder structure (`app/routers/`, `app/services/`, `app/schemas/`, `app/main.py`)
- `requirements.txt` with core deps: `fastapi`, `uvicorn[standard]`, `httpx`, `pydantic`, `python-dotenv`, `anthropic`
- `.env.example` files on both sides (GitHub token optional, LLM API key)
- Root `README.md` with run instructions
- CORS configured (`CORSMiddleware`), basic health-check route (`GET /api/health`)
**Approval gate:** Confirm both servers boot locally (`npm run dev` for frontend, `uvicorn app.main:app --reload` for backend) before continuing.

---

## Phase 1 — GitHub Data Ingestion Service (FastAPI Backend)
**Goal:** `POST /api/analyze` fully working with real GitHub data.
**Deliverables:**
- GitHub API client (fetch user repos, languages, topics)
- Parser for `package.json` / `requirements.txt` / `pom.xml` (fetch raw file content per repo, extract dependency names)
- Skill inference logic: map raw languages/deps/topics → normalized `Skill[]` with evidence + confidence
- Error handling: private/empty profile, GitHub rate-limit (403), invalid username (404)
- Resume-paste fallback path (basic keyword/skill extraction from pasted text, no LLM needed yet)
**Approval gate:** Test with a real GitHub username and confirm `knownSkills[]` output looks sane before moving on.

---

## Phase 2 — LLM Skill-Gap Analysis Engine (FastAPI Backend)
**Goal:** `POST /api/generate-path` working end-to-end.
**Deliverables:**
- Prompt template: `knownSkills[] + targetRole` → structured gap JSON
- Pydantic schema for the expected LLM output; validate + retry-once on failure
- Transform validated LLM output into `SkillNode[]` + `Edge[]` per the data model in requirements.md
- Compute `readinessPercent`
**Approval gate:** Confirm the JSON output matches the schema exactly and prerequisite edges make logical sense for at least 2 different target roles.

---

## Phase 3 — Frontend: Conversational Input UI
**Goal:** Landing screen where the learner enters their goal.
**Deliverables:**
- Input form: target role (required), GitHub username (optional), resume paste (optional, shown as fallback if no username)
- Loading state while `/api/analyze` + `/api/generate-path` run (chain the two calls)
- Error states (bad username, rate-limited, LLM failure) shown clearly, not silently swallowed
**Approval gate:** Full happy-path flow — enter role + username, see loading, land on graph page — works visually.

---

## Phase 4 — Frontend: Interactive Dependency Graph
**Goal:** The core demo moment — the graph itself.
**Deliverables:**
- React Flow graph rendering `nodes`/`edges` from the API
- Node coloring: green (completed), yellow (in-progress), red (missing)
- Auto-layout so prerequisites sit visually before dependents (dagre or elkjs layout algorithm)
- Zoom/pan, click-to-select node (selected state visually distinct)
**Approval gate:** Graph renders correctly for a real profile + role combo, colors match status, layout doesn't overlap/crisscross badly.

---

## Phase 5 — AI Explanation Assistant
**Goal:** `POST /api/explain-node` and `/api/ask` wired into a side panel.
**Deliverables:**
- Clicking a node opens a side panel with: skill name, status, why it's recommended/marked done, suggested resources
- Small chat box scoped to that node for follow-up questions ("explain this like I'm a beginner", "what should I learn first here")
- Loading/error states for the explanation call
**Approval gate:** Explanations read naturally and are actually specific to the node/role (not generic boilerplate).

---

## Phase 6 — Dashboard
**Goal:** Progress/summary view.
**Deliverables:**
- Readiness % (large, visual — progress ring or bar)
- Milestone groupings (cluster nodes by category, show completion per cluster)
- "Next 3 recommended actions" card (lowest-prerequisite missing nodes first)
**Approval gate:** Dashboard numbers match the graph state exactly (no drift between the two views).

---

## Phase 7 — Polish + Deploy
**Goal:** Demo-ready.
**Deliverables:**
- Empty/error states polished (no blank white screens)
- Responsive check on laptop + projector-safe contrast
- Deploy frontend to Vercel, backend to Render; wire real env vars
- Final README with architecture diagram + demo script (what to type, in what order, for the judges)
**Approval gate:** Full run-through on the deployed URL, not just localhost.
