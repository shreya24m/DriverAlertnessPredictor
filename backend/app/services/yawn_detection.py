"""Yawn detection service using Mouth Aspect Ratio (MAR) with duration filtering.

Differentiates natural conversational mouth movements from genuine yawning episodes.
A yawn is registered only when MAR remains above the threshold for longer than
the configured duration (default 1.5 seconds).
All default thresholds are loaded from app.core.config.settings.
"""

from typing import List, Tuple, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.face_landmarks import (
    MOUTH_LANDMARKS,
    MOUTH_CORNER_LEFT,
    MOUTH_CORNER_RIGHT,
    MOUTH_LIP_UPPER_INNER,
    MOUTH_LIP_LOWER_INNER,
    LandmarkPoint,
)
from app.services.eye_analysis import euclidean_distance


def calculate_mar(
    landmarks: List[LandmarkPoint],
    mouth_indices: Tuple[int, int, int, int, int, int] = MOUTH_LANDMARKS,
) -> float:
    """Calculate Mouth Aspect Ratio (MAR) from facial landmarks.

    Formula:
        MAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    Where p1 and p4 are horizontal mouth corners, and (p2, p6) & (p3, p5)
    are vertical lip points.

    Also incorporates inner lip vertical separation (landmarks 13 & 14)
    for high sensitivity to genuine mouth opening.

    Args:
        landmarks: List of detected LandmarkPoint coordinates.
        mouth_indices: Tuple of 6 key mouth landmark indices.

    Returns:
        Computed MAR as a float. Returns 0.0 on missing or degenerate points.
    """
    max_idx = max(mouth_indices)
    if max_idx >= len(landmarks):
        return 0.0

    p1_idx, p2_idx, p3_idx, p4_idx, p5_idx, p6_idx = mouth_indices

    p1 = landmarks[p1_idx]
    p2 = landmarks[p2_idx]
    p3 = landmarks[p3_idx]
    p4 = landmarks[p4_idx]
    p5 = landmarks[p5_idx]
    p6 = landmarks[p6_idx]

    # Vertical outer lip distances
    dist_v1 = euclidean_distance(p2, p6)
    dist_v2 = euclidean_distance(p3, p5)

    # Horizontal mouth width
    dist_h = euclidean_distance(p1, p4)

    if dist_h <= 1e-6:
        return 0.0

    # If inner lip landmarks (13 and 14) are available, average with inner height
    if len(landmarks) > max(MOUTH_LIP_UPPER_INNER, MOUTH_LIP_LOWER_INNER):
        inner_top = landmarks[MOUTH_LIP_UPPER_INNER]
        inner_bottom = landmarks[MOUTH_LIP_LOWER_INNER]
        dist_v_inner = euclidean_distance(inner_top, inner_bottom)
        return (dist_v1 + dist_v2 + dist_v_inner) / (2.5 * dist_h)

    return (dist_v1 + dist_v2) / (2.0 * dist_h)


class YawnAnalysisResult(BaseModel):
    """Snapshot of computed yawn metrics for a single frame."""

    mar: float = Field(..., description="Current Mouth Aspect Ratio")
    is_mouth_open: bool = Field(..., description="True if MAR exceeds yawn threshold")
    open_duration_sec: float = Field(
        default=0.0,
        description="Duration in seconds mouth has remained continuously open above threshold",
    )
    is_yawning: bool = Field(
        default=False,
        description="True if open duration exceeds yawn filter (>1.5s)",
    )
    yawn_count: int = Field(default=0, description="Total confirmed yawns in session")
    mar_threshold: float = Field(
        default=settings.MAR_THRESHOLD,
        description="Active MAR threshold for yawn classification",
    )


class YawnDetector:
    """Stateful detector identifying yawning events with duration filtering."""

    def __init__(
        self,
        mar_threshold: float = settings.MAR_THRESHOLD,
        yawn_duration_sec: float = settings.YAWN_DURATION_SEC,
    ):
        self.mar_threshold = mar_threshold
        self.yawn_duration_sec = yawn_duration_sec

        # State tracking
        self.yawn_count: int = 0
        self.mouth_open_start_time: Optional[float] = None
        self.current_open_duration: float = 0.0
        self.yawn_counted_for_current_episode: bool = False

    def reset(self) -> None:
        """Reset detector counters and temporal state."""
        self.yawn_count = 0
        self.mouth_open_start_time = None
        self.current_open_duration = 0.0
        self.yawn_counted_for_current_episode = False

    def process_frame(
        self,
        landmarks: List[LandmarkPoint],
        timestamp: float,
    ) -> YawnAnalysisResult:
        """Process a single frame and update yawn metrics.

        Args:
            landmarks: 468 or 478 face landmark points.
            timestamp: Monotonic timestamp in seconds.

        Returns:
            YawnAnalysisResult with current MAR, opening duration, and yawn count.
        """
        mar = calculate_mar(landmarks)
        is_mouth_open = mar >= self.mar_threshold

        if is_mouth_open:
            if self.mouth_open_start_time is None:
                self.mouth_open_start_time = timestamp
            self.current_open_duration = max(0.0, timestamp - self.mouth_open_start_time)

            # Check if open duration qualifies as a genuine yawn
            if self.current_open_duration >= self.yawn_duration_sec:
                if not self.yawn_counted_for_current_episode:
                    self.yawn_count += 1
                    self.yawn_counted_for_current_episode = True
        else:
            # Mouth closed back below threshold; reset episode state
            self.mouth_open_start_time = None
            self.current_open_duration = 0.0
            self.yawn_counted_for_current_episode = False

        is_yawning = self.current_open_duration >= self.yawn_duration_sec

        return YawnAnalysisResult(
            mar=round(mar, 4),
            is_mouth_open=is_mouth_open,
            open_duration_sec=round(self.current_open_duration, 2),
            is_yawning=is_yawning,
            yawn_count=self.yawn_count,
            mar_threshold=self.mar_threshold,
        )
