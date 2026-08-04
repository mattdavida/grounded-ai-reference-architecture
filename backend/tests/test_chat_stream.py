from app.services.voice_chat.stream import format_sse


def test_format_sse_frame():
    frame = format_sse("token", {"text": "Hello"})
    assert frame.startswith("event: token\n")
    assert 'data: {"text": "Hello"}' in frame
    assert frame.endswith("\n\n")


def test_chat_stream_rejects_empty_message(client):
    res = client.post("/api/chat/stream", json={"message": "   "})
    assert res.status_code == 400


def test_chat_stream_requires_openai_or_streams(client, monkeypatch):
    from app.config import settings

    # When keys are missing → 503; when present → SSE content-type.
    if not settings.azure_openai_api_key or not settings.azure_openai_endpoint:
        res = client.post("/api/chat/stream", json={"message": "Which projects are blocked?"})
        assert res.status_code == 503
        return

    res = client.post("/api/chat/stream", json={"message": "Say hi in one word."})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")
    body = res.text
    assert "event: meta" in body
    assert "event: done" in body or "event: error" in body
