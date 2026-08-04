"""Capacity planning API — deterministic owner/area load rollups."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.schemas.capacity import CapacityResponse
from app.services.capacity import compute_capacity

router = APIRouter(prefix="/api/capacity", tags=["capacity"])


@router.get("", response_model=CapacityResponse)
def get_capacity(session: Session = Depends(get_session)) -> CapacityResponse:
    """Return owner/area load KPIs derived from active parent initiatives."""
    return compute_capacity(session)
