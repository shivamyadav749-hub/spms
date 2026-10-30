from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.models.enums import VerificationStatus


class TechnicianProfileBase(BaseModel):
    skills: List[str] = Field(default_factory=list)
    service_area: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_available: bool = True


class TechnicianProfileCreate(TechnicianProfileBase):
    pass


class TechnicianProfileUpdate(BaseModel):
    skills: Optional[List[str]] = None
    service_area: Optional[str] = Field(default=None, min_length=1, max_length=100)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_available: Optional[bool] = None


class TechnicianProfileResponse(TechnicianProfileBase):
    user_id: UUID
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime
    full_name: Optional[str] = None
    distance_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class TechnicianSearchParams(BaseModel):
    city: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    radius_km: int = Field(default=10, ge=1, le=100)
    skills: Optional[List[str]] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)