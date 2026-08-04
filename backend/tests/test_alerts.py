from app.db import SessionLocal
from app.services.alerts import compute_alerts


def test_alerts_endpoint(client):
    res = client.get("/api/alerts")
    assert res.status_code == 200
    body = res.json()
    assert "alerts" in body
    assert "data_version" in body
    assert body["count"] == len(body["alerts"])
    if body["alerts"]:
        first = body["alerts"][0]
        assert "href" in first
        assert first["severity"] in {"critical", "warning", "info"}


def test_compute_alerts_includes_seed_signals():
    with SessionLocal() as session:
        data = compute_alerts(session)
    kinds = {a.kind for a in data.alerts}
    # Seeded portfolio has watchlist / capacity pressure.
    assert kinds & {"watchlist", "blocked", "red_rag", "overloaded_owners"}
