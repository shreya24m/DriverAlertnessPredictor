"""Unit tests for PDF report generation and download endpoint."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_pdf_report_download() -> None:
    """Ensure /reports/{session_id} generates valid PDF document bytes."""
    # 1. Create a session
    payload = {
        "duration_sec": 300,
        "avg_ear": 0.272,
        "avg_mar": 0.185,
        "peak_risk": 65,
        "total_blinks": 60,
        "blink_rate_per_min": 12.0,
        "total_yawns": 2,
        "drowsy_events_count": 2,
        "alarm_events_count": 1,
        "events": [
            {
                "timestamp_sec": 120.5,
                "event_type": "yawn",
                "risk_score": 40,
                "details": "Sustained yawn detected",
            },
            {
                "timestamp_sec": 240.0,
                "event_type": "alarm_alert",
                "risk_score": 65,
                "details": "Alert audio played",
            },
        ],
    }
    create_res = client.post("/api/v1/sessions", json=payload)
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 2. Download report PDF
    report_res = client.get(f"/api/v1/reports/{session_id}")
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in report_res.headers["content-disposition"]
    # PDF starts with %PDF-
    assert report_res.content.startswith(b"%PDF-")
    assert len(report_res.content) > 1000

    # 3. Clean up session
    client.delete(f"/api/v1/sessions/{session_id}")
