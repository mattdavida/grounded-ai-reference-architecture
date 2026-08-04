"""Project API schemas — shared by list, detail, and agent tools."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.project import RowType


class ProjectSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class ProjectDetail(ProjectSummary):
    parent_id: str | None = None
    row_type: RowType | None = None
    ordinal: int | None = None
    priority: str | None = None
    executive_comment: str | None = None
    projected_final_cost: float | None = None
    budget_spent: float | None = None
    planned_start: date | None = None
    planned_finish: date | None = None
    last_update: date | None = None
    fte_demand: float | None = None
    overallocation: bool | None = None
    is_archived: bool | None = None


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]
    total: int
