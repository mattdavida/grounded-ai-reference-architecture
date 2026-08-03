"""Load synthetic project portfolio data — zero real / client data.

Usage (from backend/):
    uv run python scripts/seed_db.py
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

# Allow `python scripts/seed_db.py` without setting PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models.project import Project, RowType

# Fully synthetic demo portfolio. Names and figures are invented.
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
    },
    {
        "portfolio_id": "P-002",
        "name": "Customer Onboarding Rebuild",
        "area": "Digital",
        "owner": "J. Chen",
        "priority": "High",
        "rag_status": "Green",
        "project_status": "In Progress",
        "risk_level": "Low",
        "completion_pct": 78.0,
        "approved_budget": 1_100_000,
        "projected_final_cost": 1_050_000,
        "budget_spent": 820_000,
        "budget_variance": -50_000,
        "executive_comment": "On track for Q3 release.",
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
    },
]


def main() -> None:
    today = date.today()
    with SessionLocal() as session:
        existing = session.scalar(select(func.count()).select_from(Project)) or 0
        if existing:
            print(f"Database already has {existing} project row(s). Skipping seed.")
            return

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
                    is_archived=False,
                )
            )
        session.commit()
        print(f"Seeded {len(SEED_PROJECTS)} synthetic parent projects.")


if __name__ == "__main__":
    main()
