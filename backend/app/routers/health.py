from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_session
from app.services.speech import speech_health

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    database: str
    speech: str


@router.get("/api/health", response_model=HealthResponse)
async def health(session: Session = Depends(get_session)) -> HealthResponse:
    session.execute(text("SELECT 1"))
    speech_status = await speech_health()
    return HealthResponse(
        status="ok",
        database="ok",
        speech=speech_status["status"],
    )
