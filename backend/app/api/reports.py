"""PDF Safety Report download API endpoint."""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session as DBSession

from app.db.database import get_db
from app.db.models import Session
from app.services.report_builder import generate_session_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/{session_id}", response_class=Response)
def get_pdf_report(
    session_id: str,
    db: DBSession = Depends(get_db),
) -> Response:
    """Generate and return a downloadable PDF driver vigilance safety report."""
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

    pdf_bytes = generate_session_pdf_report(session)

    filename = f"driveaware_report_{session_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
