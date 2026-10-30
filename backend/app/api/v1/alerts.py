from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List
from app.core.security import get_current_owner, TokenData
from app.services.supabase_client import get_supabase_client
from app.services.performance_engine import performance_engine
from app.schemas.alert import AlertResponse, AlertListResponse, AlertUpdate

router = APIRouter()


@router.get("/{installation_id}/alerts", response_model=AlertListResponse)
async def list_alerts(
    installation_id: UUID,
    status: str | None = Query(None, pattern="^(active|acknowledged|resolved)$"),
    current: TokenData = Depends(get_current_owner),
):
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    query = supabase.table("alerts").select("*").eq("installation_id", str(installation_id)).order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    alerts = [AlertResponse.model_validate(a) for a in (result.data or [])]
    active_count = sum(1 for a in alerts if a.status.value == "active")
    return AlertListResponse(alerts=alerts, total=len(alerts), active_count=active_count)


@router.patch("/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: UUID, payload: AlertUpdate, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    # verify ownership via installation
    alert = supabase.table("alerts").select("installation_id").eq("id", str(alert_id)).single().execute()
    if not alert.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    inst = supabase.table("installations").select("id").eq("id", alert.data["installation_id"]).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    from datetime import datetime
    if update_data.get("status") == "acknowledged":
        update_data["acknowledged_at"] = datetime.utcnow().isoformat()
    elif update_data.get("status") == "resolved":
        update_data["resolved_at"] = datetime.utcnow().isoformat()
    result = supabase.table("alerts").update(update_data).eq("id", str(alert_id)).execute()
    return AlertResponse.model_validate(result.data[0])