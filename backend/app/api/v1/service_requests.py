from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List
from app.core.security import get_current_user, TokenData
from app.services.supabase_client import get_supabase_client
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestResponse,
    ServiceRecordCreate,
    ServiceRecordResponse,
    ServiceHistoryResponse,
)

router = APIRouter()


def _verify_installation_owner(supabase, installation_id: UUID, user_id: str):
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=403, detail="Not authorized for this installation")
    return inst.data


def _verify_technician_assigned(supabase, request_id: UUID, user_id: str):
    sr = supabase.table("service_requests").select("*").eq("id", str(request_id)).eq("technician_id", user_id).single().execute()
    if not sr.data:
        raise HTTPException(status_code=403, detail="Not authorized for this request")
    return sr.data


@router.post("", response_model=ServiceRequestResponse, status_code=201)
async def create_service_request(payload: ServiceRequestCreate, current: TokenData = Depends(get_current_user)):
    if current.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    supabase = get_supabase_client()
    _verify_installation_owner(supabase, payload.installation_id, current.user_id)
    data = payload.model_dump()
    data["requested_by"] = current.user_id
    result = supabase.table("service_requests").insert(data).execute()
    return ServiceRequestResponse.model_validate(result.data[0])


@router.get("", response_model=List[ServiceRequestResponse])
async def list_service_requests(
    status: str | None = Query(None, pattern="^(requested|assigned|in_progress|completed|cancelled|rejected)$"),
    current: TokenData = Depends(get_current_user),
):
    supabase = get_supabase_client()
    if current.role == "owner":
        query = supabase.table("service_requests").select("*, installations(name), profiles!service_requests_technician_id_fkey(full_name)").eq("requested_by", current.user_id)
    else:
        query = supabase.table("service_requests").select("*, installations(name), profiles!service_requests_technician_id_fkey(full_name)").eq("technician_id", current.user_id)
    if status:
        query = query.eq("status", status)
    query = query.order("created_at", desc=True)
    result = query.execute()
    items = []
    for r in result.data or []:
        r["installation_name"] = r.get("installations", {}).get("name")
        r["technician_name"] = r.get("profiles", {}).get("full_name")
        items.append(ServiceRequestResponse.model_validate(r))
    return items


@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_service_request(request_id: UUID, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("service_requests").select("*, installations(name), profiles!service_requests_technician_id_fkey(full_name)").eq("id", str(request_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service request not found")
    # authorization
    if current.role == "owner" and result.data["requested_by"] != current.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current.role == "technician" and result.data.get("technician_id") != current.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    r = result.data
    r["installation_name"] = r.get("installations", {}).get("name")
    r["technician_name"] = r.get("profiles", {}).get("full_name")
    return ServiceRequestResponse.model_validate(r)


@router.patch("/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(request_id: UUID, payload: ServiceRequestUpdate, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    existing = supabase.table("service_requests").select("*").eq("id", str(request_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Service request not found")
    data = existing.data
    # authorization
    if current.role == "owner":
        if data["requested_by"] != current.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        # owners can only cancel if still requested
        if payload.status and payload.status not in ("cancelled",):
            raise HTTPException(status_code=400, detail="Owners can only cancel requests")
    elif current.role == "technician":
        if data.get("technician_id") != current.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        # technicians can transition status
        allowed = {"assigned", "in_progress", "completed"}
        if payload.status and payload.status not in allowed:
            raise HTTPException(status_code=400, detail="Invalid status transition")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    from datetime import datetime
    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.utcnow().isoformat()
    result = supabase.table("service_requests").update(update_data).eq("id", str(request_id)).execute()
    updated = result.data[0]
    # enrich
    inst = supabase.table("installations").select("name").eq("id", updated["installation_id"]).single().execute()
    tech_name = None
    if updated.get("technician_id"):
        prof = supabase.table("profiles").select("full_name").eq("id", updated["technician_id"]).single().execute()
        tech_name = prof.data.get("full_name") if prof.data else None
    updated["installation_name"] = inst.data.get("name") if inst.data else None
    updated["technician_name"] = tech_name
    return ServiceRequestResponse.model_validate(updated)


@router.post("/{request_id}/records", response_model=ServiceRecordResponse, status_code=201)
async def create_service_record(request_id: UUID, payload: ServiceRecordCreate, current: TokenData = Depends(get_current_user)):
    if current.role != "technician":
        raise HTTPException(status_code=403, detail="Technician access required")
    supabase = get_supabase_client()
    _verify_technician_assigned(supabase, request_id, current.user_id)
    data = payload.model_dump()
    data["technician_id"] = current.user_id
    result = supabase.table("service_records").insert(data).execute()
    return ServiceRecordResponse.model_validate(result.data[0])


@router.get("/installations/{installation_id}/service-history", response_model=ServiceHistoryResponse)
async def get_service_history(installation_id: UUID, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    # verify access
    if current.role == "owner":
        _verify_installation_owner(supabase, installation_id, current.user_id)
    else:
        # technician must have a request for this installation
        sr = supabase.table("service_requests").select("id").eq("installation_id", str(installation_id)).eq("technician_id", current.user_id).limit(1).execute()
        if not sr.data:
            raise HTTPException(status_code=403, detail="Not authorized")
    requests_res = supabase.table("service_requests").select("*").eq("installation_id", str(installation_id)).order("created_at", desc=True).execute()
    records_res = supabase.table("service_records").select("*").eq("installation_id", str(installation_id)).order("performed_at", desc=True).execute()
    requests = [ServiceRequestResponse.model_validate(r) for r in (requests_res.data or [])]
    records = [ServiceRecordResponse.model_validate(r) for r in (records_res.data or [])]
    return ServiceHistoryResponse(service_requests=requests, service_records=records, total_requests=len(requests))