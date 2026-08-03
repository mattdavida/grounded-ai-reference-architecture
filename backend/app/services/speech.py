"""
Azure Speech Services token exchange.

The Speech API key is a long-lived credential that must never reach the browser.
This service exchanges it for a short-lived (10-minute) access token that the
Azure Speech SDK can use client-side.
"""

import logging

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)


async def get_speech_token() -> dict[str, str]:
    """Exchange the server-side Speech API key for a 10-minute access token."""
    if not settings.azure_speech_api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Azure Speech Services is not configured. "
                "Set AZURE_SPEECH_API_KEY and AZURE_SPEECH_REGION in .env "
                "and restart the server. Run .\\infra\\deploy.ps1 to provision the resource."
            ),
        )

    sts_url = (
        f"https://{settings.azure_speech_region}"
        ".api.cognitive.microsoft.com/sts/v1.0/issueToken"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                sts_url,
                headers={"Ocp-Apim-Subscription-Key": settings.azure_speech_api_key},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Azure Speech STS returned {exc.response.status_code}. "
                "Check that AZURE_SPEECH_API_KEY is valid and the resource is active."
            ),
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Azure Speech STS endpoint: {exc}",
        ) from exc

    return {"token": response.text, "region": settings.azure_speech_region}


async def speech_health() -> dict[str, str]:
    """Check Speech Services config/reachability for /api/health (no token issued)."""
    if not settings.azure_speech_api_key:
        return {"status": "unconfigured", "detail": "AZURE_SPEECH_API_KEY not set"}

    sts_url = (
        f"https://{settings.azure_speech_region}"
        ".api.cognitive.microsoft.com/sts/v1.0/issueToken"
    )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.head(sts_url)
        return {"status": "ok"}
    except httpx.RequestError as exc:
        logger.warning("Speech health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}
