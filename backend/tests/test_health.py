"""Unit tests for FastAPI root and health endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_returns_200() -> None:
    """Verify that /health returns HTTP 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "DriveAware AI"
    assert "version" in data
    assert "environment" in data


def test_root_endpoint_returns_200() -> None:
    """Verify that / returns service overview and online status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["health"] == "/health"
    assert data["docs"] == "/docs"


def test_thresholds_endpoint_returns_configured_values() -> None:
    """Verify that centralized thresholds endpoint is available and exposes EAR/MAR."""
    response = client.get("/api/v1/config/thresholds")
    assert response.status_code == 200
    data = response.json()
    assert "ear_threshold" in data
    assert "mar_threshold" in data
    assert "perclos_window_sec" in data
    assert "alarm_levels" in data
    assert data["ear_threshold"] == 0.21
    assert data["mar_threshold"] == 0.60
