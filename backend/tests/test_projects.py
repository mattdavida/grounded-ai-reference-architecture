from app.db import SessionLocal
from app.services.projects import (
    find_project_by_name,
    is_watchlist,
    list_projects,
)


def test_list_projects_unfiltered_returns_seeded_parents(client):
    res = client.get("/api/projects")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert len(body["items"]) == body["total"]
    assert "portfolio_id" in body["items"][0]


def test_list_projects_watchlist_filter(client):
    res = client.get("/api/projects", params={"watchlist": True})
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    with SessionLocal() as session:
        rows = list_projects(session, watchlist=True)
    assert body["total"] == len(rows)
    assert all(is_watchlist(p) for p in rows)


def test_list_projects_rag_and_area_filters(client):
    res = client.get("/api/projects", params={"rag": "Amber"})
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert (item["rag_status"] or "").lower() == "amber"


def test_list_projects_kpi_blocked_filter(client):
    res = client.get("/api/projects", params={"filter": "blockedOnHold"})
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert (item["project_status"] or "").lower() in {"blocked", "on hold"}


def test_get_project_detail(client):
    listing = client.get("/api/projects").json()
    pid = listing["items"][0]["portfolio_id"]
    res = client.get(f"/api/projects/{pid}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["portfolio_id"] == pid
    assert "executive_comment" in detail
    assert "planned_start" in detail


def test_get_project_404(client):
    res = client.get("/api/projects/does-not-exist")
    assert res.status_code == 404


def test_find_project_by_name_partial():
    with SessionLocal() as session:
        project = find_project_by_name(session, "Core Ledger")
    assert project is not None
    assert "ledger" in project.name.lower()
