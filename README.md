# SPMS – Solar Performance Monitoring System

A full‑stack, AI‑enabled web application for homeowners and solar installers to monitor generation, diagnose issues, manage warranties, and find nearby technicians.

---

## Architecture

```
spms/
├─ frontend/          # React + TypeScript + Vite + Tailwind
│  ├─ src/
│  │  ├─ components/ # reusable UI (Button, Card, Input, …)
│  │  ├─ pages/      # page components (Dashboard, AIAssistant, …)
│  │  ├─ hooks/      # useAuth, data‑fetching hooks
│  │  ├─ lib/        # Supabase client, typed API wrapper
│  │  └─ …
│  └─ package.json
├─ backend/           # FastAPI (Python 3.11+)
│  ├─ app/
│  │  ├─ api/v1/     # REST endpoints
│  │  ├─ core/       # config, security, rate‑limit
│  │  ├─ services/   # simulator, performance engine, AI service
│  │  ├─ schemas/    # Pydantic request/response models
│  │  └─ …
│  ├─ requirements.txt
│  └─ tests/
├─ supabase/
│  ├─ migrations/
│  │  ├─ 001_init_schema.sql
│  │  └─ 002_rls_policies.sql
│  └─ seed.sql
├─ docs/
│  ├─ API.md
│  └─ DEPLOYMENT.md
├─ scripts/
│  └─ demo.sh
├─ .env.example
├─ .gitignore
└─ LICENSE
```

---

## Features

| Area | Highlights |
|------|------------|
| **Dashboard** | Real‑time power, daily/monthly energy, panel temperature, performance ratio, alerts – all charts via Recharts. |
| **Simulated data generator** | Deterministic, seeded scenarios (normal, cloudy, decline, high‑temp, missing, abnormal). |
| **Performance engine** | Energy integration, expected generation from solar geometry, anomaly detection (low generation, high temperature, stale data). |
| **AI Solar Assistant** | Grounded chat (Nebius / NVIDIA Nemotron) – never invents numbers, falls back to rule‑based answer when API key missing. |
| **Warranty management** | Component‑level warranty cards, status (Active / Expiring Soon / Expired / Unknown), 30‑day reminder alerts. |
| **Technician directory** | City / postal‑code search, geolocation radius (5/10/25 km), skill filter, Haversine distance. |
| **Service‑request workflow** | Owner creates → Technician assigned → In‑Progress → Completed, with service records. |
| **Role‑based access** | Owner vs Technician, enforced by Supabase RLS and FastAPI dependencies. |
| **Responsive, accessible UI** | Mobile‑first, WCAG 2.2 AA, colour‑plus‑text for severity, focus‑visible, ARIA labels. |
| **Demo mode banner** | Persistent “DEMO MODE – Simulated solar data. Not live hardware measurements.” |

---

## Technology Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React‑Router 6, Recharts, Lucide‑React, Supabase JS client.
* **Backend**: Python 3.11+, FastAPI, Pydantic 2, Supabase‑py (REST), OpenAI‑compatible client for Nebius.
* **Database / Auth**: Supabase (PostgreSQL + Auth + Row Level Security).
* **AI**: Nebius Token Factory – NVIDIA Nemotron 3 Ultra (configurable via `NEBIUS_MODEL`).
* **Deployment**: Vercel (frontend), any Python‑compatible host (Render, Railway, Fly.io) for backend, Supabase managed.

---

## Local Setup

### Prerequisites
* Node ≥ 18, npm
* Python ≥ 3.11 (3.14 works if Rust/MSVC toolchain present)
* Supabase project (free tier)
* Nebius API key (optional – AI falls back to rule‑based)

### 1. Clone & configure environment
```bash
git clone <repo-url>
cd spms

# Frontend env
cp frontend/.env.example frontend/.env   # edit VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

# Backend env
cp backend/.env.example backend/.env     # edit SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEBIUS_API_KEY, NEBIUS_BASE_URL, NEBIUS_MODEL, FRONTEND_ORIGIN
```

### 2. Supabase
1. Create a new Supabase project.
2. In the SQL editor run `supabase/migrations/001_init_schema.sql` then `supabase/migrations/002_rls_policies.sql`.
3. Enable **Email** authentication.
4. Run `supabase/seed.sql` – replace the placeholder UUIDs (`YOUR_DEMO_OWNER_AUTH_UUID`, `YOUR_DEMO_TECH_AUTH_UUID`) with the `auth.users.id` values you obtain after signing up the demo users.

### 3. Backend
```bash
cd backend
# Windows: install Visual Studio Build Tools (C++ workload) first
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api → backend)
```

Open the frontend URL, register an **owner**, create an installation, click **Simulate** on the dashboard – simulated readings appear instantly.

Register a **technician**, verify in Supabase (`technician_profiles.verification_status = 'verified'`) – they appear in the Technicians search.

---

## Running Tests

*Backend* (requires installed deps):
```bash
cd backend
pytest -q
```

*Frontend*:
```bash
cd frontend
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
```

---

## Deployment

See `docs/DEPLOYMENT.md` for step‑by‑step guides:

* Frontend → Vercel (set `VITE_*` env vars)
* Backend → Render / Railway / Fly.io (set backend env vars, expose port 8000)
* Supabase – already managed
* DNS & TLS – point custom domain, enable HTTPS

---

## Known Limitations

* No email / SMS / push notifications (in‑app only).
* AI requires a valid Nebius key; otherwise rule‑based fallback is used.
* Distance search uses Haversine formula – sufficient for demo, replace with PostGIS for production scale.
* Python 3.14 on Windows needs Rust/MSVC to build `pydantic‑core`; use Python 3.11‑3.12 if you lack the toolchain.

---

## License

MIT – see `LICENSE`.