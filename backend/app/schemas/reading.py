from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.models.enums import DataSource


class ReadingBase(BaseModel):
    voltage_v: Optional[float] = Field(default=None, ge=0)
    current_a: Optional[float] = Field(default=None, ge=0)
    power_w: float = Field(..., ge=0)
    temperature_c: Optional[float] = Field(default=None, ge=-50, le=150)
    irradiance_w_m2: Optional[float] = Field(default=None, ge=0)
    interval_energy_kwh: Optional[float] = Field(default=None, ge=0)
    data_source: DataSource = DataSource.SIMULATED


class ReadingCreate(ReadingBase):
    timestamp: datetime


class ReadingResponse(ReadingBase):
    id: UUID
    installation_id: UUID
    timestamp: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadingQueryParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class SimulateRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=90)
    scenario: str = Field(default="normal", pattern="^(normal|cloudy|decline|high_temp|missing|abnormal)$")