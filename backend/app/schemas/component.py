from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from app.models.enums import ComponentType


class ComponentBase(BaseModel):
    component_type: ComponentType
    manufacturer: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None


class ComponentCreate(ComponentBase):
    installation_id: UUID


class ComponentUpdate(BaseModel):
    manufacturer: Optional[str] = Field(default=None, min_length=1, max_length=100)
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None


class ComponentResponse(ComponentBase):
    id: UUID
    installation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WarrantyStatus(str, Enum):
    ACTIVE = "Active"
    EXPIRING_SOON = "Expiring Soon"
    EXPIRED = "Expired"
    UNKNOWN = "Unknown"


class WarrantyResponse(BaseModel):
    component_id: UUID
    component_type: ComponentType
    manufacturer: str
    model: str
    serial_number: Optional[str]
    warranty_start: Optional[date]
    warranty_end: Optional[date]
    status: WarrantyStatus
    days_remaining: Optional[int]

    model_config = ConfigDict(from_attributes=True)