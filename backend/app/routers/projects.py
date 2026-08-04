"""Projects list + detail — filtered queries shared with agent tools."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.schemas.project import ProjectDetail, ProjectListResponse, ProjectSummary
from app.services import projects as projects_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
def list_projects(
    session: Session = Depends(get_session),
    area: str | None = Query(default=None, description="Filter by owner area"),
    rag: str | None = Query(default=None, description="Filter by RAG status"),
    status: str | None = Query(default=None, description="Filter by project status"),
    risk: str | None = Query(default=None, description="Filter by risk level"),
    watchlist: bool | None = Query(
        default=None, description="If true, only attention/watchlist rows"
    ),
    kpi_filter: str | None = Query(
        default=None,
        alias="filter",
        description="KPI quick-filter (totalAll, active, completed, …)",
    ),
    sort: str = Query(default="monitor", description="monitor | name | ordinal"),
) -> ProjectListResponse:
    """List parent initiatives with optional filters."""
    rows = projects_service.list_projects(
        session,
        area=area,
        rag=rag,
        status=status,
        risk=risk,
        watchlist=watchlist,
        kpi_filter=kpi_filter,
        sort=sort,
    )
    return ProjectListResponse(
        items=[ProjectSummary.model_validate(r) for r in rows],
        total=len(rows),
    )


@router.get("/{portfolio_id}", response_model=ProjectDetail)
def get_project(
    portfolio_id: str, session: Session = Depends(get_session)
) -> ProjectDetail:
    """Return a single initiative by portfolio id."""
    project = projects_service.get_project(session, portfolio_id)
    if project is None:
        raise HTTPException(
            status_code=404, detail=f"Project {portfolio_id!r} not found"
        )
    return ProjectDetail.model_validate(project)
