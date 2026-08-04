"""Proactive portfolio alert schemas — deterministic signals only."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

AlertSeverity = Literal["critical", "warning", "info"]
AlertKind = Literal[
    "watchlist",
    "overloaded_owners",
    "blocked",
    "red_rag",
]


class AlertItem(BaseModel):
    id: str
    kind: AlertKind
    severity: AlertSeverity
    title: str
    detail: str
    count: int
    href: str = Field(description="In-app path for drill-down")


class AlertsResponse(BaseModel):
    data_version: str
    count: int
    alerts: list[AlertItem]
