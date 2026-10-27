"""Unit tests for eye_analysis service using synthetic landmark data."""

import pytest
from app.services.face_landmarks import (
    generate_synthetic_landmarks,
    LEFT_EYE_LANDMARKS,
    RIGHT_EYE_LANDMARKS,
)
from app.services.eye_analysis import (
    calculate_ear,
    EyeAnalyzer,
)


def test_calculate_ear_open_vs_closed() -> None:
    """EAR should be significantly higher when eyes are open than closed."""
    open_face = generate_synthetic_landmarks(eye_openness=1.0)
    closed_face = generate_synthetic_landmarks(eye_openness=0.0)

    open_ear_left = calculate_ear(open_face.landmarks, LEFT_EYE_LANDMARKS)
    open_ear_right = calculate_ear(open_face.landmarks, RIGHT_EYE_LANDMARKS)
    closed_ear_left = calculate_ear(closed_face.landmarks, LEFT_EYE_LANDMARKS)
    closed_ear_right = calculate_ear(closed_face.landmarks, RIGHT_EYE_LANDMARKS)

    assert open_ear_left > 0.25
    assert open_ear_right > 0.25
    assert closed_ear_left < 0.10
    assert closed_ear_right < 0.10
    assert open_ear_left > closed_ear_left
    assert open_ear_right > closed_ear_right


def test_calculate_ear_handles_empty_or_degenerate_input() -> None:
    """calculate_ear should safely return 0.0 on malformed input."""
    assert calculate_ear([], LEFT_EYE_LANDMARKS) == 0.0


def test_eye_analyzer_blink_counting() -> None:
    """EyeAnalyzer should register a blink after 3 closed frames followed by open."""
    analyzer = EyeAnalyzer(
        ear_threshold=0.21,
        blink_min_frames=2,
        blink_max_frames=6,
    )

    open_face = generate_synthetic_landmarks(eye_openness=1.0)
    closed_face = generate_synthetic_landmarks(eye_openness=0.0)

    # Frame 0: Open
    r = analyzer.process_frame(open_face.landmarks, timestamp=0.0)
    assert r.blink_count == 0
    assert not r.is_closed

    # Frame 1..3: Closed (3 frames)
    analyzer.process_frame(closed_face.landmarks, timestamp=0.033)
    analyzer.process_frame(closed_face.landmarks, timestamp=0.066)
    r = analyzer.process_frame(closed_face.landmarks, timestamp=0.099)
    assert r.is_closed
    assert r.blink_count == 0  # Blink increments on eye reopen

    # Frame 4: Eye reopens -> Blink confirmed!
    r = analyzer.process_frame(open_face.landmarks, timestamp=0.132)
    assert not r.is_closed
    assert r.blink_count == 1


def test_eye_analyzer_drowsy_closure_detection() -> None:
    """EyeAnalyzer should flag drowsy closure when eyes stay closed >0.5s."""
    analyzer = EyeAnalyzer(
        ear_threshold=0.21,
        drowsy_closure_sec=0.5,
    )

    closed_face = generate_synthetic_landmarks(eye_openness=0.0)

    # Eyes close at t=0.0
    r0 = analyzer.process_frame(closed_face.landmarks, timestamp=1.0)
    assert r0.is_closed
    assert not r0.is_drowsy_closure
    assert r0.closure_duration_sec == 0.0

    # At t=1.3s (closure duration = 0.3s < 0.5s)
    r1 = analyzer.process_frame(closed_face.landmarks, timestamp=1.3)
    assert not r1.is_drowsy_closure
    assert round(r1.closure_duration_sec, 2) == 0.3

    # At t=1.6s (closure duration = 0.6s > 0.5s) -> Drowsy event!
    r2 = analyzer.process_frame(closed_face.landmarks, timestamp=1.6)
    assert r2.is_drowsy_closure
    assert round(r2.closure_duration_sec, 2) == 0.6


def test_eye_analyzer_perclos_calculation() -> None:
    """PERCLOS should accurately calculate percentage of eye closure over window."""
    analyzer = EyeAnalyzer(
        ear_threshold=0.21,
        perclos_window_sec=60.0,
    )

    open_face = generate_synthetic_landmarks(eye_openness=1.0)
    closed_face = generate_synthetic_landmarks(eye_openness=0.0)

    # 10 seconds of open eyes: 0% PERCLOS
    for t in range(0, 10):
        analyzer.process_frame(open_face.landmarks, timestamp=float(t))
    r_open = analyzer.process_frame(open_face.landmarks, timestamp=10.0)
    assert r_open.perclos == 0.0

    # Next 10 seconds of closed eyes: 10s closed out of 20s total window = 50%
    for t in range(11, 21):
        analyzer.process_frame(closed_face.landmarks, timestamp=float(t))
    r_half = analyzer.process_frame(closed_face.landmarks, timestamp=20.0)
    assert 45.0 <= r_half.perclos <= 55.0


def test_eye_analyzer_calibration() -> None:
    """EyeAnalyzer should calibrate personal baseline EAR during first 10 seconds."""
    analyzer = EyeAnalyzer(
        ear_threshold=0.21,
        calibration_duration_sec=5.0,
    )

    open_face = generate_synthetic_landmarks(eye_openness=1.0)

    # Frame at t=0
    r0 = analyzer.process_frame(open_face.landmarks, timestamp=0.0)
    assert not r0.is_calibrated

    # Frames through t=5.0s
    for t in [1.0, 2.0, 3.0, 4.0, 5.1]:
        r = analyzer.process_frame(open_face.landmarks, timestamp=t)

    assert r.is_calibrated
    assert r.baseline_ear > 0.25
    # Calibrated threshold should be ~75% of baseline EAR
    assert analyzer.ear_threshold == round(r.baseline_ear * 0.75, 3)
