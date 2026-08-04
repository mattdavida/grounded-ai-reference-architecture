"""Capacity planning response schemas — deterministic, no LLM math."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class CapacityKpis(BaseModel):
    active_projects: int
    owners: int
    overallocated_projects: int
    overloaded_owners: int
    total_fte_demand: float
    owner_capacity_fte: float


class OwnerLoad(BaseModel):
    owner: str
    project_count: int
    fte_demand: float
    capacity_fte: float
    utilization_pct: float
    overloaded: bool
    worst_rag: str | None
    areas: list[str]
    project_ids: list[str]


class AreaLoad(BaseModel):
    area: str
    project_count: int
    fte_demand: float
    overallocated_count: int
    owners: list[str]


class CapacityProjectRow(BaseModel):
    portfolio_id: str
    name: str
    area: str | None
    owner: str | None
    rag_status: str | None
    project_status: str | None
    completion_pct: float | None
    fte_demand: float
    overallocation: bool
    planned_start: date | None
    planned_finish: date | None


class CapacityResponse(BaseModel):
    data_version: str
    kpis: CapacityKpis
    by_owner: list[OwnerLoad]
    by_area: list[AreaLoad]
    projects: list[CapacityProjectRow]
