from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.security import verify_token, get_current_user, TokenData
from app.services.supabase_client import get_supabase_client

router = APIRouter()


class ProfileResponse(BaseModel):
    id: str
    full_name: str | None
    role: str
    email: str
    phone: str | None


@router.get("/me", response_model=ProfileResponse)
async def get_me(current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    profile = supabase.table("profiles").select("*").eq("id", current.user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": current.user_id,
        "email": current.email,
        "full_name": profile.data.get("full_name"),
        "role": profile.data.get("role"),
        "phone": profile.data.get("phone"),
    }


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None


@router.patch("/me/profile", response_model=ProfileResponse)
async def update_profile(payload: ProfileUpdate, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("profiles").update(update_data).eq("id", current.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    data = result.data[0]
    return {
        "id": current.user_id,
        "email": current.email,
        "full_name": data.get("full_name"),
        "role": data.get("role"),
        "phone": data.get("phone"),
    }