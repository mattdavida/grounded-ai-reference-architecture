"""Load synthetic project portfolio data — zero real / client data.

Usage (from backend/):
    uv run python scripts/seed_db.py
    uv run python scripts/seed_db.py --force   # wipe and reseed
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

# Allow `python scripts/seed_db.py` without setting PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select

from app.db import SessionLocal
from app.models.project import Project, RowType

# Fully synthetic demo portfolio. Names and figures are invented.
# Capacity fields: fte_demand + overallocation. A. Rivera owns two active
# initiatives so owner-load overload is visible in /capacity.
SEED_PROJECTS: list[dict] = [
    {
        "portfolio_id": "P-001",
        "name": "Payments Modernization",
        "area": "Payments",
        "owner": "A. Rivera",
        "priority": "High",
        "rag_status": "Amber",
        "project_status": "In Progress",
        "risk_level": "Medium",
        "completion_pct": 62.0,
        "approved_budget": 2_400_000,
        "projected_final_cost": 2_680_000,
        "budget_spent": 1_510_000,
        "budget_variance": 280_000,
        "executive_comment": "Vendor integration delayed; contingency in use.",
        "fte_demand": 0.8,
        "overallocation": False,
    },
    {
        "portfolio_id": "P-002",
        "name": "Customer Onboarding Rebuild",
        "area": "Digital",
        "owner": "A. Rivera",
        "priority": "High",
        "rag_status": "Green",
        "project_status": "In Progress",
        "risk_level": "Low",
        "completion_pct": 78.0,
        "approved_budget": 1_100_000,
        "projected_final_cost": 1_050_000,
        "budget_spent": 820_000,
        "budget_variance": -50_000,
        "executive_comment": "On track for Q3 release — shared owner with Payments.",
        "fte_demand": 0.6,
        "overallocation": False,
    },
    {
        "portfolio_id": "P-003",
        "name": "Core Ledger Migration",
        "area": "Core Banking",
        "owner": "M. Okonkwo",
        "priority": "Critical",
        "rag_status": "Red",
        "project_status": "Blocked",
        "risk_level": "High",
        "completion_pct": 41.0,
        "approved_budget": 5_200_000,
        "projected_final_cost": 6_100_000,
        "budget_spent": 2_900_000,
        "budget_variance": 900_000,
        "executive_comment": "Data quality gate blocked cutover; exec decision needed.",
        "fte_demand": 1.2,
        "overallocation": True,
    },
    {
        "portfolio_id": "P-004",
        "name": "Fraud Detection Uplift",
        "area": "Risk",
        "owner": "S. Patel",
        "priority": "Medium",
        "rag_status": "Green",
        "project_status": "In Progress",
        "risk_level": "Low",
        "completion_pct": 55.0,
        "approved_budget": 850_000,
        "projected_final_cost": 840_000,
        "budget_spent": 410_000,
        "budget_variance": -10_000,
        "executive_comment": "Model validation complete; rollout phased.",
        "fte_demand": 0.5,
        "overallocation": False,
    },
    {
        "portfolio_id": "P-005",
        "name": "Branch Experience Refresh",
        "area": "Channels",
        "owner": "L. Nguyen",
        "priority": "Low",
        "rag_status": "Amber",
        "project_status": "On Hold",
        "risk_level": "Medium",
        "completion_pct": 30.0,
        "approved_budget": 600_000,
        "projected_final_cost": 600_000,
        "budget_spent": 120_000,
        "budget_variance": 0,
        "executive_comment": "Paused pending budget reforecast.",
        "fte_demand": 0.3,
        "overallocation": False,
    },
    {
        "portfolio_id": "P-006",
        "name": "Regulatory Reporting Automation",
        "area": "Compliance",
        "owner": "E. Brooks",
        "priority": "High",
        "rag_status": "Green",
        "project_status": "Completed",
        "risk_level": "Low",
        "completion_pct": 100.0,
        "approved_budget": 720_000,
        "projected_final_cost": 695_000,
        "budget_spent": 695_000,
        "budget_variance": -25_000,
        "executive_comment": "Closed under budget; lessons learned filed.",
        "fte_demand": 0.4,
        "overallocation": False,
    },
]


def _add_projects(session, today: date) -> None:
    for i, row in enumerate(SEED_PROJECTS):
        session.add(
            Project(
                portfolio_id=row["portfolio_id"],
                parent_id=None,
                row_type=RowType.PARENT,
                ordinal=i,
                name=row["name"],
                area=row["area"],
                owner=row["owner"],
                priority=row["priority"],
                rag_status=row["rag_status"],
                project_status=row["project_status"],
                risk_level=row["risk_level"],
                completion_pct=row["completion_pct"],
                executive_comment=row["executive_comment"],
                approved_budget=row["approved_budget"],
                projected_final_cost=row["projected_final_cost"],
                budget_spent=row["budget_spent"],
                budget_variance=row["budget_variance"],
                planned_start=today.replace(month=1, day=15),
                planned_finish=today.replace(month=12, day=15),
                last_update=today,
                fte_demand=row["fte_demand"],
                overallocation=row["overallocation"],
                is_archived=False,
            )
        )


def _refresh_capacity_fields(session) -> int:
    """Update FTE/overallocation/owner on existing seed rows (idempotent)."""
    updated = 0
    by_id = {row["portfolio_id"]: row for row in SEED_PROJECTS}
    projects = session.scalars(select(Project)).all()
    for project in projects:
        row = by_id.get(project.portfolio_id)
        if not row:
            continue
        project.fte_demand = row["fte_demand"]
        project.overallocation = row["overallocation"]
        project.owner = row["owner"]
        project.executive_comment = row["executive_comment"]
        updated += 1
    return updated


def main() -> None:
    force = "--force" in sys.argv
    today = date.today()
    with SessionLocal() as session:
        existing = session.scalar(select(func.count()).select_from(Project)) or 0

        if existing and force:
            session.execute(delete(Project))
            session.commit()
            existing = 0
            print("Cleared existing project rows (--force).")

        if existing:
            n = _refresh_capacity_fields(session)
            session.commit()
            print(
                f"Database already has {existing} project row(s). "
                f"Refreshed capacity fields on {n} seed row(s). "
                "Use --force to wipe and reseed."
            )
            return

        _add_projects(session, today)
        session.commit()
        print(f"Seeded {len(SEED_PROJECTS)} synthetic parent projects.")


if __name__ == "__main__":
    main()
