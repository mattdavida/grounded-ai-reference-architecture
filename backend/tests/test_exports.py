def test_list_export_kinds(client):
    res = client.get("/api/exports")
    assert res.status_code == 200
    body = res.json()
    assert "projects" in body["kinds"]
    assert "json" in body["formats"]


def test_export_projects_json(client):
    res = client.get("/api/exports/projects", params={"format": "json"})
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")
    body = res.json()
    assert body["kind"] == "projects"
    assert len(body["items"]) >= 1


def test_export_capacity_csv(client):
    res = client.get("/api/exports/capacity", params={"format": "csv"})
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    text = res.text
    assert "portfolio_id" in text or "kind" in text


def test_export_unknown_kind(client):
    res = client.get("/api/exports/not-a-kind")
    assert res.status_code == 404
