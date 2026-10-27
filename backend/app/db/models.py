"""SQLAlchemy database models for Users, Driving Sessions, and Detection Events."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


def generate_uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid.uuid4())


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """Monitored driving vigilance session record.

    Privacy Guarantee: Stores only numerical statistics, event timestamps,
    and aggregate metrics. Raw camera video frames are NEVER stored or transmitted.
    """

    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True, index=True)

    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime, nullable=True)
    duration_sec = Column(Integer, default=0)

    # Core aggregates
    avg_ear = Column(Float, default=0.0)
    avg_mar = Column(Float, default=0.0)
    peak_risk = Column(Integer, default=0)
    total_blinks = Column(Integer, default=0)
    blink_rate_per_min = Column(Float, default=0.0)
    total_yawns = Column(Integer, default=0)
    drowsy_events_count = Column(Integer, default=0)
    alarm_events_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sessions")
    events = relationship("SessionEvent", back_populates="session", cascade="all, delete-orphan")


class SessionEvent(Base):
    """Individual fatigue, micro-sleep, yawn, or alarm event occurrence."""

    __tablename__ = "session_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp_sec = Column(Float, nullable=False)
    event_type = Column(String(50), nullable=False)  # drowsy_closure, yawn, alarm_warning, alarm_alert, alarm_critical
    risk_score = Column(Integer, default=0)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="events")
