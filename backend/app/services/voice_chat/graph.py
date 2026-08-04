"""LangGraph chat pipeline for the grounded portfolio assistant.

Graph topology:

  START → response_node ⇄ ToolNode → END

response_node receives full portfolio context (pre-fetched by the router)
via state and uses AzureChatOpenAI to generate a cited, factual answer.
When tools are enabled, the model may call portfolio tools; ToolNode runs
them and loops back to response_node until a final answer.

SQLite checkpointer persists conversation history across turns.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Literal

from langchain_core.messages import SystemMessage
from langchain_openai import AzureChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from app.config import settings
from app.services.voice_chat.state import ChatState
from app.services.voice_chat.tools import get_portfolio_tools, tools_enabled

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a portfolio assistant for an enterprise PMO reference dashboard. \
Your job is to answer questions about the project portfolio using ONLY the \
data provided below and, when available, tool results from portfolio tools.

Rules:
- Be concise, accurate, and factual.
- When listing projects, use bullet points with the project name and relevant details.
- If the question cannot be answered from the provided data or tool results, \
  say so clearly — do NOT invent project names, numbers, or statuses.
- Currency figures are in USD unless stated otherwise.
- Prefer tools for drill-down (specific project, area filter, watchlist) when \
  the injected portfolio snapshot is insufficient.
- Always end your final response with a citation line:
    Source: {data_version}

PORTFOLIO DATA ({data_version}):
{portfolio_context}"""


def _build_llm(bind: bool):
    llm = AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_deployment=settings.azure_openai_chat_deployment,
        temperature=0.2,
        max_tokens=800,
    )
    if bind and tools_enabled():
        llm = llm.bind_tools(get_portfolio_tools())
    return llm


def response_node(state: ChatState) -> dict:
    """LLM node: grounded answer, optionally with tool calls."""
    llm = _build_llm(bind=True)

    system_content = _SYSTEM_PROMPT.format(
        data_version=state["data_version"],
        portfolio_context=state["portfolio_context"],
    )

    all_messages = [SystemMessage(content=system_content)] + list(state["messages"])
    response = llm.invoke(all_messages)

    update: dict = {"messages": [response]}
    tool_calls = getattr(response, "tool_calls", None) or []
    if not tool_calls:
        update["answer"] = response.content or ""
    return update


def _route_after_response(state: ChatState) -> Literal["tools", "__end__"]:
    messages = state.get("messages") or []
    if not messages:
        return END
    last = messages[-1]
    tool_calls = getattr(last, "tool_calls", None) or []
    if tool_calls and tools_enabled():
        return "tools"
    return END


# ── Lazy singleton ────────────────────────────────────────────────────────────
# Graph + SQLite checkpointer created once on first use.
# check_same_thread=False: FastAPI sync routes run on a threadpool.

_graph = None


def get_chat_graph():
    global _graph
    if _graph is None:
        conn = sqlite3.connect(settings.checkpoints_db, check_same_thread=False)
        checkpointer = SqliteSaver(conn)

        builder: StateGraph = StateGraph(ChatState)
        builder.add_node("response", response_node)
        builder.add_edge(START, "response")

        if tools_enabled():
            tools = get_portfolio_tools()
            builder.add_node("tools", ToolNode(tools))
            builder.add_conditional_edges(
                "response",
                _route_after_response,
                {"tools": "tools", END: END},
            )
            builder.add_edge("tools", "response")
        else:
            builder.add_edge("response", END)

        _graph = builder.compile(checkpointer=checkpointer)
        logger.info(
            "Chat graph compiled (checkpoints_db=%s, tools=%s)",
            settings.checkpoints_db,
            tools_enabled(),
        )

    return _graph


def reset_chat_graph() -> None:
    """Test helper — drop the singleton so the next get_chat_graph() rebuilds."""
    global _graph
    _graph = None
