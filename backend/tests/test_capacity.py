from app.db import SessionLocal
from app.services.capacity import OWNER_CAPACITY_FTE, compute_capacity


def test_capacity_endpoint(client):
    res = client.get("/api/capacity")
    assert res.status_code == 200
    body = res.json()
    assert "kpis" in body
    assert "by_owner" in body
    assert "by_area" in body
    assert "projects" in body
    assert body["kpis"]["owner_capacity_fte"] == OWNER_CAPACITY_FTE
    assert body["kpis"]["active_projects"] >= 1


def test_compute_capacity_marks_overloaded_owners():
    with SessionLocal() as session:
        data = compute_capacity(session)

    overloaded = [r for r in data.by_owner if r.overloaded]
    assert len(overloaded) >= 1
    # A. Rivera owns two active initiatives in refreshed seed (1.4 FTE).
    rivera = next((r for r in data.by_owner if r.owner == "A. Rivera"), None)
    if rivera is not None:
        assert rivera.overloaded is True
        assert rivera.fte_demand > OWNER_CAPACITY_FTE


def test_capacity_excludes_completed_from_active_kpis():
    with SessionLocal() as session:
        data = compute_capacity(session)
    ids = {p.portfolio_id for p in data.projects}
    assert "P-006" not in ids  # completed regulatory reporting
