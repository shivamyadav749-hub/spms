from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.security import get_cors_origins
from app.api.v1.router import api_router
from app.services.ai_service import ai_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown
    await ai_service.close()


app = FastAPI(
    title="SPMS - Solar Performance Monitoring System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_root():
    from app.core.config import settings
    from app.services.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    try:
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


@app.get("/")
async def root():
    return {"message": "SPMS API", "docs": "/docs"}