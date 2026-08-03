"""Projects list stub — returns synthetic portfolio rows once seeded."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models.project import Project, RowType

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectSummary(BaseModel):
    portfolio_id: str
    name: str
    area: str | None
    owner: str | None
    rag_status: str | None
    project_status: str | None
    risk_level: str | None
    completion_pct: float | None
    approved_budget: float | None
    budget_variance: float | None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ProjectSummary])
def list_projects(session: Session = Depends(get_session)) -> list[ProjectSummary]:
    """List parent initiatives (excludes sub-phases and archived rows)."""
    rows = session.scalars(
        select(Project)
        .where(Project.row_type == RowType.PARENT)
        .where(Project.is_archived.is_(False))
        .order_by(Project.ordinal, Project.name)
    ).all()
    return [ProjectSummary.model_validate(r) for r in rows]
