"""Pydantic request and response schemas for API endpoints."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------------------------------------------------------------------
# Auth Schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """Registration request payload."""

    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Login request payload."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Public user profile response."""

    id: str
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT bearer token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Session & Event Schemas
# ---------------------------------------------------------------------------

class EventCreate(BaseModel):
    """Payload for logging an event during an active driving session."""

    timestamp_sec: float
    event_type: str
    risk_score: int = 0
    details: Optional[str] = None


class EventOut(BaseModel):
    """Saved session event response."""

    id: str
    session_id: str
    timestamp_sec: float
    event_type: str
    risk_score: int
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionCreate(BaseModel):
    """Payload for completing and saving a driving monitoring session."""

    duration_sec: int
    avg_ear: float
    avg_mar: float
    peak_risk: int
    total_blinks: int
    blink_rate_per_min: float
    total_yawns: int
    drowsy_events_count: int
    alarm_events_count: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    events: Optional[List[EventCreate]] = None


class SessionOut(BaseModel):
    """Comprehensive driving session record response."""

    id: str
    user_email: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_sec: int
    avg_ear: float
    avg_mar: float
    peak_risk: int
    total_blinks: int
    blink_rate_per_min: float
    total_yawns: int
    drowsy_events_count: int
    alarm_events_count: int
    created_at: datetime
    events: Optional[List[EventOut]] = None

    model_config = ConfigDict(from_attributes=True)
