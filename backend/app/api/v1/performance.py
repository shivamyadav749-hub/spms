from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from app.core.security import get_current_owner, TokenData
from app.services.supabase_client import get_supabase_client
from app.services.performance_engine import performance_engine
from app.schemas.performance import PerformanceResponse, PerformancePeriod

router = APIRouter()


@router.get("/{installation_id}/performance", response_model=PerformanceResponse)
async def get_performance(
    installation_id: UUID,
    period: PerformancePeriod = Query(PerformancePeriod.LAST_7_DAYS),
    custom_start: str | None = Query(None),
    custom_end: str | None = Query(None),
    current: TokenData = Depends(get_current_owner),
):
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    from datetime import date
    cs = date.fromisoformat(custom_start) if custom_start else None
    ce = date.fromisoformat(custom_end) if custom_end else None
    return performance_engine.calculate_performance(installation_id, period, cs, ce)