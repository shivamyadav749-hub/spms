from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List
from app.core.security import get_current_user, TokenData
from app.services.supabase_client import get_supabase_client
from app.services.ai_service import ai_service
from app.schemas.ai import ChatRequest, ChatResponse, AnalyzeRequest, AnalyzeResponse, SuggestedQuestionsResponse, ChatSessionResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current: TokenData = Depends(get_current_user)):
    # verify installation access
    supabase = get_supabase_client()
    if request.installation_id:
        if current.role == "owner":
            inst = supabase.table("installations").select("id").eq("id", str(request.installation_id)).eq("owner_id", current.user_id).single().execute()
        else:
            # technician access via assigned request
            inst = supabase.table("service_requests").select("installation_id").eq("installation_id", str(request.installation_id)).eq("technician_id", current.user_id).eq("status", "in_progress").single().execute()
        if not inst.data:
            raise HTTPException(status_code=403, detail="Not authorized for this installation")
    return await ai_service.chat(request, current.user_id)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    if current.role == "owner":
        inst = supabase.table("installations").select("id").eq("id", str(request.installation_id)).eq("owner_id", current.user_id).single().execute()
    else:
        inst = supabase.table("service_requests").select("installation_id").eq("installation_id", str(request.installation_id)).eq("technician_id", current.user_id).eq("status", "in_progress").single().execute()
    if not inst.data:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await ai_service.analyze(request, current.user_id)


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("chat_sessions").select("*, chat_messages(*)").eq("user_id", current.user_id).order("updated_at", desc=True).execute()
    sessions = []
    for s in result.data or []:
        sessions.append(ChatSessionResponse.model_validate(s))
    return sessions


@router.get("/sessions/{session_id}/messages", response_model=List[ChatSessionResponse])
async def get_session_messages(session_id: UUID, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    session = supabase.table("chat_sessions").select("*, chat_messages(*)").eq("id", str(session_id)).eq("user_id", current.user_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return [ChatSessionResponse.model_validate(session.data)]


@router.get("/suggested-questions", response_model=SuggestedQuestionsResponse)
async def suggested_questions(installation_id: UUID, current: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    inst = supabase.table("installations").select("id").eq("id", str(installation_id)).eq("owner_id", current.user_id).single().execute()
    if not inst.data:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await ai_service.get_suggested_questions(installation_id)