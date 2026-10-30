from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List
from math import radians, sin, cos, sqrt, atan2
from app.core.security import get_current_user, TokenData
from app.services.supabase_client import get_supabase_client
from app.schemas.technician import TechnicianProfileResponse, TechnicianSearchParams, TechnicianProfileUpdate

router = APIRouter()


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


@router.get("", response_model=List[TechnicianProfileResponse])
async def list_technicians(
    params: TechnicianSearchParams = Depends(),
    current: TokenData = Depends(get_current_user),
):
    supabase = get_supabase_client()
    query = supabase.table("technician_profiles").select("*, profiles(full_name)").eq("verification_status", "verified").eq("is_available", True)
    if params.city:
        query = query.ilike("city", f"%{params.city}%")
    if params.postal_code:
        query = query.eq("postal_code", params.postal_code)
    if params.skills:
        # simple contains any skill
        for skill in params.skills:
            query = query.contains("skills", [skill])
    result = query.range(params.offset, params.offset + params.limit - 1).execute()
    techs = []
    user_lat = params.latitude
    user_lon = params.longitude
    for t in result.data or []:
        profile = t.copy()
        profile["full_name"] = t.get("profiles", {}).get("full_name")
        distance = None
        if user_lat is not None and user_lon is not None and t.get("latitude") and t.get("longitude"):
            distance = haversine(user_lat, user_lon, t["latitude"], t["longitude"])
            if distance > params.radius_km:
                continue
        profile["distance_km"] = round(distance, 2) if distance else None
        techs.append(TechnicianProfileResponse.model_validate(profile))
    # sort by distance if available
    techs.sort(key=lambda x: x.distance_km if x.distance_km is not None else float("inf"))
    return techs


@router.get("/nearby", response_model=List[TechnicianProfileResponse])
async def nearby_technicians(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: int = Query(10, ge=1, le=100),
    skills: List[str] | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current: TokenData = Depends(get_current_user),
):
    params = TechnicianSearchParams(latitude=latitude, longitude=longitude, radius_km=radius_km, skills=skills, limit=limit)
    return await list_technicians(params, current)


@router.get("/profile", response_model=TechnicianProfileResponse)
async def get_my_technician_profile(current: TokenData = Depends(get_current_user)):
    if current.role != "technician":
        raise HTTPException(status_code=403, detail="Technician access required")
    supabase = get_supabase_client()
    result = supabase.table("technician_profiles").select("*, profiles(full_name)").eq("user_id", current.user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Technician profile not found")
    data = result.data
    data["full_name"] = data.get("profiles", {}).get("full_name")
    return TechnicianProfileResponse.model_validate(data)


@router.patch("/profile", response_model=TechnicianProfileResponse)
async def update_my_technician_profile(payload: TechnicianProfileUpdate, current: TokenData = Depends(get_current_user)):
    if current.role != "technician":
        raise HTTPException(status_code=403, detail="Technician access required")
    supabase = get_supabase_client()
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("technician_profiles").update(data).eq("user_id", current.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Technician profile not found")
    data = result.data[0]
    # fetch name
    prof = supabase.table("profiles").select("full_name").eq("id", current.user_id).single().execute()
    data["full_name"] = prof.data.get("full_name") if prof.data else None
    return TechnicianProfileResponse.model_validate(data)