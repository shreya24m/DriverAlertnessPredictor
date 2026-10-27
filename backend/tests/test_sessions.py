"""Unit tests for driving session CRUD and event timeline logging."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_session_lifecycle() -> None:
    """Test creating, listing, getting, and deleting a driving vigilance session."""
    # 1. Create a session with timeline events
    session_payload = {
        "duration_sec": 120,
        "avg_ear": 0.285,
        "avg_mar": 0.162,
        "peak_risk": 42,
        "total_blinks": 28,
        "blink_rate_per_min": 14.0,
        "total_yawns": 1,
        "drowsy_events_count": 1,
        "alarm_events_count": 1,
        "events": [
            {
                "timestamp_sec": 45.2,
                "event_type": "yawn",
                "risk_score": 30,
                "details": "Yawn sustained for 1.8s",
            },
            {
                "timestamp_sec": 82.0,
                "event_type": "alarm_warning",
                "risk_score": 42,
                "details": "Warning banner triggered",
            },
        ],
    }

    create_res = client.post("/api/v1/sessions", json=session_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    session_id = created_data["id"]
    assert created_data["duration_sec"] == 120
    assert created_data["peak_risk"] == 42
    assert len(created_data["events"]) == 2

    # 2. List sessions
    list_res = client.get("/api/v1/sessions")
    assert list_res.status_code == 200
    sessions_list = list_res.json()
    assert any(s["id"] == session_id for s in sessions_list)

    # 3. Get single session by ID
    get_res = client.get(f"/api/v1/sessions/{session_id}")
    assert get_res.status_code == 200
    session_detail = get_res.json()
    assert session_detail["id"] == session_id
    assert len(session_detail["events"]) == 2
    assert session_detail["events"][0]["event_type"] == "yawn"

    # 4. Delete session
    del_res = client.delete(f"/api/v1/sessions/{session_id}")
    assert del_res.status_code == 204

    # 5. Verify deleted
    get_deleted = client.get(f"/api/v1/sessions/{session_id}")
    assert get_deleted.status_code == 404
