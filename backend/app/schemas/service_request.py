from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.models.enums import ServiceRequestStatus


class ServiceRequestBase(BaseModel):
    issue_category: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=2000)


class ServiceRequestCreate(ServiceRequestBase):
    installation_id: UUID


class ServiceRequestUpdate(BaseModel):
    status: Optional[ServiceRequestStatus] = None
    technician_id: Optional[UUID] = None


class ServiceRequestResponse(ServiceRequestBase):
    id: UUID
    installation_id: UUID
    requested_by: UUID
    technician_id: Optional[UUID]
    status: ServiceRequestStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    installation_name: Optional[str] = None
    technician_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceRecordBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    findings: Optional[str] = Field(default=None, max_length=5000)
    repair_notes: Optional[str] = Field(default=None, max_length=5000)
    performed_at: datetime


class ServiceRecordCreate(ServiceRecordBase):
    service_request_id: UUID
    installation_id: UUID


class ServiceRecordResponse(ServiceRecordBase):
    id: UUID
    service_request_id: UUID
    installation_id: UUID
    technician_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceHistoryResponse(BaseModel):
    service_requests: List[ServiceRequestResponse]
    service_records: List[ServiceRecordResponse]
    total_requests: int