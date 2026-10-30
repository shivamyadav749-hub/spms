from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.models.enums import ChatRole


class ChatMessageBase(BaseModel):
    role: ChatRole
    content: str = Field(..., min_length=1, max_length=4000)


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: UUID
    session_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    installation_id: Optional[UUID] = None


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)


class ChatSessionResponse(ChatSessionBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[UUID] = None
    installation_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    message: str
    session_id: UUID
    data_references: List[dict] = []
    model_used: str


class AnalyzeRequest(BaseModel):
    installation_id: UUID
    analysis_type: str = Field(default="performance", pattern="^(performance|alerts|warranties|all)$")


class AnalyzeResponse(BaseModel):
    installation_id: UUID
    analysis: str
    key_findings: List[str]
    recommendations: List[str]
    data_sources: List[str]
    model_used: str


class SuggestedQuestionsResponse(BaseModel):
    questions: List[str]