"""Deterministic export builders — CSV/JSON packs from grounded services."""

from __future__ import annotations

import csv
import io
import json
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.services.capacity import compute_capacity
from app.services.dashboard import compute_overview
from app.services.projects import list_projects

EXPORT_KINDS = frozenset({"projects", "capacity", "overview"})


def _projects_rows(session: Session) -> list[dict[str, Any]]:
    rows = list_projects(session, sort="monitor")
    return [
        {
            "portfolio_id": p.portfolio_id,
            "name": p.name,
            "area": p.area,
            "owner": p.owner,
            "rag_status": p.rag_status,
            "project_status": p.project_status,
            "risk_level": p.risk_level,
            "completion_pct": p.completion_pct,
            "approved_budget": p.approved_budget,
            "budget_variance": p.budget_variance,
            "fte_demand": p.fte_demand,
            "overallocation": p.overallocation,
            "planned_start": p.planned_start.isoformat() if p.planned_start else None,
            "planned_finish": p.planned_finish.isoformat() if p.planned_finish else None,
        }
        for p in rows
    ]


def build_export_payload(session: Session, kind: str) -> dict[str, Any]:
    if kind not in EXPORT_KINDS:
        raise ValueError(f"Unknown export kind: {kind}")

    if kind == "projects":
        return {
            "kind": kind,
            "exported_on": date.today().isoformat(),
            "items": _projects_rows(session),
        }
    if kind == "capacity":
        return {
            "kind": kind,
            "exported_on": date.today().isoformat(),
            "payload": compute_capacity(session).model_dump(mode="json"),
        }
    return {
        "kind": kind,
        "exported_on": date.today().isoformat(),
        "payload": compute_overview(session).model_dump(mode="json"),
    }


def to_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, indent=2, default=str).encode("utf-8")


def to_csv_bytes(payload: dict[str, Any]) -> bytes:
    """CSV for tabular exports; nested packs fall back to a key/value summary."""
    kind = payload.get("kind")
    buf = io.StringIO()

    if kind == "projects":
        items = payload.get("items") or []
        if not items:
            buf.write("portfolio_id,name\n")
            return buf.getvalue().encode("utf-8")
        fieldnames = list(items[0].keys())
        writer = csv.DictWriter(buf, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(items)
        return buf.getvalue().encode("utf-8")

    if kind == "capacity":
        cap = payload.get("payload") or {}
        projects = cap.get("projects") or []
        if projects:
            fieldnames = list(projects[0].keys())
            writer = csv.DictWriter(buf, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(projects)
            return buf.getvalue().encode("utf-8")

    # overview / empty capacity → flat key rows
    writer = csv.writer(buf)
    writer.writerow(["key", "value"])
    writer.writerow(["kind", kind])
    writer.writerow(["exported_on", payload.get("exported_on")])
    nested = payload.get("payload") or {}
    if isinstance(nested, dict):
        for key, value in nested.items():
            if isinstance(value, (dict, list)):
                writer.writerow([key, json.dumps(value, default=str)])
            else:
                writer.writerow([key, value])
    return buf.getvalue().encode("utf-8")


def content_disposition(kind: str, fmt: str) -> str:
    stamp = date.today().isoformat()
    return f'attachment; filename="eaim-{kind}-{stamp}.{fmt}"'
