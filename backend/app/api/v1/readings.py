from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List
from app.core.security import get_current_owner, TokenData
from app.services.supabase_client import get_supabase_client
from app.services.simulator import simulate_installation_readings
from app.schemas.reading import ReadingResponse, ReadingQueryParams, SimulateRequest
from app.schemas.performance import PerformanceResponse
from app.services.performance_engine import performance_engine

router = APIRouter()


@router.get("/{installation_id}/dashboard", response_model=PerformanceResponse)
async def get_dashboard(installation_id: UUID, current: TokenData = Depends(get_current_owner)):
    # verify ownership
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    return performance_engine.calculate_performance(installation_id)


@router.get("/{installation_id}/readings", response_model=List[ReadingResponse])
async def list_readings(
    installation_id: UUID,
    params: ReadingQueryParams = Depends(),
    current: TokenData = Depends(get_current_owner),
):
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    query = supabase.table("readings").select("*").eq("installation_id", str(installation_id)).order("timestamp", desc=True)
    if params.start_date:
        query = query.gte("timestamp", params.start_date.isoformat())
    if params.end_date:
        query = query.lte("timestamp", params.end_date.isoformat())
    query = query.range(params.offset, params.offset + params.limit - 1)
    result = query.execute()
    return [ReadingResponse.model_validate(r) for r in (result.data or [])]


@router.post("/{installation_id}/simulate")
async def simulate_readings(installation_id: UUID, payload: SimulateRequest, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    result = await simulate_installation_readings(installation_id, payload)
    return result