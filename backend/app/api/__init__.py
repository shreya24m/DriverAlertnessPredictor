"""API v1 router composition."""

from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router
from app.api.reports import router as reports_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(sessions_router)
api_router.include_router(reports_router)

__all__ = ["api_router"]
