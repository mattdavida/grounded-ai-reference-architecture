"""Deterministic portfolio metrics — the LLM never computes these numbers."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, RowType
from app.schemas.dashboard import BudgetOverview, OverviewResponse, RagCounts

# Keep in sync with frontend design tokens (RAG colours).
RAG_COLORS = {
    "Green": "#22945f",
    "Amber": "#f0a500",
    "Red": "#e62d1e",
}

DATA_VERSION = f"Dashboard data {date.today().isoformat()}"


def compute_overview(session: Session) -> OverviewResponse:
    """Precompute KPIs from the projects table. Pure Python — no LLM."""
    projects = session.scalars(
        select(Project)
        .where(Project.row_type == RowType.PARENT)
        .where(Project.is_archived.is_(False))
    ).all()

    total = len(projects)
    completed = sum(1 for p in projects if (p.project_status or "").lower() == "completed")
    blocked = sum(1 for p in projects if (p.project_status or "").lower() == "blocked")
    active = total - completed
    watchlist = sum(
        1
        for p in projects
        if (p.rag_status or "").lower() in {"amber", "red"}
        or (p.project_status or "").lower() in {"blocked", "on hold"}
    )

    completions = [p.completion_pct for p in projects if p.completion_pct is not None]
    avg_completion = round(sum(completions) / len(completions), 1) if completions else 0.0

    rag = RagCounts(
        green=sum(1 for p in projects if (p.rag_status or "").lower() == "green"),
        amber=sum(1 for p in projects if (p.rag_status or "").lower() == "amber"),
        red=sum(1 for p in projects if (p.rag_status or "").lower() == "red"),
    )

    approved = sum(p.approved_budget or 0 for p in projects)
    projected = sum(p.projected_final_cost or 0 for p in projects)
    spent = sum(p.budget_spent or 0 for p in projects)
    variance = sum(p.budget_variance or 0 for p in projects)

    if total == 0:
        summary = "No projects loaded. Run scripts/seed_db.py to load synthetic demo data."
    elif watchlist == 0:
        summary = f"Portfolio is healthy — {total} initiatives, none on the watchlist."
    else:
        summary = (
            f"{watchlist} of {total} initiatives need attention "
            f"({rag.red} red, {rag.amber} amber RAG)."
        )

    return OverviewResponse(
        total_projects=total,
        active=active,
        completed=completed,
        blocked=blocked,
        on_watchlist=watchlist,
        avg_completion=avg_completion,
        rag=rag,
        budget=BudgetOverview(
            approved=approved,
            projected=projected,
            spent=spent,
            variance=variance,
        ),
        data_version=DATA_VERSION,
        executive_summary=summary,
    )
