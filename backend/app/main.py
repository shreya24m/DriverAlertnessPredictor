"""FastAPI application entrypoint for DriveAware AI."""

from typing import Any, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import Base, engine
from app.api import api_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack computer-vision driver drowsiness detection platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for client access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers under /api/v1
app.include_router(api_router)


@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    """Root status endpoint returning service info and documentation link."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Monitoring"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint used by uptime monitors, deployment checks, and frontend."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/v1/config/thresholds", tags=["Configuration"])
def get_thresholds() -> Dict[str, Any]:
    """Provide centralized detection thresholds for client-side synchronization."""
    return {
        "ear_threshold": settings.EAR_THRESHOLD,
        "mar_threshold": settings.MAR_THRESHOLD,
        "blink_min_frames": settings.BLINK_MIN_FRAMES,
        "blink_max_frames": settings.BLINK_MAX_FRAMES,
        "drowsy_closure_duration_sec": settings.DROWSY_CLOSURE_DURATION_SEC,
        "yawn_duration_sec": settings.YAWN_DURATION_SEC,
        "perclos_window_sec": settings.PERCLOS_WINDOW_SEC,
        "calibration_duration_sec": settings.CALIBRATION_DURATION_SEC,
        "alarm_levels": {
            "warning": settings.ALARM_LEVEL_WARNING_RISK,
            "alert": settings.ALARM_LEVEL_ALERT_RISK,
            "critical": settings.ALARM_LEVEL_CRITICAL_RISK,
            "hysteresis": settings.ALARM_HYSTERESIS_DECREASE,
        },
    }
