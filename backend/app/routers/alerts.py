"""Proactive portfolio alerts API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.schemas.alerts import AlertsResponse
from app.services.alerts import compute_alerts

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertsResponse)
def get_alerts(session: Session = Depends(get_session)) -> AlertsResponse:
    """Return grounded attention signals for the UI banner."""
    return compute_alerts(session)
