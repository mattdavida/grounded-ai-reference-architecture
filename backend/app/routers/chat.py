"""Chat router — POST /api/chat.

Accepts a user message and optional session_id, runs the LangGraph pipeline
against live portfolio data, and returns a cited natural-language answer.

The route is a sync `def` (not async) so FastAPI dispatches it to a thread-pool
worker, which is required for LangGraph's synchronous `graph.invoke()` call.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_session
from app.services.voice_chat.context import build_portfolio_context
from app.services.voice_chat.graph import get_chat_graph

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    data_version: str
    session_id: str


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    """Run one turn of the grounded portfolio chat pipeline.

    - `session_id` optional: omit to start a new conversation; reuse for follow-ups.
    - Portfolio context is rebuilt fresh every request (no stale numbers).
    """
    if not settings.azure_openai_api_key or not settings.azure_openai_endpoint:
        raise HTTPException(
            status_code=503,
            detail=(
                "Azure OpenAI is not configured. "
                "Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in backend/.env. "
                "Run .\\infra\\deploy.ps1 to provision resources."
            ),
        )

    if not (body.message or "").strip():
        raise HTTPException(status_code=400, detail="message must not be empty.")

    session_id = body.session_id or str(uuid.uuid4())
    portfolio_context, data_version = build_portfolio_context(session)

    graph = get_chat_graph()
    result = graph.invoke(
        {
            "messages": [HumanMessage(content=body.message.strip())],
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
