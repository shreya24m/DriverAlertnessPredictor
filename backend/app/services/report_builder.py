"""PDF Safety Report generator for driving vigilance sessions using ReportLab."""

import io
from datetime import datetime
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.db.models import Session


def generate_session_pdf_report(session: Session) -> bytes:
    """Generate a formatted PDF safety report for a driving session.

    Args:
        session: SQLAlchemy Session model instance with stats and events.

    Returns:
        Raw bytes of the generated PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0284c7"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("<b>DriveAware AI &bull; Driver Safety Report</b>", title_style))
    start_str = session.start_time.strftime("%Y-%m-%d %H:%M:%S UTC") if session.start_time else "N/A"
    story.append(Paragraph(f"Session ID: <code>{session.id}</code> &bull; Recorded: {start_str}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=14))

    # 2. Executive Safety Summary
    risk = session.peak_risk or 0
    if risk >= 80:
        verdict_text = "<b>CRITICAL RISK LEVEL:</b> Severe drowsiness or micro-sleep events were detected during this trip. Driver fatigue posed an active danger."
        verdict_color = colors.HexColor("#fee2e2")
        border_color = colors.HexColor("#ef4444")
    elif risk >= 60:
        verdict_text = "<b>HIGH FATIGUE ALERT:</b> Multiple prolonged eye closures and yawning were observed. Pulling over to rest was required."
        verdict_color = colors.HexColor("#ffedd5")
        border_color = colors.HexColor("#f97316")
    elif risk >= 30:
        verdict_text = "<b>MILD DROWSINESS WARNING:</b> Elevated PERCLOS closure percentage observed. Driver was advised to plan a driving break."
        verdict_color = colors.HexColor("#fef3c7")
        border_color = colors.HexColor("#f59e0b")
    else:
        verdict_text = "<b>NORMAL VIGILANCE:</b> Driver maintained excellent eye alertness, normal blink rates, and minimal fatigue indicators."
        verdict_color = colors.HexColor("#ecfdf5")
        border_color = colors.HexColor("#10b981")

    verdict_table = Table(
        [[Paragraph(verdict_text, body_style)]],
        colWidths=[540],
    )
    verdict_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), verdict_color),
            ("BOX", (0, 0), (-1, -1), 1.2, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ])
    )
    story.append(verdict_table)
    story.append(Spacer(1, 10))

    # 3. Core Statistics Table
    story.append(Paragraph("Trip Vigilance &amp; Physiological Telemetry", section_style))

    mins = session.duration_sec // 60
    secs = session.duration_sec % 60
    duration_fmt = f"{mins}m {secs}s ({session.duration_sec}s)"

    stats_data = [
        ["Metric", "Value", "Standard Baseline Reference"],
        ["Trip Duration", duration_fmt, "Continuous monitoring session"],
        ["Average Eye Aspect Ratio (EAR)", f"{session.avg_ear:.3f}", "Open: >0.25 | Closed: <0.21"],
        ["Average Mouth Aspect Ratio (MAR)", f"{session.avg_mar:.3f}", "Normal: <0.30 | Yawn: >0.60"],
        ["Peak Drowsiness Risk Score", f"{session.peak_risk} / 100", "0-29 Normal | 30-59 Warn | 60+ Alert"],
        ["Total Confirmed Blinks", str(session.total_blinks), "Normal blink range: 10-25 / min"],
        ["Blink Frequency", f"{session.blink_rate_per_min:.1f} blinks/min", "<6/min denotes fatigue fixation"],
        ["Total Confirmed Yawns (>1.5s)", str(session.total_yawns), "Filtered: speech ignored (<1.5s)"],
        ["Drowsy Closures (>0.5s)", str(session.drowsy_events_count), "Micro-sleep episodes detected"],
        ["Alarm Events Triggered", str(session.alarm_events_count), "Escalations across Warning/Alert/Critical"],
    ]

    stats_table = Table(stats_data, colWidths=[180, 140, 220])
    stats_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ALIGN", (1, 1), (1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(stats_table)
    story.append(Spacer(1, 10))

    # 4. Event Timeline Table (if events exist)
    story.append(Paragraph("Safety Event Timeline", section_style))
    if session.events and len(session.events) > 0:
        event_rows = [["Time (sec)", "Event Classification", "Risk Score", "Details"]]
        for ev in session.events[:15]:  # Show up to 15 events in PDF
            event_rows.append([
                f"{ev.timestamp_sec:.1f}s",
                ev.event_type.replace("_", " ").title(),
                f"{ev.risk_score}/100",
                ev.details or "—",
            ])

        event_table = Table(event_rows, colWidths=[80, 160, 80, 220])
        event_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f1f5f9"), colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(event_table)
    else:
        story.append(Paragraph("<i>No critical safety alarms or micro-sleep events were triggered during this trip.</i>", body_style))

    # 5. Footer & Privacy Assurance
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#94a3b8"), spaceAfter=8))
    privacy_note = (
        "<b>Privacy Guarantee:</b> DriveAware AI utilizes edge WebAssembly MediaPipe Face Mesh running "
        "locally inside the driver's browser. Raw camera video frames are processed transiently in device memory "
        "and are never stored, transmitted, or accessible to external servers."
    )
    story.append(Paragraph(privacy_note, body_style))

    doc.build(story)
    return buffer.getvalue()
