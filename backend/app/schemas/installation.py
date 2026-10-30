from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from app.models.enums import MonitoringMode


class InstallationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    address: Optional[str] = Field(default=None, max_length=200)
    city: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    capacity_kw: float = Field(..., gt=0, le=1000)
    installed_at: date
    monitoring_mode: MonitoringMode = MonitoringMode.SIMULATED


class InstallationCreate(InstallationBase):
    pass


class InstallationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    address: Optional[str] = Field(default=None, max_length=200)
    city: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    capacity_kw: Optional[float] = Field(default=None, gt=0, le=1000)
    installed_at: Optional[date] = None
    monitoring_mode: Optional[MonitoringMode] = None


class InstallationResponse(InstallationBase):
    id: UUID
    spms_id: str
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstallationListResponse(BaseModel):
    installations: list[InstallationResponse]
    total: int