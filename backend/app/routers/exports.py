"""Export API — download grounded portfolio packs as JSON or CSV."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_session
from app.services.exports import (
    EXPORT_KINDS,
    build_export_payload,
    content_disposition,
    to_csv_bytes,
    to_json_bytes,
)

router = APIRouter(prefix="/api/exports", tags=["exports"])


@router.get("")
def list_export_kinds() -> dict:
    return {
        "kinds": sorted(EXPORT_KINDS),
        "formats": ["json", "csv"],
        "endpoints": [
            "/api/exports/{kind}?format=json",
            "/api/exports/{kind}?format=csv",
        ],
    }


@router.get("/{kind}")
def download_export(
    kind: str,
    session: Session = Depends(get_session),
    format: str = Query(default="json", pattern="^(json|csv)$"),
) -> Response:
    if kind not in EXPORT_KINDS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown export kind {kind!r}. Choose from {sorted(EXPORT_KINDS)}.",
        )
    try:
        payload = build_export_payload(session, kind)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if format == "csv":
        body = to_csv_bytes(payload)
        media = "text/csv; charset=utf-8"
    else:
        body = to_json_bytes(payload)
        media = "application/json; charset=utf-8"

    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": content_disposition(kind, format)},
    )
