from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_when_the_model_is_not_loaded():
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["modelLoaded"] is False
    assert "not loaded" in body["error"]
    assert "fluorescence" in body["modelDomain"]


def test_analyze_does_not_invent_detections_when_the_model_is_unavailable():
    with TestClient(app) as client:
        response = client.post("/api/analyze", files={"file": ("field.png", b"not-an-image", "image/png")})
    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"]


def test_evaluation_is_absent_until_the_script_has_written_a_report(tmp_path, monkeypatch):
    monkeypatch.setattr("app.main.REPORT_PATH", tmp_path / "missing.json")
    with TestClient(app) as client:
        response = client.get("/api/evaluation")
    assert response.status_code == 404
    assert "evaluate.py" in response.json()["detail"]
