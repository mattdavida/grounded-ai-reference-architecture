"""Chat router — POST /api/chat and SSE POST /api/chat/stream.

Accepts a user message and optional session_id, runs the LangGraph pipeline
against live portfolio data, and returns a cited natural-language answer.

The sync routes use FastAPI's thread-pool so LangGraph's synchronous
`invoke()` / `stream()` calls do not block the event loop.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_session
from app.services.voice_chat.context import build_portfolio_context
from app.services.voice_chat.graph import get_chat_graph
from app.services.voice_chat.stream import iter_chat_sse

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    data_version: str
    session_id: str


def _require_openai() -> None:
    if not settings.azure_openai_api_key or not settings.azure_openai_endpoint:
        raise HTTPException(
            status_code=503,
            detail=(
                "Azure OpenAI is not configured. "
                "Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in backend/.env. "
                "Run .\\infra\\deploy.ps1 to provision resources."
            ),
        )


def _require_message(message: str) -> str:
    text = (message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message must not be empty.")
    return text


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    """Non-streaming turn — kept for curl/smoke and simple clients."""
    _require_openai()
    text = _require_message(body.message)

    session_id = body.session_id or str(uuid.uuid4())
    portfolio_context, data_version = build_portfolio_context(session)

    graph = get_chat_graph()
    result = graph.invoke(
        {
            "messages": [HumanMessage(content=text)],
            "portfolio_context": portfolio_context,
            "data_version": data_version,
            "answer": "",
        },
        config={"configurable": {"thread_id": session_id}},
    )

    return ChatResponse(
        answer=result["answer"],
        data_version=data_version,
        session_id=session_id,
    )


@router.post("/stream")
def chat_stream(body: ChatRequest, session: Session = Depends(get_session)) -> StreamingResponse:
    """SSE stream: meta → status?/token* → done (or error)."""
    _require_openai()
    text = _require_message(body.message)

    session_id = body.session_id or str(uuid.uuid4())
    portfolio_context, data_version = build_portfolio_context(session)

    def event_source():
        yield from iter_chat_sse(
            message=text,
            session_id=session_id,
            portfolio_context=portfolio_context,
            data_version=data_version,
        )

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
