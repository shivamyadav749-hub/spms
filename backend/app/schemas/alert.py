from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.models.enums import AlertSeverity, AlertStatus


class AlertBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    severity: AlertSeverity
    title: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=1000)


class AlertCreate(AlertBase):
    installation_id: UUID


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None


class AlertResponse(AlertBase):
    id: UUID
    installation_id: UUID
    status: AlertStatus
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
    active_count: int