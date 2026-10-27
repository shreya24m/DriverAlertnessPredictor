"""Unit tests for face_landmarks service using synthetic landmark data."""

import pytest
from app.services.face_landmarks import (
    LandmarkPoint,
    FaceLandmarks,
    validate_landmarks,
    generate_synthetic_landmarks,
    LEFT_EYE_LANDMARKS,
    RIGHT_EYE_LANDMARKS,
    MOUTH_LANDMARKS,
    LEFT_IRIS_CENTER,
    RIGHT_IRIS_CENTER,
    TOTAL_BASE_LANDMARKS,
    TOTAL_EXTENDED_LANDMARKS,
)


def test_synthetic_landmarks_generation_default() -> None:
    """Ensure synthetic generator creates valid 478 landmarks."""
    face = generate_synthetic_landmarks(eye_openness=1.0, mouth_openness=0.0)
    assert face.count == TOTAL_EXTENDED_LANDMARKS
    assert validate_landmarks(face.landmarks) is True


def test_synthetic_landmarks_indices_and_points() -> None:
    """Verify that landmark indices resolve to valid coordinates."""
    face = generate_synthetic_landmarks(eye_openness=0.8, mouth_openness=0.2)

    # Check eye landmark existence and symmetry
    p1_l = face.get_point(LEFT_EYE_LANDMARKS[0])
    p4_l = face.get_point(LEFT_EYE_LANDMARKS[3])
    assert p1_l is not None and p4_l is not None
    assert p1_l.x < p4_l.x  # Left eye outer corner is to the left of inner corner

    p1_r = face.get_point(RIGHT_EYE_LANDMARKS[0])
    p4_r = face.get_point(RIGHT_EYE_LANDMARKS[3])
    assert p1_r is not None and p4_r is not None
    assert p1_r.x < p4_r.x

    # Check iris landmarks
    assert face.get_point(LEFT_IRIS_CENTER) is not None
    assert face.get_point(RIGHT_IRIS_CENTER) is not None


def test_synthetic_landmarks_openness_scaling() -> None:
    """Verify eye openness correctly modulates vertical eye distances."""
    open_face = generate_synthetic_landmarks(eye_openness=1.0)
    closed_face = generate_synthetic_landmarks(eye_openness=0.0)

    p2_l_open = open_face.get_point(LEFT_EYE_LANDMARKS[1])
    p6_l_open = open_face.get_point(LEFT_EYE_LANDMARKS[5])
    p2_l_closed = closed_face.get_point(LEFT_EYE_LANDMARKS[1])
    p6_l_closed = closed_face.get_point(LEFT_EYE_LANDMARKS[5])

    assert p2_l_open is not None and p6_l_open is not None
    assert p2_l_closed is not None and p6_l_closed is not None

    open_dist = abs(p6_l_open.y - p2_l_open.y)
    closed_dist = abs(p6_l_closed.y - p2_l_closed.y)
    assert open_dist > closed_dist


def test_validate_landmarks_rejects_insufficient_or_corrupt_points() -> None:
    """Verify validator flags short arrays or out of bound values."""
    # Too few landmarks
    short_list = [LandmarkPoint(x=0.5, y=0.5) for _ in range(100)]
    assert validate_landmarks(short_list) is False

    # Out of bounds coordinates
    corrupt = generate_synthetic_landmarks().landmarks
    corrupt[LEFT_EYE_LANDMARKS[0]] = LandmarkPoint(x=5.0, y=99.0)
    assert validate_landmarks(corrupt) is False
