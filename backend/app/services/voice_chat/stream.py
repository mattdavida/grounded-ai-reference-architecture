"""SSE helpers for streaming grounded chat tokens from LangGraph."""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage

from app.services.voice_chat.graph import get_chat_graph


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Encode one Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _chunk_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text") or ""))
        return "".join(parts)
    return str(content)


def iter_chat_sse(
    *,
    message: str,
    session_id: str,
    portfolio_context: str,
    data_version: str,
) -> Iterator[str]:
    """Yield SSE frames: meta → (status|token)* → done | error."""
    yield format_sse(
        "meta",
        {"session_id": session_id, "data_version": data_version},
    )

    graph = get_chat_graph()
    config = {"configurable": {"thread_id": session_id}}
    inputs = {
        "messages": [HumanMessage(content=message)],
        "portfolio_context": portfolio_context,
        "data_version": data_version,
        "answer": "",
    }

    pieces: list[str] = []
    try:
        for mode, payload in graph.stream(
            inputs,
            config=config,
            stream_mode=["messages", "updates"],
        ):
            if mode == "updates" and isinstance(payload, dict):
                if "tools" in payload:
                    yield format_sse(
                        "status",
                        {"message": "Looking up portfolio data…"},
                    )
                continue

            if mode != "messages":
                continue

            chunk, metadata = payload
            if metadata.get("langgraph_node") != "response":
                continue
            if not isinstance(chunk, AIMessageChunk):
                # Some versions yield AIMessage on the last packet — still take text.
                text = _chunk_text(getattr(chunk, "content", None))
            else:
                text = _chunk_text(chunk.content)
            if not text:
                continue
            pieces.append(text)
            yield format_sse("token", {"text": text})

        answer = "".join(pieces)
        if not answer:
            # Fallback: final checkpoint state (e.g. provider returned a single AIMessage).
            state = graph.get_state(config)
            values = state.values if state else {}
            answer = (values or {}).get("answer") or ""

        yield format_sse(
            "done",
            {
                "answer": answer,
                "session_id": session_id,
                "data_version": data_version,
            },
        )
    except Exception as exc:  # noqa: BLE001 — surface to client as SSE error frame
        yield format_sse("error", {"message": str(exc)})
