# Future Plan — Enterprise AI Modernization Reference Architecture

> **Project name:** `enterprise-ai-modernization-reference-architecture`
>
> **Audience:** senior developers on multi-sector delivery projects who need a
> runnable starter for grounded operational AI — including teams that do not
> always use AI. Pattern first; product surface second.
>
> A reference architecture demonstrating how to correctly integrate conversational AI
> into an existing operational system — without letting the LLM touch raw data.
>
> Standalone project. No proprietary data, no client-specific logic. Synthetic seed
> data means it runs end-to-end in under 10 minutes.
>
> **Pattern v1 status:** complete (vertical slice). Phases 1–4 below are product
> depth for a fuller demo architecture — not required to adapt the pattern to
> another sector.

---

## Core thesis

The LLM never computes business metrics. Deterministic services own numbers.
The model only narrates a fresh, version-stamped context object (and, in Phase 4,
calls tools that hit those same services).

---

## What Is Built

| Layer | Status | Notes |
|---|---|---|
| Models + Alembic + synthetic seed | Done | 6 parent initiatives |
| `compute_overview()` KPIs | Done | Deterministic; no LLM |
| Grounded LangGraph chat + citations | Done | Context injected in router |
| Azure Speech STT/TTS + server tokens | Done | Key never in browser |
| Overview UI | Done | KPIs, RAG donut, watchlist, budget, table |
| Bicep + `deploy.ps1` (`-SkipSpeech`) | Done | OpenAI, Speech, Key Vault, optional App Service |
| Portfolio / Watchlist / Detail tabs | Done | Phase 1 |
| Filtered project APIs | Done | Shared by UI + tools |
| Agent tools + ToolNode | Done | Phase 4 core (`VOICE_CHAT_TOOLS_ENABLED`) |
| Streaming chat (SSE) | Done | `POST /api/chat/stream` |
| Proactive alerts tab | Done | `GET /api/alerts` + Portfolio dashboard Alerts tab |
| Capacity planning (owner/area FTE load) | Done | Phase 2 |
| Exports (JSON/CSV packs) | Done | Phase 2 |
| Monthly review / version history tabs | Removed | Out of POC scope (keep Exports + `data_version`) |
| Entra ID / RBAC / Q&A audit | Not yet | Phase 3 |

---

## Implementation Checklist

### Pre-0: Foundation (pattern v1 — done)

Selective scaffold from modernized PMO patterns (not bulk copy-then-strip).

- [x] Fresh git init (no PMO history)
- [x] Clean tree: no legacy monolith, no client `_data/` / `_backups/`
- [x] Neutral branding + `--ra-*` design tokens
- [x] `seed_db.py` with synthetic portfolio data
- [x] Bicep `projectName = eaim` + RG naming; Speech optional (`-SkipSpeech`)
- [x] README + ARCHITECTURE describe the pattern
- [x] Smoke: health / overview / chat / voice / Overview UI
- [x] First commit + remote

### Phase 1: Remaining dashboard tabs

- [x] Portfolio initiatives table on Overview (watchlist-first)
- [x] Dedicated Portfolio / Watchlist tabs with filters
- [x] Project detail pane — full field display, timeline, budget breakdown
- [x] Click-through from Overview KPI cards / RAG / area into filtered views
- [x] LLM context includes project list detail for Q&A on specific projects
- [x] Filtered `GET /api/projects` + `GET /api/projects/{id}`

### Phase 2: Broader product surface

- [x] Sidebar / nav shell
- [x] Capacity planning view — `GET /api/capacity`, owner/area FTE load, overallocation
- [x] Exports — projects / capacity / overview as JSON or CSV
- [x] Trimmed out of POC: monthly review + version-history tabs (redundant without edit/AI-draft)

### Phase 3: Identity, security, governance

- [ ] Entra ID authentication
- [ ] RBAC on APIs (and therefore on tools)
- [ ] Audit log of Q&A (`session_id`, `data_version`, latency)
- [ ] Optional later: draft/publish + named version freezes if governance demos need them

### Phase 4: Advanced AI

- [x] DB-backed tools (`filter_projects_by_area`, `get_project_details`, `list_watchlist_projects`)
- [x] `bind_tools` + ToolNode loop in LangGraph
- [x] Feature flag for tools (`VOICE_CHAT_TOOLS_ENABLED`)
- [x] Streaming chat responses (`POST /api/chat/stream` SSE)
- [x] Proactive watchlist/capacity alerts (`GET /api/alerts` + Alerts dashboard tab)

---

## Adapting This to Your Domain

The only layer that is domain-specific is `services/dashboard.py` (and projects
query helpers), the database schema, seed, and UI labels. Everything above it is
domain-agnostic.

1. Update `app/models/` for your entity schema  
2. Update `alembic/versions/` with your migration  
3. Write a new `scripts/seed_db.py` for your synthetic data  
4. Replace `compute_overview()` and related functions in `services/dashboard.py`  
5. Update context formatting + system prompt domain wording in `voice_chat/`  
6. Adjust Overview labels/columns in the frontend dashboard components  
7. Everything else — LangGraph pipeline, Speech integration, Bicep infra, voice
   panel wiring — stays the same  

Canonical “change vs leave alone” table: [`README.md`](./README.md) ·
flow detail: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Success Criteria

### Pattern v1 (starter reference) — done when

1. A senior developer can clone, seed, and run a working Overview + optional
   voice/chat locally with no client data or branding — Azure credentials only
   when exercising AI features
2. README explains *why* grounded context works, states non-goals, and has a
   clear change/leave-alone adaptation contract
3. Assistant can answer questions about seeded projects by name with citations
4. `deploy.ps1` provisions required Azure resources (Speech skippable) and writes
   `backend/.env`
5. ARCHITECTURE.md + README diagram are enough to understand the pattern without
   reading all source

### Product depth (Phase 1+) — separate track

Additional tabs, Entra/RBAC, exports, tool-calling, streaming, and alerts are
valuable for richer demos and production starts — they are **not** required for
a senior to adapt the pattern to another sector.

Product-depth v1 (this push) — done when:

1. [x] Portfolio / Watchlist / Detail tabs work with URL-driven filters  
2. [x] KPI / RAG / area clicks navigate into filtered Portfolio views  
3. [x] Agent tools call the same project services as the UI  
4. [x] Phase 2 Capacity + Exports routes ship real grounded APIs/UI  
5. [x] Chat still cites `data_version` after tool use  

---

## Related docs

- [`README.md`](./README.md) — quick start, non-goals, change/leave table  
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — boundaries, flows, scale guidance  
