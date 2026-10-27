"""Unit tests for yawn_detection service using synthetic landmark data."""

import pytest
from app.services.face_landmarks import generate_synthetic_landmarks
from app.services.yawn_detection import calculate_mar, YawnDetector


def test_calculate_mar_closed_vs_open() -> None:
    """MAR should be significantly higher when mouth is open than closed."""
    closed_face = generate_synthetic_landmarks(mouth_openness=0.0)
    open_face = generate_synthetic_landmarks(mouth_openness=1.0)

    closed_mar = calculate_mar(closed_face.landmarks)
    open_mar = calculate_mar(open_face.landmarks)

    assert closed_mar < 0.20
    assert open_mar > 0.60
    assert open_mar > closed_mar


def test_calculate_mar_handles_empty_or_degenerate_input() -> None:
    """calculate_mar should safely return 0.0 on malformed input."""
    assert calculate_mar([]) == 0.0


def test_talking_is_not_counted_as_yawn() -> None:
    """Natural talking (short mouth openings < 1.5s) must NEVER trigger a yawn."""
    detector = YawnDetector(mar_threshold=0.60, yawn_duration_sec=1.5)

    closed_face = generate_synthetic_landmarks(mouth_openness=0.0)
    open_face = generate_synthetic_landmarks(mouth_openness=1.0)

    t = 0.0
    # Simulate speaking 4 syllables over 2 seconds:
    # Syllable 1: open for 0.3s, closed for 0.2s
    detector.process_frame(open_face.landmarks, timestamp=t); t += 0.3
    detector.process_frame(closed_face.landmarks, timestamp=t); t += 0.2

    # Syllable 2: open for 0.5s, closed for 0.2s
    detector.process_frame(open_face.landmarks, timestamp=t); t += 0.5
    detector.process_frame(closed_face.landmarks, timestamp=t); t += 0.2

    # Syllable 3: open for 0.8s (talking/shouting, but <1.5s!), closed for 0.3s
    detector.process_frame(open_face.landmarks, timestamp=t); t += 0.8
    r = detector.process_frame(closed_face.landmarks, timestamp=t); t += 0.3

    assert r.yawn_count == 0
    assert not r.is_yawning


def test_real_yawn_counted_once() -> None:
    """A genuine sustained yawn (> 1.5s) must be counted exactly once."""
    detector = YawnDetector(mar_threshold=0.60, yawn_duration_sec=1.5)

    closed_face = generate_synthetic_landmarks(mouth_openness=0.0)
    yawning_face = generate_synthetic_landmarks(mouth_openness=1.0)

    # Frame 0: Mouth closed
    r0 = detector.process_frame(closed_face.landmarks, timestamp=10.0)
    assert r0.yawn_count == 0
    assert not r0.is_yawning

    # Mouth opens at t=11.0s
    detector.process_frame(yawning_face.landmarks, timestamp=11.0)

    # At t=12.0s (1.0s elapsed, <1.5s threshold) -> not yet counted
    r1 = detector.process_frame(yawning_face.landmarks, timestamp=12.0)
    assert r1.yawn_count == 0
    assert not r1.is_yawning
    assert round(r1.open_duration_sec, 1) == 1.0

    # At t=12.6s (1.6s elapsed, >1.5s threshold) -> Exactly 1 yawn confirmed!
    r2 = detector.process_frame(yawning_face.landmarks, timestamp=12.6)
    assert r2.yawn_count == 1
    assert r2.is_yawning

    # At t=13.5s (2.5s elapsed, still yawning) -> Must NOT count again
    r3 = detector.process_frame(yawning_face.landmarks, timestamp=13.5)
    assert r3.yawn_count == 1
    assert r3.is_yawning

    # Mouth closes at t=14.0s -> Yawn finished, count remains 1
    r4 = detector.process_frame(closed_face.landmarks, timestamp=14.0)
    assert r4.yawn_count == 1
    assert not r4.is_yawning


def test_multiple_consecutive_yawns() -> None:
    """Consecutive distinct yawns separated by mouth closures should each be counted."""
    detector = YawnDetector(mar_threshold=0.60, yawn_duration_sec=1.5)

    closed_face = generate_synthetic_landmarks(mouth_openness=0.0)
    yawning_face = generate_synthetic_landmarks(mouth_openness=1.0)

    # Yawn 1: opens t=1.0, reaches 1.8s at t=2.8
    detector.process_frame(yawning_face.landmarks, timestamp=1.0)
    r_yawn1 = detector.process_frame(yawning_face.landmarks, timestamp=2.8)
    assert r_yawn1.yawn_count == 1

    # Closes at t=3.5
    detector.process_frame(closed_face.landmarks, timestamp=3.5)

    # Yawn 2: opens t=5.0, reaches 1.7s at t=6.7
    detector.process_frame(yawning_face.landmarks, timestamp=5.0)
    r_yawn2 = detector.process_frame(yawning_face.landmarks, timestamp=6.7)
    assert r_yawn2.yawn_count == 2
