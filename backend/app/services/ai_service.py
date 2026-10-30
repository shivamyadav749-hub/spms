import httpx
from typing import Optional, List, Dict, Any
from uuid import UUID
import json
import logging

from app.core.config import settings
from app.services.performance_engine import performance_engine
from app.services.supabase_client import get_supabase_client
from app.schemas.ai import ChatRequest, ChatResponse, AnalyzeRequest, AnalyzeResponse, SuggestedQuestionsResponse
from app.models.enums import ChatRole

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.client = None
        self._init_client()
    
    def _init_client(self):
        if settings.NEBIUS_API_KEY:
            self.client = httpx.AsyncClient(
                base_url=settings.NEBIUS_BASE_URL,
                headers={"Authorization": f"Bearer {settings.NEBIUS_API_KEY}"},
                timeout=30.0
            )
        else:
            logger.warning("NEBIUS_API_KEY not configured, AI service will use fallback responses")
    
    async def close(self):
        if self.client:
            await self.client.aclose()
    
    def _build_context(self, installation_id: UUID, request: ChatRequest) -> Dict[str, Any]:
        context = {
            "installation_id": str(installation_id),
            "user_question": request.message,
        }
        
        perf_data = performance_engine.calculate_performance(installation_id)
        context["performance"] = {
            "current_power_w": perf_data["metrics"].current_power_w,
            "energy_today_kwh": perf_data["metrics"].energy_today_kwh,
            "energy_this_month_kwh": perf_data["metrics"].energy_this_month_kwh,
            "panel_temperature_c": perf_data["metrics"].panel_temperature_c,
            "performance_ratio": perf_data["metrics"].performance_ratio,
            "last_updated": perf_data["metrics"].last_updated.isoformat(),
            "data_source": perf_data["metrics"].data_source,
        }
        
        alerts_result = get_supabase_client().table("alerts") \
            .select("*") \
            .eq("installation_id", str(installation_id)) \
            .eq("status", "active") \
            .execute()
        context["active_alerts"] = alerts_result.data or []
        
        components_result = get_supabase_client().table("components") \
            .select("*") \
            .eq("installation_id", str(installation_id)) \
            .execute()
        context["components"] = components_result.data or []
        
        warranty_info = []
        for comp in context["components"]:
            if comp.get("warranty_end"):
                from datetime import date
                warranty_end = date.fromisoformat(comp["warranty_end"])
                days_remaining = (warranty_end - date.today()).days
                status = "Active"
                if days_remaining < 0:
                    status = "Expired"
                elif days_remaining <= 30:
                    status = "Expiring Soon"
                warranty_info.append({
                    "component": f"{comp['manufacturer']} {comp['model']}",
                    "type": comp["component_type"],
                    "warranty_end": comp["warranty_end"],
                    "status": status,
                    "days_remaining": days_remaining
                })
        context["warranties"] = warranty_info
        
        service_result = get_supabase_client().table("service_requests") \
            .select("*, service_records(*)") \
            .eq("installation_id", str(installation_id)) \
            .order("created_at", desc=True) \
            .limit(5) \
            .execute()
        context["service_history"] = service_result.data or []
        
        return context
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        perf = context.get("performance", {})
        alerts = context.get("active_alerts", [])
        warranties = context.get("warranties", [])
        history = context.get("service_history", [])
        
        prompt = f"""You are the SPMS AI Solar Assistant. You help homeowners understand their solar system performance using ONLY the provided data context.

CURRENT SYSTEM DATA (ALL SIMULATED - NOT LIVE HARDWARE):
- Current Power: {perf.get('current_power_w', 0):.1f} W ({perf.get('current_power_w', 0)/1000:.2f} kW)
- Energy Today: {perf.get('energy_today_kwh', 0):.2f} kWh
- Energy This Month: {perf.get('energy_this_month_kwh', 0):.2f} kWh
- Panel Temperature: {perf.get('panel_temperature_c', 'N/A')}°C
- Performance Ratio: {perf.get('performance_ratio', 0)*100:.1f}%
- Last Updated: {perf.get('last_updated', 'N/A')}
- Data Source: {perf.get('data_source', 'simulated')} (DEMO MODE)

ACTIVE ALERTS: {len(alerts)}
"""
        for alert in alerts:
            prompt += f"- [{alert['severity'].upper()}] {alert['title']}: {alert['message']}\n"
        
        prompt += "\nWARRANTY STATUS:\n"
        for w in warranties:
            prompt += f"- {w['component']} ({w['type']}): {w['status']} (expires {w['warranty_end']}, {w['days_remaining']} days)\n"
        
        prompt += "\nRECENT SERVICE HISTORY:\n"
        for sr in history[:3]:
            prompt += f"- {sr['created_at'][:10]}: {sr['issue_category']} - {sr['status']}\n"
            if sr.get('service_records'):
                for rec in sr['service_records']:
                    prompt += f"  * {rec['performed_at'][:10]}: {rec['description']}\n"
        
        prompt += """
RULES:
1. NEVER invent readings, dates, or measurements. Only use the data provided above.
2. If data is insufficient, say what's missing.
3. Explain technical terms simply (e.g., "1 kWh = 1 unit of electricity").
4. Distinguish: observed fact, detected anomaly, possible explanation, recommended next step.
5. Never claim a physical component has failed based on simulated data.
6. Keep responses concise and helpful.
7. If asked for exact numbers, use the calculated values above.
8. Always note this is DEMO MODE with simulated data.
"""
        return prompt
    
    async def chat(self, request: ChatRequest, user_id: str) -> ChatResponse:
        if not request.installation_id:
            raise ValueError("installation_id required for chat")
        
        context = self._build_context(request.installation_id, request)
        system_prompt = self._build_system_prompt(context)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.message}
        ]
        
        session_id = request.session_id
        if not session_id:
            supabase = get_supabase_client()
            session_result = supabase.table("chat_sessions").insert({
                "user_id": user_id,
                "installation_id": str(request.installation_id),
                "title": request.message[:50] + "..." if len(request.message) > 50 else request.message
            }).execute()
            session_id = session_result.data[0]["id"]
            
            supabase.table("chat_messages").insert([
                {"session_id": session_id, "role": "user", "content": request.message},
            ]).execute()
        else:
            supabase = get_supabase_client()
            supabase.table("chat_messages").insert({
                "session_id": session_id, "role": "user", "content": request.message
            }).execute()
        
        assistant_message = ""
        model_used = "fallback"
        
        if self.client:
            try:
                response = await self.client.post(
                    "/chat/completions",
                    json={
                        "model": settings.NEBIUS_MODEL,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 1000
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    assistant_message = data["choices"][0]["message"]["content"]
                    model_used = settings.NEBIUS_MODEL
                else:
                    logger.error(f"Nebius API error: {response.status_code} - {response.text}")
                    assistant_message = self._fallback_response(request.message, context)
            except Exception as e:
                logger.error(f"AI request failed: {e}")
                assistant_message = self._fallback_response(request.message, context)
        else:
            assistant_message = self._fallback_response(request.message, context)
        
        supabase = get_supabase_client()
        supabase.table("chat_messages").insert({
            "session_id": session_id, "role": "assistant", "content": assistant_message
        }).execute()
        
        data_refs = []
        if "energy today" in request.message.lower():
            data_refs.append({"type": "reading", "metric": "energy_today_kwh", "value": context["performance"]["energy_today_kwh"]})
        if "temperature" in request.message.lower():
            data_refs.append({"type": "reading", "metric": "panel_temperature_c", "value": context["performance"]["panel_temperature_c"]})
        if "alert" in request.message.lower():
            data_refs.append({"type": "alerts", "count": len(context["active_alerts"])})
        if "warranty" in request.message.lower():
            data_refs.append({"type": "warranties", "items": context["warranties"]})
        
        return ChatResponse(
            message=assistant_message,
            session_id=UUID(session_id),
            data_references=data_refs,
            model_used=model_used
        )
    
    def _fallback_response(self, question: str, context: Dict[str, Any]) -> str:
        q = question.lower()
        perf = context.get("performance", {})
        alerts = context.get("active_alerts", [])
        warranties = context.get("warranties", [])
        
        if "generate" in q or "electricity" in q or "energy" in q or "kwh" in q:
            return f"Based on your simulated data, you generated {perf.get('energy_today_kwh', 0):.1f} kWh today. This is {perf.get('performance_ratio', 0)*100:.0f}% of expected for current conditions. (DEMO MODE - simulated data)"
        
        if "temperature" in q or "hot" in q:
            temp = perf.get('panel_temperature_c')
            if temp:
                return f"Your panel temperature is {temp:.1f}°C. {'This is above the recommended 65°C threshold.' if temp > 65 else 'This is within normal operating range.'} (DEMO MODE - simulated data)"
            return "Temperature data not available in current readings."
        
        if "alert" in q:
            if alerts:
                return f"You have {len(alerts)} active alert(s). " + "; ".join([f"{a['title']}: {a['message']}" for a in alerts]) + " (DEMO MODE)"
            return "No active alerts at this time."
        
        if "warranty" in q:
            if warranties:
                return "Warranty status: " + "; ".join([f"{w['component']}: {w['status']}" for w in warranties]) + " (DEMO MODE)"
            return "No warranty information available."
        
        if "service" in q or "technician" in q or "repair" in q:
            history = context.get("service_history", [])
            if history:
                return f"Most recent service: {history[0]['created_at'][:10]} - {history[0]['issue_category']} ({history[0]['status']}). (DEMO MODE)"
            return "No service history found."
        
        if "compare" in q or "week" in q or "month" in q:
            return f"Your system is performing at {perf.get('performance_ratio', 0)*100:.0f}% of expected. For detailed comparison, please specify the time period. (DEMO MODE)"
        
        return f"I can help you understand your solar system performance. You generated {perf.get('energy_today_kwh', 0):.1f} kWh today at {perf.get('performance_ratio', 0)*100:.0f}% of expected. Ask me about generation, temperature, alerts, warranties, or service history. (DEMO MODE - simulated data)"
    
    async def analyze(self, request: AnalyzeRequest, user_id: str) -> AnalyzeResponse:
        context = self._build_context(request.installation_id, ChatRequest(message="", installation_id=request.installation_id))
        perf = context.get("performance", {})
        alerts = context.get("active_alerts", [])
        warranties = context.get("warranties", [])
        
        analysis_parts = []
        findings = []
        recommendations = []
        
        if request.analysis_type in ["performance", "all"]:
            ratio = perf.get('performance_ratio', 0)
            if ratio < 0.7:
                findings.append(f"Performance ratio is {ratio*100:.0f}%, below the 70% threshold")
                recommendations.append("Check for shading, panel soiling, or inverter issues")
            elif ratio < 0.9:
                findings.append(f"Performance ratio is {ratio*100:.0f}%, slightly below optimal")
                recommendations.append("Consider cleaning panels and verifying inverter operation")
            else:
                findings.append(f"Performance ratio is {ratio*100:.0f}%, within normal range")
        
        if request.analysis_type in ["alerts", "all"]:
            if alerts:
                critical = [a for a in alerts if a['severity'] == 'critical']
                warning = [a for a in alerts if a['severity'] == 'warning']
                findings.append(f"{len(alerts)} active alerts ({len(critical)} critical, {len(warning)} warning)")
                recommendations.append("Review and address active alerts, starting with critical ones")
            else:
                findings.append("No active alerts")
        
        if request.analysis_type in ["warranties", "all"]:
            expiring = [w for w in warranties if w['status'] == 'Expiring Soon']
            expired = [w for w in warranties if w['status'] == 'Expired']
            if expiring:
                findings.append(f"{len(expiring)} warranty(ies) expiring within 30 days")
                recommendations.append("Contact manufacturer or installer for warranty extension options")
            if expired:
                findings.append(f"{len(expired)} warranty(ies) have expired")
        
        analysis_text = " | ".join(findings) if findings else "System operating normally"
        
        return AnalyzeResponse(
            installation_id=request.installation_id,
            analysis=analysis_text,
            key_findings=findings,
            recommendations=recommendations,
            data_sources=["readings", "alerts", "components", "service_requests"],
            model_used="rules-based"
        )
    
    async def get_suggested_questions(self, installation_id: UUID) -> SuggestedQuestionsResponse:
        questions = [
            "How much electricity did I generate today?",
            "Why is my generation lower than expected?",
            "What does the high temperature alert mean?",
            "When does my inverter warranty expire?",
            "What should I check before calling a technician?",
            "Show me my latest service record",
            "Compare this week with last week",
            "Is my system performing normally?",
        ]
        return SuggestedQuestionsResponse(questions=questions)


ai_service = AIService()