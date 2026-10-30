#!/usr/bin/env bash
# SPMS End‑to‑End Demo Script
# Run after local stack is up (frontend on :5173, backend on :8000, Supabase seeded)

set -euo pipefail

API="http://localhost:8000/api/v1"
FRONT="http://localhost:5173"

echo "=== 1. Register Owner ==="
OWNER_EMAIL="demo-owner@example.com"
OWNER_PASS="demo1234"
OWNER_NAME="Demo Homeowner"
curl -s -X POST "$API/auth/me" -H "Content-Type: application/json" -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASS\",\"full_name\":\"$OWNER_NAME\",\"role\":\"owner\"}" >/dev/null || true
# Supabase sign‑up via API not exposed; use frontend or Supabase CLI. Here we just note.
echo "→ Create owner in Supabase Auth UI, then run seed.sql with returned UUID."

echo "=== 2. Create Installation (owner) ==="
# After owner exists and you have JWT (via login), you would:
# curl -X POST "$API/installations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Demo Home Solar","capacity_kw":5,"installed_at":"2024-01-15","city":"Springfield","postal_code":"62701","latitude":39.78,"longitude":-89.65}'
echo "→ Use the UI (Dashboard → Installations → Add) or curl with a valid owner token."

echo "=== 3. Simulate Readings ==="
# curl -X POST "$API/installations/<INST_ID>/simulate" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"days":7,"scenario":"normal"}'
echo "→ Click 'Refresh' on Dashboard or call simulate endpoint."

echo "=== 4. Verify Dashboard Data ==="
# curl -H "Authorization: Bearer $TOKEN" "$API/installations/<INST_ID>/dashboard"
echo "→ Open $FRONT/dashboard – you should see metric cards, charts, demo banner."

echo "=== 5. Register Technician ==="
TECH_EMAIL="demo-tech@example.com"
TECH_PASS="demo1234"
TECH_NAME="Demo Technician"
echo "→ Sign‑up as technician in UI, then in Supabase set technician_profiles.verification_status='verified' and is_available=true."

echo "=== 6. Search Technicians ==="
# curl -H "Authorization: Bearer $TOKEN" "$API/technicians?city=Springfield&radius_km=10"
echo "→ UI Technicians page shows the demo technician at ~2 km."

echo "=== 7. Create Service Request ==="
# curl -X POST "$API/service-requests" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"installation_id":"<INST_ID>","issue_category":"inspection","description":"Annual inspection"}'
echo "→ Owner UI → Service Requests → New Request."

echo "=== 8. Technician Updates Request ==="
# Technician logs in, sees request, PATCH status to in_progress, then POST /service-requests/<REQ_ID>/records
echo "→ Technician UI → Requests → Start Work → Complete → Add Record."

echo "=== 9. AI Assistant ==="
# curl -X POST "$API/ai/chat" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":"How much electricity did I generate today?","installation_id":"<INST_ID>"}'
echo "→ UI AI Assistant page – ask a question, get grounded answer (or fallback notice)."

echo "=== 10. Alerts & Warranties ==="
echo "→ Alerts page shows generated alerts; Warranties page shows component warranty status."

echo "=== Demo completed ==="
echo "Open $FRONT to explore the full UI."