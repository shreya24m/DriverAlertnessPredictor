"""Eye closure, blink counting, and PERCLOS analysis service.

Implements Eye Aspect Ratio (EAR), blink detection, eye closure duration,
and rolling PERCLOS calculation according to standardized vision criteria.
All default thresholds are loaded from app.core.config.settings.
"""

import math
from typing import List, Tuple, Optional
from collections import deque
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.face_landmarks import (
    LEFT_EYE_LANDMARKS,
    RIGHT_EYE_LANDMARKS,
    LandmarkPoint,
    FaceLandmarks,
)


def euclidean_distance(p1: LandmarkPoint, p2: LandmarkPoint) -> float:
    """Calculate the 3D Euclidean distance between two landmark points.

    Args:
        p1: First LandmarkPoint.
        p2: Second LandmarkPoint.

    Returns:
        Euclidean distance as float.
    """
    dx = p1.x - p2.x
    dy = p1.y - p2.y
    dz = (p1.z or 0.0) - (p2.z or 0.0)
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def calculate_ear(
    landmarks: List[LandmarkPoint],
    eye_indices: Tuple[int, int, int, int, int, int],
) -> float:
    """Calculate Eye Aspect Ratio (EAR) from 6 canonical facial landmarks.

    Formula:
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)

    Args:
        landmarks: Complete list of landmark points.
        eye_indices: Tuple of 6 landmark indices (p1, p2, p3, p4, p5, p6).

    Returns:
        Float value of EAR. Returns 0.0 if points are degenerate or missing.
    """
    p1_idx, p2_idx, p3_idx, p4_idx, p5_idx, p6_idx = eye_indices

    # Bounds check
    max_idx = max(eye_indices)
    if max_idx >= len(landmarks):
        return 0.0

    p1 = landmarks[p1_idx]
    p2 = landmarks[p2_idx]
    p3 = landmarks[p3_idx]
    p4 = landmarks[p4_idx]
    p5 = landmarks[p5_idx]
    p6 = landmarks[p6_idx]

    # Vertical eye distances
    dist_vertical_1 = euclidean_distance(p2, p6)
    dist_vertical_2 = euclidean_distance(p3, p5)

    # Horizontal eye distance
    dist_horizontal = euclidean_distance(p1, p4)

    if dist_horizontal <= 1e-6:
        return 0.0

    return (dist_vertical_1 + dist_vertical_2) / (2.0 * dist_horizontal)


class EyeAnalysisResult(BaseModel):
    """Snapshot of computed eye metrics for a single frame."""

    left_ear: float = Field(..., description="Eye Aspect Ratio for left eye")
    right_ear: float = Field(..., description="Eye Aspect Ratio for right eye")
    avg_ear: float = Field(..., description="Mean of left and right EAR")
    is_closed: bool = Field(..., description="Whether eyes are currently closed below threshold")
    closure_duration_sec: float = Field(
        default=0.0,
        description="Duration in seconds eyes have remained continuously closed",
    )
    is_drowsy_closure: bool = Field(
        default=False,
        description="True if closure duration exceeds drowsy threshold (>0.5s)",
    )
    blink_count: int = Field(default=0, description="Total confirmed blinks in session")
    perclos: float = Field(
        default=0.0,
        description="Rolling PERCLOS percentage over the configured window",
    )
    is_calibrated: bool = Field(
        default=False,
        description="Whether personal baseline calibration has finished",
    )
    baseline_ear: float = Field(
        default=settings.EAR_THRESHOLD,
        description="Current baseline or calibrated open-eye EAR",
    )


class EyeAnalyzer:
    """Stateful analyzer tracking blinks, closure durations, and rolling PERCLOS."""

    def __init__(
        self,
        ear_threshold: float = settings.EAR_THRESHOLD,
        blink_min_frames: int = settings.BLINK_MIN_FRAMES,
        blink_max_frames: int = settings.BLINK_MAX_FRAMES,
        drowsy_closure_sec: float = settings.DROWSY_CLOSURE_DURATION_SEC,
        perclos_window_sec: float = settings.PERCLOS_WINDOW_SEC,
        calibration_duration_sec: float = settings.CALIBRATION_DURATION_SEC,
    ):
        self.ear_threshold = ear_threshold
        self.blink_min_frames = blink_min_frames
        self.blink_max_frames = blink_max_frames
        self.drowsy_closure_sec = drowsy_closure_sec
        self.perclos_window_sec = perclos_window_sec
        self.calibration_duration_sec = calibration_duration_sec

        # State tracking
        self.blink_count: int = 0
        self.closed_frame_count: int = 0
        self.closure_start_time: Optional[float] = None
        self.current_closure_duration: float = 0.0

        # Rolling history for PERCLOS: deque of (timestamp, is_closed)
        self.history: deque = deque()

        # Calibration state
        self.calibration_start_time: Optional[float] = None
        self.calibration_samples: List[float] = []
        self.is_calibrated: bool = False
        self.baseline_ear: float = ear_threshold

    def reset(self) -> None:
        """Reset all counters, history, and calibration state."""
        self.blink_count = 0
        self.closed_frame_count = 0
        self.closure_start_time = None
        self.current_closure_duration = 0.0
        self.history.clear()
        self.calibration_start_time = None
        self.calibration_samples.clear()
        self.is_calibrated = False
        self.baseline_ear = self.ear_threshold

    def process_frame(
        self,
        landmarks: List[LandmarkPoint],
        timestamp: float,
    ) -> EyeAnalysisResult:
        """Process a single frame and update eye metrics.

        Args:
            landmarks: 468 or 478 face landmark points.
            timestamp: Monotonic timestamp in seconds.

        Returns:
            EyeAnalysisResult object with current EAR, blink status, and PERCLOS.
        """
        left_ear = calculate_ear(landmarks, LEFT_EYE_LANDMARKS)
        right_ear = calculate_ear(landmarks, RIGHT_EYE_LANDMARKS)
        avg_ear = (left_ear + right_ear) / 2.0

        # 1. Calibration tracking (during initial open-eye phase)
        if not self.is_calibrated:
            if self.calibration_start_time is None:
                self.calibration_start_time = timestamp
            elapsed_cal = timestamp - self.calibration_start_time

            # Only sample open eyes (EAR >= default threshold)
            if avg_ear >= self.ear_threshold:
                self.calibration_samples.append(avg_ear)

            if elapsed_cal >= self.calibration_duration_sec:
                if self.calibration_samples:
                    self.baseline_ear = sum(self.calibration_samples) / len(self.calibration_samples)
                    # Adaptive threshold: 75% of user's personal open-eye baseline
                    self.ear_threshold = round(self.baseline_ear * 0.75, 3)
                self.is_calibrated = True

        # 2. Eye closure state
        is_closed = avg_ear < self.ear_threshold

        if is_closed:
            self.closed_frame_count += 1
            if self.closure_start_time is None:
                self.closure_start_time = timestamp
            self.current_closure_duration = max(0.0, timestamp - self.closure_start_time)
        else:
            # Eye is open; check if a blink just completed
            if self.blink_min_frames <= self.closed_frame_count <= self.blink_max_frames:
                self.blink_count += 1
            self.closed_frame_count = 0
            self.closure_start_time = None
            self.current_closure_duration = 0.0

        is_drowsy_closure = self.current_closure_duration >= self.drowsy_closure_sec

        # 3. PERCLOS calculation over rolling window
        self.history.append((timestamp, is_closed))

        # Evict samples older than rolling window
        cutoff_time = timestamp - self.perclos_window_sec
        while self.history and self.history[0][0] < cutoff_time:
            self.history.popleft()

        perclos = self._compute_perclos()

        return EyeAnalysisResult(
            left_ear=round(left_ear, 4),
            right_ear=round(right_ear, 4),
            avg_ear=round(avg_ear, 4),
            is_closed=is_closed,
            closure_duration_sec=round(self.current_closure_duration, 3),
            is_drowsy_closure=is_drowsy_closure,
            blink_count=self.blink_count,
            perclos=round(perclos, 2),
            is_calibrated=self.is_calibrated,
            baseline_ear=round(self.baseline_ear, 4),
        )

    def _compute_perclos(self) -> float:
        """Compute the percentage of time eyes were closed in the current window."""
        if len(self.history) < 2:
            return 0.0

        total_closed_duration = 0.0
        total_window_duration = self.history[-1][0] - self.history[0][0]

        if total_window_duration <= 0.0:
            return 0.0

        # Sum durations between consecutive sample intervals
        for i in range(len(self.history) - 1):
            t_curr, closed_curr = self.history[i]
            t_next, _ = self.history[i + 1]
            dt = t_next - t_curr
            if closed_curr:
                total_closed_duration += dt

        return (total_closed_duration / total_window_duration) * 100.0
