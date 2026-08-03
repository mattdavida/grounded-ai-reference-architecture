"""Dashboard overview stub — thin wrapper over compute_overview()."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.schemas.dashboard import OverviewResponse
from app.services.dashboard import compute_overview

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=OverviewResponse)
def overview(session: Session = Depends(get_session)) -> OverviewResponse:
    """Return precomputed portfolio KPIs for the Overview tab and LLM context."""
    return compute_overview(session)
