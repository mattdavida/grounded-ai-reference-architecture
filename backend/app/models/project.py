import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class RowType(enum.StrEnum):
    PARENT = "Parent"
    SUB_PHASE = "Sub-phase"


class Project(Base):
    """A portfolio initiative (parent) or one of its sub-phases.

    Synthetic demo schema for the reference architecture. In a real deployment
    this layer is where adapters connect to existing operational systems.
    """

    __tablename__ = "projects"

    portfolio_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    parent_id: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("projects.portfolio_id"), nullable=True
    )
    row_type: Mapped[RowType] = mapped_column(
        Enum(RowType, values_callable=lambda e: [m.value for m in e])
    )
    ordinal: Mapped[int] = mapped_column(Integer, default=0)

    name: Mapped[str] = mapped_column(String(300))
    area: Mapped[str | None] = mapped_column(String(100))
    owner: Mapped[str | None] = mapped_column(String(100))

    priority: Mapped[str | None] = mapped_column(String(50))
    rag_status: Mapped[str | None] = mapped_column(String(20))
    project_status: Mapped[str | None] = mapped_column(String(50))
    risk_level: Mapped[str | None] = mapped_column(String(50))
    completion_pct: Mapped[float | None] = mapped_column(Float)

    executive_comment: Mapped[str | None] = mapped_column(Text)

    approved_budget: Mapped[float | None] = mapped_column(Float)
    projected_final_cost: Mapped[float | None] = mapped_column(Float)
    budget_spent: Mapped[float | None] = mapped_column(Float)
    budget_variance: Mapped[float | None] = mapped_column(Float)

    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_finish: Mapped[date | None] = mapped_column(Date)
    last_update: Mapped[date | None] = mapped_column(Date)

    # Capacity planning (Phase 2) — synthetic FTE demand per initiative.
    fte_demand: Mapped[float | None] = mapped_column(Float, default=0.0)
    overallocation: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0"
    )

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
