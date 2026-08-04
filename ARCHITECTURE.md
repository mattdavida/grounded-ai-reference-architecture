# Architecture

This document is for a senior developer who needs to understand boundaries
quickly, run the app, and adapt the domain to their sector.

---

## Intent

**Problem:** most enterprise AI POCs put an LLM on raw operational data. Numbers
hallucinate, sources disappear, and the demo dies when data changes.

**Rule:** the LLM never computes business metrics. Deterministic services own
numbers. The model only narrates a fresh, version-stamped context object.

**Example domain:** synthetic project portfolio. Replace it with any operational
entity set (claims, trials, loans, tickets) by swapping schema + services + seed.

**Scale note:** the demo fits the whole portfolio in one prompt. For hundreds of
entities, see [Handling context limits (scale)](#handling-context-limits-scale)
before adapting.

---

## Runtime topology

```
Browser (Next.js :4001)
  │  /api/*  (rewritten → FastAPI)
  ▼
FastAPI (:8000)
  ├─ /api/health
  ├─ /api/dashboard/overview   → compute_overview(session)
  ├─ /api/projects             → SQLAlchemy query
  ├─ /api/speech/token         → Azure STS (API key never in browser)
  └─ /api/chat                 → build_portfolio_context() then LangGraph.invoke()
        │
        ├─ Azure OpenAI (chat)
        └─ SQLite checkpointer (conversation history for multi-turn memory —
             keyed by session_id; not a vector / embedding store)
```

Voice STT/TTS runs in the browser via the Azure Speech SDK using the short-lived
token from `/api/speech/token` (refreshed at 9 minutes; STS expires at 10).

---

## Layer responsibilities

| Layer | Owns | Must not |
|---|---|---|
| Models + Alembic | Schema | Business KPIs |
| `services/dashboard.py` | Deterministic KPIs / rollups | Call the LLM |
| `voice_chat/context.py` | Format facts for the prompt | Invent numbers |
| `voice_chat/graph.py` | LLM turn + memory | Hit the database |
| Routers | HTTP + authz (future) | Embed domain math |
| Frontend | Presentation + voice UX | Hold long-lived Azure keys |
| `infra/` | Azure resources | Contain app business rules |

**Critical design choice:** context is built in the chat **router** before
`graph.invoke()`. Graph nodes stay pure transforms (message + context → answer).

---

## Request flows

### Dashboard load

1. Frontend fetches `/api/dashboard/overview` and `/api/projects`
2. `compute_overview()` aggregates from SQLite
3. UI renders KPIs, Red/Amber/Green donut, budget, initiatives table

> **Note on “RAG”:** in this repo, **RAG means Red / Amber / Green** project
> health — not Retrieval-Augmented Generation. We deliberately avoid
> retrieval-over-raw-rows for operational numbers; see the pattern above.

### Chat turn

1. `POST /api/chat` `{ message, session_id? }`
2. Router rebuilds portfolio context (fresh numbers every turn)
3. LangGraph runs with `thread_id = session_id` — the SQLite checkpointer only
   stores prior messages for that session so follow-ups like “tell me more”
   work (again: conversation memory, not embeddings)
4. Response includes `answer`, `data_version`, `session_id`
5. UI strips `Source: …` into a citation badge; TTS omits the citation line

### Speech

1. Frontend calls `/api/speech/token` on mount + every 9 minutes
2. Mic → Azure STT (`recognizeOnceAsync`)
3. Transcript → `/api/chat`
4. Answer → Azure Neural TTS (SSML rate control)

---

## Handling context limits (scale)

Traditional list APIs paginate (`?limit=50&offset=100`). The LLM instead has a
**token budget** for whatever you put in the system prompt.

**What this reference does today**

`compute_overview()` + `build_portfolio_context()` format the **entire seeded
portfolio** into the prompt: rolled-up aggregates (counts, budget totals, status
/ risk breakdowns, executive summary) **plus** a detail line per parent
initiative. The demo is small (~6 parents), so that fits comfortably.

**The pattern when you adapt to hundreds of rows**

You cannot pass every production row. Your Python service must **pre-aggregate
(and usually filter) before** formatting the context string — the LLM summarizes
the summary. Keep rollups always; shrink detail.

| Strategy | When to use |
|---|---|
| Aggregates only + watchlist / exceptions | Default for large portfolios |
| Top-N by risk, variance, or area | Leadership “what needs attention?” |
| Filter in `build_*_context()` (status, area, owner) | User already narrowed the question |
| Tool calling for drill-down (`tools.py` scaffold exists; not connected yet) | “Tell me about project X” without listing all rows |

The current builder does **not** hard-cap the detail list — that is an
intentional adaptation point, not a magically scaled feature. UI list APIs can
still paginate independently; do not assume the chat path inherits UI pagination.

---

## Adaptation contract

### Change for your domain

1. `backend/app/models/` — entities  
2. `backend/alembic/versions/` — migrations  
3. `backend/scripts/seed_db.py` — synthetic data  
4. `backend/app/services/dashboard.py` — `compute_overview()` (and related)  
5. `backend/app/services/voice_chat/context.py` — context block shape/labels  
6. Prompt domain wording in `voice_chat/graph.py`  
7. Frontend dashboard labels/columns under `frontend/src/components/dashboard/`

### Leave alone (unless changing platforms)

- LangGraph topology and checkpointer usage  
- Speech token exchange pattern  
- Bicep modules + `deploy.ps1` / `-SkipSpeech`  
- Chat API contract (`answer`, `data_version`, `session_id`)  
- “No secrets in the browser” rule  

### Minimal mental model

```
Your domain  →  models + seed + compute_*  →  context string
Platform     →  LangGraph + Speech + Bicep + Next shell
```

---

## Azure resources

Default `.\infra\deploy.ps1` provisions:

- Azure OpenAI (chat deployment)
- Azure Speech (F0 in dev) — **optional** via `-SkipSpeech` when the
  subscription already has an F0 resource
- Key Vault (secret placeholders; script writes real keys post-deploy)
- App Service — **off by default** (`-DeployAppService` when needed)

Local app data stays on SQLite (`backend/dev.db`, `voice_chat.db`). Postgres is
an Alembic connection-string change, not a rewrite.

---

## Security notes (current vs intended)

| Topic | Current | Intended later |
|---|---|---|
| Speech/OpenAI keys | Server `.env` / Key Vault | Same; App Service KV refs |
| Browser credentials | Short-lived Speech STS only | Unchanged |
| AuthN/AuthZ | None (local demo) | Entra ID + RBAC |
| Audit of Q&A | Not persisted | Log session + data_version |
| Agent tools | Code exists in `tools.py`, but no tools connected | Wire ToolNode / bind_tools |

---

## Testing the pattern quickly

```bash
# health
curl http://127.0.0.1:8000/api/health

# grounded chat (requires Azure OpenAI in backend/.env)
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Which projects are blocked?\"}"
```

Expect a factual answer that matches `/api/dashboard/overview` and ends with
`Source: Dashboard data …`.

---

## Related docs

- [`README.md`](./README.md) — quick start, non-goals, change/leave table, status  
