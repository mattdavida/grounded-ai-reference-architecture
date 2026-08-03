"""Builds the portfolio context string injected into the LLM system prompt.

Pre-fetches aggregated overview KPIs and the parent project list so the LLM
can answer quantitative and project-specific questions. Graph nodes do no I/O —
this runs in the FastAPI route before graph.invoke().
"""

from __future__ import annotations

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, RowType
from app.services.dashboard import compute_overview


def build_portfolio_context(session: Session) -> tuple[str, str]:
    """Return (portfolio_context_str, data_version) for the current dataset."""
    overview = compute_overview(session)

    parents = session.scalars(
        select(Project)
        .where(
            Project.row_type == RowType.PARENT,
            Project.is_archived == False,  # noqa: E712
        )
        .order_by(Project.name)
    ).all()

    project_lines: list[str] = []
    for p in parents:
        line = (
            f"- {p.name}"
            f" | Status: {p.project_status or 'N/A'}"
            f" | RAG: {p.rag_status or 'N/A'}"
            f" | Risk: {p.risk_level or 'N/A'}"
            f" | Completion: {int(p.completion_pct or 0)}%"
            f" | Owner: {p.owner or 'N/A'}"
            f" | Area: {p.area or 'N/A'}"
        )
        if p.approved_budget is not None:
            variance = p.budget_variance or 0.0
            line += (
                f" | Approved: ${p.approved_budget:,.0f}"
                f" | Variance: ${variance:,.0f}"
            )
        if p.executive_comment:
            line += f" | Note: {p.executive_comment}"
        project_lines.append(line)

    status_counts = Counter((p.project_status or "Unknown") for p in parents)
    risk_counts = Counter((p.risk_level or "Unknown") for p in parents)
    watchlist = [
        p
        for p in parents
        if (p.rag_status or "").lower() in {"amber", "red"}
        or (p.project_status or "").lower() in {"blocked", "on hold"}
    ]
    area_counts = Counter((p.area or "Unknown") for p in watchlist)
    near_completion = sum(1 for p in parents if (p.completion_pct or 0) > 75)

    status_lines = "\n".join(f"  {label}: {count}" for label, count in sorted(status_counts.items()))
    risk_lines = "\n".join(f"  {label}: {count}" for label, count in sorted(risk_counts.items()))
    area_lines = "\n".join(
        f"  {label}: {count}" for label, count in area_counts.most_common(10)
    ) or "  (none)"

    budget = overview.budget
    rag = overview.rag

    context = f"""=== PORTFOLIO SUMMARY ===
Total Initiatives: {overview.total_projects}
Active: {overview.active}
Completed: {overview.completed}
Blocked: {overview.blocked}
Watchlist (attention signals): {overview.on_watchlist}
Near Completion (>75%): {near_completion}
Avg Completion: {overview.avg_completion}%

=== RAG STATUS ===
  Green: {rag.green}
  Amber: {rag.amber}
  Red: {rag.red}

=== EXECUTION STATUS ===
{status_lines}

=== RISK BREAKDOWN ===
{risk_lines}

=== WATCHLIST BY AREA ===
{area_lines}

=== BUDGET OVERVIEW ===
  Approved:         ${budget.approved:,.0f}
  Projected Final:  ${budget.projected:,.0f}
  Spent:            ${budget.spent:,.0f}
  Variance:         ${budget.variance:,.0f}

=== EXECUTIVE SUMMARY ===
{overview.executive_summary}

=== ALL PARENT INITIATIVES ({len(parents)} total) ===
Format: Name | Status | RAG | Risk | Completion | Owner | Area [| Budget | Variance] [| Note]
{chr(10).join(project_lines)}"""

    return context, overview.data_version
