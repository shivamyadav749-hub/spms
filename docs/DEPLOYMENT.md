# SPMS Deployment Guide

## Overview
* **Frontend** – static SPA, deployed to **Vercel** (or Netlify, Cloudflare Pages).
* **Backend** – FastAPI service, deployed to any container/Python host (Render, Railway, Fly.io, Azure Container Apps, AWS Elastic Beanstalk, GCP Cloud Run).
* **Database & Auth** – Supabase (managed PostgreSQL + Auth + Realtime). No self‑hosted DB required.

---

## 1. Supabase Setup (once)

1. Create a Supabase project (free tier OK).
2. In **SQL Editor** run the two migration files in order:
   * `supabase/migrations/001_init_schema.sql`
   * `supabase/migrations/002_rls_policies.sql`
3. Enable **Email** provider under *Authentication → Providers*.
4. (Optional) Create the demo users via the Auth UI or `supabase auth signup` CLI, then run `supabase/seed.sql` replacing the placeholder UUIDs with the real `auth.users.id` values.

Take note of:
* **Project URL** → `SUPABASE_URL`
* **Service‑role key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` **(backend only)**
* **Anon / publishable key** → `VITE_SUPABASE_PUBLISHABLE_KEY` **(frontend only)**

---

## 2. Nebius AI (optional)

1. Sign up at **Nebius Token Factory**.
2. Create an API key.
3. Verify the model you intend to use is available (e.g. `nvidia/Nemotron-3-Ultra-550b-a55b`). If not, pick an available model and set `NEBIUS_MODEL` accordingly.
4. Record:
   * `NEBIUS_API_KEY`
   * `NEBIUS_BASE_URL` (default `https://api.studio.nebius.ai/v1`)
   * `NEBIUS_MODEL`

If you skip this, the AI Assistant will fall back to a safe rule‑based response and never expose a missing‑key error to the UI.

---

## 3. Frontend – Vercel

```bash
# In the repo root
cd frontend
# Ensure .env.production (or Vercel UI) contains:
# VITE_API_BASE_URL=https://<your-backend-host>/api/v1
# VITE_SUPABASE_URL=<project-url>
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Deploy
vercel --prod
```
*Build command*: `npm run build`  
*Output directory*: `dist`  
*Framework preset*: Vite (auto‑detected).

Vercel will automatically set `VERCEL_URL` etc.; ensure CORS `FRONTEND_ORIGIN` on the backend includes the Vercel domain (e.g. `https://spms.vercel.app`).

---

## 4. Backend – Render (example)

### Dockerfile (optional but recommended)

```Dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Render steps
1. New **Web Service** → connect repo → select `backend/` as root.
2. Build command: `pip install -r requirements.txt` (or use Docker).
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (Settings → Environment):
   * `SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `NEBIUS_API_KEY`
   * `NEBIUS_BASE_URL`
   * `NEBIUS_MODEL`
   * `FRONTEND_ORIGIN` = your Vercel URL (e.g. `https://spms.vercel.app`)
   * `ENVIRONMENT=production`
   * `LOG_LEVEL=INFO`
5. Deploy. Render provides a URL like `https://spms-backend.onrender.com`.

*Health check*: `GET /health` – Render can use it for readiness.

---

## 5. CORS & Security Checklist
* Backend `FRONTEND_ORIGIN` **exactly** matches the production frontend origin (no trailing slash).
* Supabase **service‑role key** never appears in frontend env.
* All secrets stored in platform secret managers (Vercel/Render env vars, not in repo).
* HTTPS enforced by both platforms automatically.
* Rate‑limit on AI endpoints active (`AI_RATE_LIMIT_REQUESTS`).

---

## 6. DNS & Custom Domain (optional)
1. Add domain in Vercel → configure `CNAME`/`A` records.
2. Add same domain in Render (or backend host) as a custom domain for the API, or keep API on a subdomain (`api.example.com`).
3. Update `FRONTEND_ORIGIN` and `VITE_API_BASE_URL` to the final URLs, redeploy both.

---

## 7. Post‑Deploy Verification
| Check | How |
|-------|-----|
| Frontend loads | Open Vercel URL – landing page, sign‑up works |
| Backend health | `curl https://<backend>/health` → `{ "status":"ok", "database":"connected", "nebius_configured":true }` |
| Auth flow | Register owner → create installation → simulate readings → dashboard shows data |
| Technician flow | Register technician → verify in Supabase → appears in Technicians search |
| AI chat | Ask “How much electricity did I generate today?” – receives grounded answer (or fallback notice) |
| RLS enforcement | Owner cannot read another owner’s installation (403) |
| Rate limit | Hit `/ai/chat` >10×/min → 429 response |

---

## 8. Scaling Considerations
* **Read‑heavy** – enable Supabase **read replicas** or use Supabase **pgbouncer** pooling.
* **AI latency** – consider caching frequent analyses or moving to async job queue (Celery + Redis) for long prompts.
* **Background jobs** – simulator endpoint is synchronous; for production ingest use a queue (e.g., Supabase Realtime + edge function).
* **Monitoring** – add Sentry (frontend + backend), Logtail / Datadog for logs, UptimeRobot for health checks.

---

## 9. Rollback Procedure
* Vercel – instantaneous via *Deployments* tab → *Promote to Production* previous build.
* Render – *Deployments* → *Rollback* to previous successful build.

---

## 10. Checklist for Production Release
- [ ] All env vars set in both platforms (no `.env` files in repo)
- [ ] Supabase migrations applied, seed data correct
- [ ] CORS origins exact match
- [ ] AI key valid, model reachable
- [ ] Health endpoint green
- [ ] Frontend builds without warnings (`npm run build`)
- [ ] Backend passes `pytest` (CI)
- [ ] Load test basic endpoints (optional)
- [ ] Documentation (`README.md`, `API.md`) published

---

*End of deployment guide.*