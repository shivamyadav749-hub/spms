# SPMS API Reference (v1)

Base URL: `/api/v1`

All endpoints require a **Bearer** token obtained from Supabase Auth (`Authorization: Bearer <access_token>`).

---

## Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | – | Service health, DB connectivity, Nebius config |

---

## Authentication & Profile
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/me` | Owner / Technician | Current user profile (id, email, role, full_name, phone) |
| PATCH | `/auth/me/profile` | Owner / Technician | Update `full_name` and/or `phone` |

---

## Installations (Owner only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/installations` | Owner | Paginated list of own installations |
| POST | `/installations` | Owner | Create installation (auto‑generates `spms_id`) |
| GET | `/installations/{installation_id}` | Owner | Single installation detail |
| PATCH | `/installations/{installation_id}` | Owner | Update installation fields |

---

## Readings & Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/installations/{installation_id}/dashboard` | Owner | Aggregated metrics, daily/weekly/monthly generation, performance comparison, alerts summary |
| GET | `/installations/{installation_id}/readings` | Owner | Paginated raw readings (query: `start_date`, `end_date`, `limit`, `offset`) |
| POST | `/installations/{installation_id}/simulate` | Owner | Generate & store simulated readings (body: `days`, `scenario`) |

---

## Performance
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/installations/{installation_id}/performance` | Owner | Same data as dashboard but with optional `period` (`today`, `last_7_days`, `last_30_days`, `custom`) and `custom_start`/`custom_end` |

---

## Alerts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/installations/{installation_id}/alerts` | Owner | List alerts (optional `status` filter) |
| PATCH | `/alerts/{alert_id}` | Owner | Update alert `status` (`acknowledged` / `resolved`) |

---

## Components & Warranties
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/installations/{installation_id}/components` | Owner | List components |
| POST | `/installations/{installation_id}/components` | Owner | Add component (panel / inverter / other) |
| PATCH | `/components/{component_id}` | Owner | Update component / warranty dates |
| GET | `/installations/{installation_id}/warranties` | Owner | Warranty status per component (Active / Expiring Soon / Expired / Unknown) |

---

## AI Assistant
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | Owner / Technician | Grounded chat – body `ChatRequest` (message, optional `session_id`, `installation_id`) |
| POST | `/ai/analyze` | Owner / Technician | Structured analysis – body `AnalyzeRequest` (installation_id, analysis_type) |
| GET | `/ai/sessions` | Owner / Technician | List chat sessions for current user |
| GET | `/ai/sessions/{session_id}/messages` | Owner / Technician | Messages of a session |
| GET | `/ai/suggested-questions` | Owner / Technician | Pre‑defined question list (requires `installation_id` query) |

---

## Technicians (public search, technician profile mgmt)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/technicians` | Owner / Technician | Search – query: `city`, `postal_code`, `latitude`, `longitude`, `radius_km`, `skills[]`, `limit`, `offset` |
| GET | `/technicians/nearby` | Owner / Technician | Convenience – `latitude`, `longitude`, `radius_km`, `skills[]`, `limit` |
| GET | `/technicians/profile` | Technician | Own technician profile |
| PATCH | `/technicians/profile` | Technician | Update own profile (skills, area, availability) |

---

## Service Requests
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/service-requests` | Owner | Create request (installation_id, issue_category, description) |
| GET | `/service-requests` | Owner / Technician | List own requests (owner) or assigned (technician); optional `status` filter |
| GET | `/service-requests/{request_id}` | Owner / Technician | Detail (owner if requester, technician if assigned) |
| PATCH | `/service-requests/{request_id}` | Owner / Technician | Owner may **cancel** (`status=cancelled`); Technician may transition `assigned → in_progress → completed` |
| POST | `/service-requests/{request_id}/records` | Technician | Add service record (description, findings, repair_notes, performed_at) |
| GET | `/installations/{installation_id}/service-history` | Owner / Technician | Combined list of requests + records for an installation |

---

## Common Response Envelopes
* **Success** – HTTP 200/201 with JSON body matching the schema.
* **Error** – HTTP 4xx/5xx with `{ "detail": "message", "code?": "string" }`.

---

## Rate Limits
* AI endpoints (`/ai/chat`, `/ai/analyze`) – 10 requests / minute per user (configurable via `AI_RATE_LIMIT_REQUESTS` / `AI_RATE_LIMIT_WINDOW`).
* Other endpoints – no explicit limit (rely on platform).

---

## Versioning
Current version **v1**. Future breaking changes will be under `/api/v2/`.