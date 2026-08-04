"""Deterministic capacity / load rollups — the LLM never computes these."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, RowType
from app.schemas.capacity import (
    AreaLoad,
    CapacityKpis,
    CapacityProjectRow,
    CapacityResponse,
    OwnerLoad,
)
from app.services.dashboard import DATA_VERSION

# Synthetic per-owner supply for the demo (1.0 FTE each).
OWNER_CAPACITY_FTE = 1.0

_RAG_RANK = {"red": 0, "amber": 1, "green": 2}


def _is_active(project: Project) -> bool:
    status = (project.project_status or "").lower()
    return status != "completed" and not project.is_archived


def _worst_rag(rags: list[str | None]) -> str | None:
    best = None
    best_rank = 99
    for rag in rags:
        if not rag:
            continue
        rank = _RAG_RANK.get(rag.lower(), 9)
        if rank < best_rank:
            best_rank = rank
            best = rag
    return best


def compute_capacity(session: Session) -> CapacityResponse:
    """Roll up owner/area load from parent initiatives + synthetic FTE demand."""
    parents = session.scalars(
        select(Project)
        .where(Project.row_type == RowType.PARENT)
        .where(Project.is_archived.is_(False))
    ).all()

    active = [p for p in parents if _is_active(p)]

    by_owner: dict[str, list[Project]] = defaultdict(list)
    by_area: dict[str, list[Project]] = defaultdict(list)
    for p in active:
        by_owner[p.owner or "Unassigned"].append(p)
        by_area[p.area or "Unassigned"].append(p)

    owner_rows: list[OwnerLoad] = []
    for owner, projects in by_owner.items():
        fte = round(sum(p.fte_demand or 0.0 for p in projects), 2)
        flagged = any(p.overallocation for p in projects)
        overloaded = flagged or fte > OWNER_CAPACITY_FTE
        util = round((fte / OWNER_CAPACITY_FTE) * 100, 1) if OWNER_CAPACITY_FTE else 0.0
        owner_rows.append(
            OwnerLoad(
                owner=owner,
                project_count=len(projects),
                fte_demand=fte,
                capacity_fte=OWNER_CAPACITY_FTE,
                utilization_pct=util,
                overloaded=overloaded,
                worst_rag=_worst_rag([p.rag_status for p in projects]),
                areas=sorted({p.area or "Unassigned" for p in projects}),
                project_ids=[p.portfolio_id for p in projects],
            )
        )
    owner_rows.sort(key=lambda r: (-int(r.overloaded), -r.fte_demand, r.owner))

    area_rows: list[AreaLoad] = []
    for area, projects in by_area.items():
        area_rows.append(
            AreaLoad(
                area=area,
                project_count=len(projects),
                fte_demand=round(sum(p.fte_demand or 0.0 for p in projects), 2),
                overallocated_count=sum(1 for p in projects if p.overallocation),
                owners=sorted({p.owner or "Unassigned" for p in projects}),
            )
        )
    area_rows.sort(key=lambda r: (-r.fte_demand, r.area))

    project_rows = [
        CapacityProjectRow(
            portfolio_id=p.portfolio_id,
            name=p.name,
            area=p.area,
            owner=p.owner,
            rag_status=p.rag_status,
            project_status=p.project_status,
            completion_pct=p.completion_pct,
            fte_demand=round(p.fte_demand or 0.0, 2),
            overallocation=bool(p.overallocation),
            planned_start=p.planned_start,
            planned_finish=p.planned_finish,
        )
        for p in sorted(
            active,
            key=lambda p: (
                0 if p.overallocation or (p.fte_demand or 0) > OWNER_CAPACITY_FTE else 1,
                -(p.fte_demand or 0),
                p.name,
            ),
        )
    ]

    total_fte = round(sum(p.fte_demand or 0.0 for p in active), 2)
    overallocated = sum(1 for p in active if p.overallocation)
    overloaded_owners = sum(1 for r in owner_rows if r.overloaded)

    return CapacityResponse(
        data_version=DATA_VERSION,
        kpis=CapacityKpis(
            active_projects=len(active),
            owners=len(owner_rows),
            overallocated_projects=overallocated,
            overloaded_owners=overloaded_owners,
            total_fte_demand=total_fte,
            owner_capacity_fte=OWNER_CAPACITY_FTE,
        ),
        by_owner=owner_rows,
        by_area=area_rows,
        projects=project_rows,
    )
