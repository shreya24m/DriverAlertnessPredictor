"""Application and detection configuration for DriveAware AI.

All thresholds (EAR, MAR, PERCLOS window, alarm levels) live in this config file
to avoid hardcoding values across services.
"""

from typing import List, Union
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for DriveAware AI backend service and detection engine."""

    # Project metadata
    PROJECT_NAME: str = "DriveAware AI"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Database & Authentication
    DATABASE_URL: str = "sqlite:///./driveaware.db"
    SECRET_KEY: str = "temporary-dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Detection logic thresholds (centralized reference)
    EAR_THRESHOLD: float = Field(
        default=0.21,
        description="Eye Aspect Ratio threshold below which eye is marked closed.",
    )
    MAR_THRESHOLD: float = Field(
        default=0.60,
        description="Mouth Aspect Ratio threshold above which mouth is marked open (yawn).",
    )
    BLINK_MIN_FRAMES: int = Field(
        default=2,
        description="Minimum consecutive frames to qualify as an eye blink.",
    )
    BLINK_MAX_FRAMES: int = Field(
        default=6,
        description="Maximum consecutive frames to qualify as an eye blink.",
    )
    DROWSY_CLOSURE_DURATION_SEC: float = Field(
        default=0.5,
        description="Eye closure duration in seconds to trigger drowsy event.",
    )
    YAWN_DURATION_SEC: float = Field(
        default=1.5,
        description="Consecutive mouth opening duration in seconds to count as a yawn.",
    )
    PERCLOS_WINDOW_SEC: float = Field(
        default=60.0,
        description="Rolling window in seconds used to calculate PERCLOS.",
    )
    CALIBRATION_DURATION_SEC: float = Field(
        default=10.0,
        description="Initial open-eye calibration window in seconds.",
    )

    # Risk Engine & Alarm Thresholds
    ALARM_LEVEL_WARNING_RISK: int = Field(
        default=30,
        description="Risk score (0-100) threshold for Level 1: Warning banner.",
    )
    ALARM_LEVEL_ALERT_RISK: int = Field(
        default=60,
        description="Risk score (0-100) threshold for Level 2: Alert audio.",
    )
    ALARM_LEVEL_CRITICAL_RISK: int = Field(
        default=80,
        description="Risk score (0-100) threshold for Level 3: Loud repeating critical alarm.",
    )
    ALARM_HYSTERESIS_DECREASE: int = Field(
        default=5,
        description="Hysteresis buffer points required to de-escalate alarm levels.",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
