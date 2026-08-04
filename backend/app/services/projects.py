"""Deterministic project queries — shared by HTTP routers and agent tools."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, RowType

# KPI quick-filters from Overview click-through.
KPI_FILTERS = frozenset(
    {
        "totalAll",
        "active",
        "completed",
        "nearCompletion",
        "avgCompletion",
        "blockedOnHold",
        "attention",
    }
)

_RAG_RANK = {"red": 0, "amber": 1, "green": 2}
_RISK_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def is_watchlist(project: Project) -> bool:
    """Amber/red RAG or blocked/on hold — keep in sync with frontend."""
    rag = (project.rag_status or "").lower()
    status = (project.project_status or "").lower()
    return rag in {"amber", "red"} or status in {"blocked", "on hold"}


def monitor_sort_key(project: Project) -> tuple:
    """Watchlist-first, then worse RAG/risk, then name."""
    return (
        0 if is_watchlist(project) else 1,
        _RAG_RANK.get((project.rag_status or "").lower(), 9),
        _RISK_RANK.get((project.risk_level or "").lower(), 9),
        (project.name or "").lower(),
    )


def _parent_query():
    return (
        select(Project)
        .where(Project.row_type == RowType.PARENT)
        .where(Project.is_archived.is_(False))
    )


def list_projects(
    session: Session,
    *,
    area: str | None = None,
    rag: str | None = None,
    status: str | None = None,
    risk: str | None = None,
    watchlist: bool | None = None,
    kpi_filter: str | None = None,
    sort: str = "monitor",
) -> list[Project]:
    """Return parent initiatives matching optional filters."""
    rows = list(session.scalars(_parent_query()).all())

    if area:
        area_l = area.lower()
        rows = [p for p in rows if (p.area or "").lower() == area_l]

    if rag:
        rag_l = rag.lower()
        rows = [p for p in rows if (p.rag_status or "").lower() == rag_l]

    if status:
        status_l = status.lower()
        rows = [p for p in rows if (p.project_status or "").lower() == status_l]

    if risk:
        risk_l = risk.lower()
        rows = [p for p in rows if (p.risk_level or "").lower() == risk_l]

    if watchlist is True:
        rows = [p for p in rows if is_watchlist(p)]
    elif watchlist is False:
        rows = [p for p in rows if not is_watchlist(p)]

    if kpi_filter and kpi_filter in KPI_FILTERS:
        rows = _apply_kpi_filter(rows, kpi_filter)

    if sort == "monitor":
        rows.sort(key=monitor_sort_key)
    elif sort == "name":
        rows.sort(key=lambda p: (p.name or "").lower())
    else:
        rows.sort(key=lambda p: (p.ordinal, p.name or ""))

    return rows


def _apply_kpi_filter(rows: list[Project], kpi_filter: str) -> list[Project]:
    if kpi_filter in {"totalAll", "avgCompletion"}:
        return rows
    if kpi_filter == "active":
        return [p for p in rows if (p.project_status or "").lower() != "completed"]
    if kpi_filter == "completed":
        return [p for p in rows if (p.project_status or "").lower() == "completed"]
    if kpi_filter == "nearCompletion":
        return [
            p
            for p in rows
            if p.completion_pct is not None
            and p.completion_pct >= 80
            and (p.project_status or "").lower() != "completed"
        ]
    if kpi_filter == "blockedOnHold":
        return [
            p
            for p in rows
            if (p.project_status or "").lower() in {"blocked", "on hold"}
        ]
    if kpi_filter == "attention":
        return [p for p in rows if is_watchlist(p)]
    return rows


def get_project(session: Session, portfolio_id: str) -> Project | None:
    return session.get(Project, portfolio_id)


def find_project_by_name(session: Session, name: str) -> Project | None:
    """Case-insensitive exact then partial name match over parents."""
    needle = (name or "").strip().lower()
    if not needle:
        return None

    parents = list(session.scalars(_parent_query()).all())
    for p in parents:
        if (p.name or "").lower() == needle:
            return p
    for p in parents:
        if needle in (p.name or "").lower():
            return p
    return None


def format_project_line(project: Project) -> str:
    """Compact one-line fact string for tool responses."""
    parts = [
        project.name,
        f"id={project.portfolio_id}",
        f"area={project.area or 'n/a'}",
        f"owner={project.owner or 'n/a'}",
        f"status={project.project_status or 'n/a'}",
        f"RAG={project.rag_status or 'n/a'}",
        f"risk={project.risk_level or 'n/a'}",
        f"completion={project.completion_pct if project.completion_pct is not None else 'n/a'}%",
        f"variance=${(project.budget_variance or 0):,.0f}",
    ]
    return " | ".join(parts)


def format_project_detail(project: Project) -> str:
    """Multi-line detail block for tool / detail views."""
    lines = [
        f"Name: {project.name}",
        f"Portfolio ID: {project.portfolio_id}",
        f"Area: {project.area or 'n/a'}",
        f"Owner: {project.owner or 'n/a'}",
        f"Priority: {project.priority or 'n/a'}",
        f"Status: {project.project_status or 'n/a'}",
        f"RAG: {project.rag_status or 'n/a'}",
        f"Risk: {project.risk_level or 'n/a'}",
        f"Completion: {project.completion_pct if project.completion_pct is not None else 'n/a'}%",
        f"Approved budget: ${(project.approved_budget or 0):,.0f}",
        f"Projected final: ${(project.projected_final_cost or 0):,.0f}",
        f"Spent: ${(project.budget_spent or 0):,.0f}",
        f"Variance: ${(project.budget_variance or 0):,.0f}",
        f"Planned start: {project.planned_start or 'n/a'}",
        f"Planned finish: {project.planned_finish or 'n/a'}",
        f"Last update: {project.last_update or 'n/a'}",
        f"Executive comment: {project.executive_comment or 'n/a'}",
    ]
    return "\n".join(lines)
