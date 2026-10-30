from fastapi import APIRouter, Depends
from app.core.config import settings
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.get("/health")
async def health_check():
    supabase = get_supabase_client()
    try:
        # simple query to verify DB connectivity
        supabase.table("profiles").select("id").limit(1).execute()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "nebius_configured": bool(settings.NEBIUS_API_KEY),
    }