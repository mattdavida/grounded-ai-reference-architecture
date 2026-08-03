"""LangGraph state for the portfolio voice chat pipeline."""

from __future__ import annotations

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class ChatState(TypedDict):
    messages: Annotated[list, add_messages]  # conversation history (reduced across turns)
    portfolio_context: str  # pre-formatted portfolio data for the system prompt
    data_version: str  # e.g. "Dashboard data 2026-08-03" — used for citations
    answer: str  # final answer string extracted from the AI message
