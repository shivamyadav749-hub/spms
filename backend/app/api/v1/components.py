from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List
from app.core.security import get_current_owner, TokenData
from app.services.supabase_client import get_supabase_client
from app.schemas.component import ComponentCreate, ComponentUpdate, ComponentResponse, WarrantyResponse
from datetime import date

router = APIRouter()


def _check_installation_ownership(supabase, installation_id: UUID, user_id: str):
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=404, detail="Installation not found")


@router.get("/{installation_id}/components", response_model=List[ComponentResponse])
async def list_components(installation_id: UUID, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    _check_installation_ownership(supabase, installation_id, current.user_id)
    result = supabase.table("components").select("*").eq("installation_id", str(installation_id)).execute()
    return [ComponentResponse.model_validate(c) for c in (result.data or [])]


@router.post("/{installation_id}/components", response_model=ComponentResponse, status_code=201)
async def create_component(installation_id: UUID, payload: ComponentCreate, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    _check_installation_ownership(supabase, installation_id, current.user_id)
    data = payload.model_dump()
    data["installation_id"] = str(installation_id)
    result = supabase.table("components").insert(data).execute()
    return ComponentResponse.model_validate(result.data[0])


@router.patch("/components/{component_id}", response_model=ComponentResponse)
async def update_component(component_id: UUID, payload: ComponentUpdate, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    # verify ownership through component's installation
    comp = supabase.table("components").select("installation_id").eq("id", str(component_id)).single().execute()
    if not comp.data:
        raise HTTPException(status_code=404, detail="Component not found")
    _check_installation_ownership(supabase, UUID(comp.data["installation_id"]), current.user_id)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("components").update(data).eq("id", str(component_id)).execute()
    return ComponentResponse.model_validate(result.data[0])


@router.get("/{installation_id}/warranties", response_model=List[WarrantyResponse])
async def list_warranties(installation_id: UUID, current: TokenData = Depends(get_current_owner)):
    supabase = get_supabase_client()
    _check_installation_ownership(supabase, installation_id, current.user_id)
    result = supabase.table("components").select("*").eq("installation_id", str(installation_id)).execute()
    warranties = []
    for c in result.data or []:
        warranty_end = c.get("warranty_end")
        status = "Unknown"
        days_remaining = None
        if warranty_end:
            end_date = date.fromisoformat(warranty_end)
            days_remaining = (end_date - date.today()).days
            if days_remaining < 0:
                status = "Expired"
            elif days_remaining <= 30:
                status = "Expiring Soon"
            else:
                status = "Active"
        warranties.append(WarrantyResponse(
            component_id=c["id"],
            component_type=c["component_type"],
            manufacturer=c["manufacturer"],
            model=c["model"],
            serial_number=c.get("serial_number"),
            warranty_start=c.get("warranty_start"),
            warranty_end=warranty_end,
            status=status,
            days_remaining=days_remaining,
        ))
    return warranties