"""Deterministic proactive alerts from watchlist + capacity signals.

No subscriptions, no LLM — same services the dashboard already trusts.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.alerts import AlertItem, AlertsResponse
from app.services.capacity import compute_capacity
from app.services.dashboard import DATA_VERSION
from app.services.projects import list_projects


def compute_alerts(session: Session) -> AlertsResponse:
    """Build a short, actionable alert list for the UI banner."""
    watchlist = list_projects(session, watchlist=True, sort="monitor")
    blocked = list_projects(session, kpi_filter="blockedOnHold", sort="monitor")
    red = list_projects(session, rag="Red", sort="monitor")
    capacity = compute_capacity(session)
    overloaded = [o for o in capacity.by_owner if o.overloaded]

    alerts: list[AlertItem] = []

    if blocked:
        names = ", ".join(p.name for p in blocked[:3])
        more = f" (+{len(blocked) - 3} more)" if len(blocked) > 3 else ""
        alerts.append(
            AlertItem(
                id="blocked",
                kind="blocked",
                severity="critical",
                title=f"{len(blocked)} blocked or on hold",
                detail=f"{names}{more}",
                count=len(blocked),
                href="/?tab=portfolio&filter=blockedOnHold",
            )
        )

    if red:
        names = ", ".join(p.name for p in red[:3])
        more = f" (+{len(red) - 3} more)" if len(red) > 3 else ""
        alerts.append(
            AlertItem(
                id="red_rag",
                kind="red_rag",
                severity="critical",
                title=f"{len(red)} red RAG initiative(s)",
                detail=f"{names}{more}",
                count=len(red),
                href="/?tab=portfolio&rag=Red",
            )
        )

    if overloaded:
        names = ", ".join(
            f"{o.owner} ({o.fte_demand:.1f} FTE)" for o in overloaded[:3]
        )
        more = f" (+{len(overloaded) - 3} more)" if len(overloaded) > 3 else ""
        alerts.append(
            AlertItem(
                id="overloaded_owners",
                kind="overloaded_owners",
                severity="warning",
                title=f"{len(overloaded)} overloaded owner(s)",
                detail=f"{names}{more}",
                count=len(overloaded),
                href="/capacity",
            )
        )

    # Watchlist is broader than blocked/red — only add if it adds new signal volume.
    if watchlist and len(watchlist) > len(blocked):
        alerts.append(
            AlertItem(
                id="watchlist",
                kind="watchlist",
                severity="warning",
                title=f"{len(watchlist)} on the watchlist",
                detail="Amber/red RAG or blocked/on hold — open Watchlist for the full set.",
                count=len(watchlist),
                href="/?tab=watchlist",
            )
        )

    # Critical first, then warning, then by count.
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: (severity_rank[a.severity], -a.count, a.id))

    return AlertsResponse(
        data_version=DATA_VERSION,
        count=len(alerts),
        alerts=alerts,
    )
