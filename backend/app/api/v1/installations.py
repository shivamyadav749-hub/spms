from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List
from app.core.security import get_current_owner, TokenData
from app.services.supabase_client import get_supabase_client
from app.schemas.installation import InstallationCreate, InstallationUpdate, InstallationResponse, InstallationListResponse

router = APIRouter()


@router.get("", response_model=InstallationListResponse)
async def list_installations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current: TokenData = Depends(get_current_owner),
):
    supabase = get_supabase_client()
    offset = (page - 1) * page_size
    result = (
        supabase.table("installations")
        .select("*", count="exact")
        .eq("owner_id", current.user_id)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    items = [InstallationResponse.model_validate(i) for i in (result.data or [])]
    total = result.count or 0
    return InstallationListResponse(installations=items, total=total)


@router.post("", response_model=InstallationResponse, status_code=201)
async def create_installation(payload: InstallationCreate, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    data = payload.model_dump()
    data["owner_id"] = current.user_id
    result = supabase.table("installations").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create installation")
    return InstallationResponse.model_validate(result.data[0])


@router.get("/{installation_id}", response_model=InstallationResponse)
async def get_installation(installation_id: UUID, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    result = supabase.table("installations").select("*").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    return InstallationResponse.model_validate(result.data)


@router.patch("/{installation_id}", response_model=InstallationResponse)
async def update_installation(installation_id: UUID, payload: InstallationUpdate, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("installations").update(data).eq("id", str(installation_id)).eq("owner_id", current.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Installation not found")
    return InstallationResponse.model_validate(result.data[0])