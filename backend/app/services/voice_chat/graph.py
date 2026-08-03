"""LangGraph chat pipeline for the grounded portfolio assistant.

Graph topology (single node for POC):

  START → response_node → END

response_node receives full portfolio context (pre-fetched by the router)
via state and uses AzureChatOpenAI to generate a cited, factual answer.

SQLite checkpointer persists conversation history across turns.
Phase 4: bind get_portfolio_tools() and insert a ToolNode before END.
"""

from __future__ import annotations

import logging
import sqlite3

from langchain_core.messages import SystemMessage
from langchain_openai import AzureChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from app.config import settings
from app.services.voice_chat.state import ChatState
from app.services.voice_chat.tools import tools_enabled

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a portfolio assistant for an enterprise PMO reference dashboard. \
Your job is to answer questions about the project portfolio using ONLY the \
data provided below.

Rules:
- Be concise, accurate, and factual.
- When listing projects, use bullet points with the project name and relevant details.
- If the question cannot be answered from the provided data, say so clearly — \
  do NOT invent project names, numbers, or statuses.
- Currency figures are in USD unless stated otherwise.
- Always end your response with a citation line:
    Source: {data_version}

PORTFOLIO DATA ({data_version}):
{portfolio_context}"""


def response_node(state: ChatState) -> dict:
    """Single LLM node: generate a grounded, cited answer from portfolio context."""
    llm = AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_deployment=settings.azure_openai_chat_deployment,
        temperature=0.2,
        max_tokens=600,
    )

    # Phase 4 hook — keep unused until ToolNode is added.
    if tools_enabled():
        from app.services.voice_chat.tools import get_portfolio_tools

        llm = llm.bind_tools(get_portfolio_tools())

    system_content = _SYSTEM_PROMPT.format(
        data_version=state["data_version"],
        portfolio_context=state["portfolio_context"],
    )

    all_messages = [SystemMessage(content=system_content)] + list(state["messages"])
    response = llm.invoke(all_messages)

    return {
        "answer": response.content,
        "messages": [response],
    }


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
        builder.add_edge("response", END)

        _graph = builder.compile(checkpointer=checkpointer)
        logger.info("Chat graph compiled (checkpoints_db=%s)", settings.checkpoints_db)

    return _graph
