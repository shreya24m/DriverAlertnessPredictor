"""Face landmark indexing, data models, and synthetic landmark generators.

This service defines the MediaPipe 468/478 Face Mesh topology index mappings,
validation routines, and synthetic landmark generators used for unit testing.
"""

from typing import List, Tuple, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Standard MediaPipe Face Mesh Index Mappings
# ---------------------------------------------------------------------------

# Left Eye (6 canonical landmarks for Eye Aspect Ratio calculation)
# p1: outer corner, p4: inner corner, p2/p6: upper/lower outer, p3/p5: upper/lower inner
LEFT_EYE_LANDMARKS: Tuple[int, int, int, int, int, int] = (33, 160, 158, 133, 153, 144)

# Right Eye (6 canonical landmarks for Eye Aspect Ratio calculation)
RIGHT_EYE_LANDMARKS: Tuple[int, int, int, int, int, int] = (362, 385, 387, 263, 373, 380)

# Mouth (Key landmarks for Mouth Aspect Ratio calculation)
# p1: left corner (61), p4: right corner (291), p2/p6: upper/lower outer (37, 84), p3/p5: upper/lower inner (267, 314)
# Also inner lips top (13) and bottom (14)
MOUTH_CORNER_LEFT: int = 61
MOUTH_CORNER_RIGHT: int = 291
MOUTH_LIP_UPPER_INNER: int = 13
MOUTH_LIP_LOWER_INNER: int = 14
MOUTH_LANDMARKS: Tuple[int, int, int, int, int, int] = (61, 37, 267, 291, 314, 84)

# Left & Right Iris Centers (MediaPipe 478 landmarks extension)
LEFT_IRIS_CENTER: int = 468
RIGHT_IRIS_CENTER: int = 473

# Nose Tip (useful for head pose / validation)
NOSE_TIP: int = 1

TOTAL_BASE_LANDMARKS: int = 468
TOTAL_EXTENDED_LANDMARKS: int = 478


class LandmarkPoint(BaseModel):
    """Normalized 3D coordinate for a single facial landmark."""

    x: float = Field(..., description="Normalized X coordinate in [0.0, 1.0]")
    y: float = Field(..., description="Normalized Y coordinate in [0.0, 1.0]")
    z: float = Field(default=0.0, description="Normalized Z coordinate relative to face center")


class FaceLandmarks(BaseModel):
    """Collection of normalized facial landmarks detected for a single face."""

    landmarks: List[LandmarkPoint] = Field(..., description="List of 468 or 478 landmark points")

    @property
    def count(self) -> int:
        """Return total number of landmark points."""
        return len(self.landmarks)

    def get_point(self, index: int) -> Optional[LandmarkPoint]:
        """Safely retrieve landmark by index, returning None if out of range."""
        if 0 <= index < len(self.landmarks):
            return self.landmarks[index]
        return None


def validate_landmarks(landmarks: List[LandmarkPoint]) -> bool:
    """Validate that landmark points are well-formed and sufficient in count.

    Args:
        landmarks: List of LandmarkPoint objects.

    Returns:
        True if landmark list meets requirements (at least 468 points within reasonable coordinates).
    """
    if len(landmarks) < TOTAL_BASE_LANDMARKS:
        return False

    # Check key feature points exist and coordinates are reasonable (allowing small padding outside [0,1])
    for idx in (LEFT_EYE_LANDMARKS[0], RIGHT_EYE_LANDMARKS[0], MOUTH_CORNER_LEFT, NOSE_TIP):
        if idx >= len(landmarks):
            return False
        pt = landmarks[idx]
        if not (-0.5 <= pt.x <= 1.5 and -0.5 <= pt.y <= 1.5):
            return False

    return True


def generate_synthetic_landmarks(
    eye_openness: float = 1.0,
    mouth_openness: float = 0.0,
    total_points: int = TOTAL_EXTENDED_LANDMARKS,
) -> FaceLandmarks:
    """Generate synthetic 478 facial landmarks for testing and simulation.

    Args:
        eye_openness: Float between 0.0 (completely closed eyes) and 1.0 (fully open eyes).
        mouth_openness: Float between 0.0 (closed mouth) and 1.0 (wide yawn).
        total_points: Number of landmarks to synthesize (default 478).

    Returns:
        FaceLandmarks instance populated with realistic relative coordinates.
    """
    eye_openness = max(0.0, min(1.0, eye_openness))
    mouth_openness = max(0.0, min(1.0, mouth_openness))

    # Initialize all landmarks around a neutral face center (x=0.5, y=0.5)
    points = [LandmarkPoint(x=0.5, y=0.5, z=0.0) for _ in range(total_points)]

    # Nose Tip
    points[NOSE_TIP] = LandmarkPoint(x=0.5, y=0.5, z=-0.05)

    # Left eye dimensions (centered around x=0.35, y=0.35)
    # Horizontal width = 0.06 (p1.x=0.32, p4.x=0.38)
    # Vertical height scales with eye_openness: max 0.018 (EAR ~ 0.30), min 0.002 (EAR ~ 0.033)
    eye_h = 0.002 + 0.016 * eye_openness
    p1_l, p2_l, p3_l, p4_l, p5_l, p6_l = LEFT_EYE_LANDMARKS
    points[p1_l] = LandmarkPoint(x=0.32, y=0.35, z=0.0)
    points[p2_l] = LandmarkPoint(x=0.34, y=0.35 - eye_h / 2, z=0.0)
    points[p3_l] = LandmarkPoint(x=0.36, y=0.35 - eye_h / 2, z=0.0)
    points[p4_l] = LandmarkPoint(x=0.38, y=0.35, z=0.0)
    points[p5_l] = LandmarkPoint(x=0.36, y=0.35 + eye_h / 2, z=0.0)
    points[p6_l] = LandmarkPoint(x=0.34, y=0.35 + eye_h / 2, z=0.0)

    # Right eye dimensions (centered around x=0.65, y=0.35)
    p1_r, p2_r, p3_r, p4_r, p5_r, p6_r = RIGHT_EYE_LANDMARKS
    points[p1_r] = LandmarkPoint(x=0.62, y=0.35, z=0.0)
    points[p2_r] = LandmarkPoint(x=0.64, y=0.35 - eye_h / 2, z=0.0)
    points[p3_r] = LandmarkPoint(x=0.66, y=0.35 - eye_h / 2, z=0.0)
    points[p4_r] = LandmarkPoint(x=0.68, y=0.35, z=0.0)
    points[p5_r] = LandmarkPoint(x=0.66, y=0.35 + eye_h / 2, z=0.0)
    points[p6_r] = LandmarkPoint(x=0.64, y=0.35 + eye_h / 2, z=0.0)

    # Left & Right Iris centers
    if total_points > LEFT_IRIS_CENTER:
        points[LEFT_IRIS_CENTER] = LandmarkPoint(x=0.35, y=0.35, z=-0.01)
    if total_points > RIGHT_IRIS_CENTER:
        points[RIGHT_IRIS_CENTER] = LandmarkPoint(x=0.65, y=0.35, z=-0.01)

    # Mouth dimensions (centered around x=0.50, y=0.68)
    # Horizontal width = 0.10 (corner_left=0.45, corner_right=0.55)
    # Vertical height scales with mouth_openness: min 0.005 (MAR ~ 0.05), max 0.08 (MAR ~ 0.80)
    mouth_h = 0.005 + 0.075 * mouth_openness
    points[MOUTH_CORNER_LEFT] = LandmarkPoint(x=0.45, y=0.68, z=0.0)
    points[MOUTH_CORNER_RIGHT] = LandmarkPoint(x=0.55, y=0.68, z=0.0)
    points[MOUTH_LIP_UPPER_INNER] = LandmarkPoint(x=0.50, y=0.68 - mouth_h / 2, z=0.0)
    points[MOUTH_LIP_LOWER_INNER] = LandmarkPoint(x=0.50, y=0.68 + mouth_h / 2, z=0.0)

    p1_m, p2_m, p3_m, p4_m, p5_m, p6_m = MOUTH_LANDMARKS
    points[p1_m] = LandmarkPoint(x=0.45, y=0.68, z=0.0)
    points[p2_m] = LandmarkPoint(x=0.48, y=0.68 - mouth_h / 2, z=0.0)
    points[p3_m] = LandmarkPoint(x=0.52, y=0.68 - mouth_h / 2, z=0.0)
    points[p4_m] = LandmarkPoint(x=0.55, y=0.68, z=0.0)
    points[p5_m] = LandmarkPoint(x=0.52, y=0.68 + mouth_h / 2, z=0.0)
    points[p6_m] = LandmarkPoint(x=0.48, y=0.68 + mouth_h / 2, z=0.0)

    return FaceLandmarks(landmarks=points)
