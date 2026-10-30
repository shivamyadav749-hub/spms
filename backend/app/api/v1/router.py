from fastapi import APIRouter

from app.api.v1 import auth, installations, readings, performance, alerts, components, ai, technicians, service_requests, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(installations.router, prefix="/installations", tags=["installations"])
api_router.include_router(readings.router, prefix="/installations", tags=["readings"])
api_router.include_router(performance.router, prefix="/installations", tags=["performance"])
api_router.include_router(alerts.router, prefix="/installations", tags=["alerts"])
api_router.include_router(components.router, prefix="/installations", tags=["components"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(technicians.router, prefix="/technicians", tags=["technicians"])
api_router.include_router(service_requests.router, prefix="/service-requests", tags=["service_requests"])