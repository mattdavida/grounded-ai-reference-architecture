"""Speech Services router — server-side token exchange."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.speech import get_speech_token

router = APIRouter(prefix="/api/speech", tags=["speech"])


class SpeechTokenResponse(BaseModel):
    token: str
    region: str


@router.get("/token", response_model=SpeechTokenResponse)
async def speech_token() -> SpeechTokenResponse:
    """Exchange the server-side Speech API key for a 10-minute browser token."""
    result = await get_speech_token()
    return SpeechTokenResponse(**result)
