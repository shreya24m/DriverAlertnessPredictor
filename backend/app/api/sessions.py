"""Driving session management API routes for saving, listing, and inspecting sessions."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db.database import get_db
from app.db.models import Session, SessionEvent, User
from app.db.schemas import SessionCreate, SessionOut
from app.core.security import get_current_user_email

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    current_email: str = Depends(get_current_user_email),
    db: DBSession = Depends(get_db),
) -> SessionOut:
    """Save a completed driving monitoring session with aggregated metrics and timeline events."""
    user = db.query(User).filter(User.email == current_email.lower()).first()

    session = Session(
        user_id=user.id if user else None,
        user_email=current_email,
        duration_sec=payload.duration_sec,
        avg_ear=payload.avg_ear,
        avg_mar=payload.avg_mar,
        peak_risk=payload.peak_risk,
        total_blinks=payload.total_blinks,
        blink_rate_per_min=payload.blink_rate_per_min,
        total_yawns=payload.total_yawns,
        drowsy_events_count=payload.drowsy_events_count,
        alarm_events_count=payload.alarm_events_count,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Attach timeline events if provided
    if payload.events:
        for ev in payload.events:
            event_obj = SessionEvent(
                session_id=session.id,
                timestamp_sec=ev.timestamp_sec,
                event_type=ev.event_type,
                risk_score=ev.risk_score,
                details=ev.details,
            )
            db.add(event_obj)
        db.commit()
        db.refresh(session)

    return SessionOut.model_validate(session)


@router.get("", response_model=List[SessionOut])
def list_sessions(
    limit: int = 50,
    current_email: str = Depends(get_current_user_email),
    db: DBSession = Depends(get_db),
) -> List[SessionOut]:
    """Retrieve saved driving sessions for the authenticated user, sorted latest first."""
    sessions = (
        db.query(Session)
        .filter(Session.user_email == current_email)
        .order_by(Session.created_at.desc())
        .limit(limit)
        .all()
    )
    return [SessionOut.model_validate(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: str,
    current_email: str = Depends(get_current_user_email),
    db: DBSession = Depends(get_db),
) -> SessionOut:
    """Fetch complete telemetry and timeline for a specific session."""
    session = (
        db.query(Session)
        .filter(Session.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return SessionOut.model_validate(session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    current_email: str = Depends(get_current_user_email),
    db: DBSession = Depends(get_db),
) -> None:
    """Delete a saved session and its associated timeline events."""
    session = (
        db.query(Session)
        .filter(Session.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    db.delete(session)
    db.commit()
    return None
