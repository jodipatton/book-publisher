# Bedtime Storybook Companion — Backend

FastAPI service that owns the data model from PRD §Data Model, runs the safety classifier on every child turn, generates stub storybooks, and surfaces red-zone events to parents within seconds.

This is the API layer the PRD §Technical Architecture calls for. Frontend in this repo is currently Expo (scaffold convenience); the production frontend is native Swift/SwiftUI on iPadOS.

## Stack

- **Python 3.11**, **FastAPI 0.115**, **pydantic 2** with `pydantic-settings`
- **SQLAlchemy 2.x async** + **asyncpg** + **Alembic** migrations
- **Redis 7** (pinged at boot; will be used for session caching + rate limiting)
- **MinIO / S3-compatible** storage for storybook page images (bucket bootstrapped by `minio-init`)
- **uv** for fast, reproducible installs
- All services orchestrated via the root `docker-compose.yml`

## Run it

From the repo root:

```bash
docker compose up --build
```

That brings up:

- `db` — Postgres 16 on `:5432`
- `redis` — Redis 7 on `:6379`
- `minio` — MinIO on `:9000` (S3 API) + `:9001` (console; user `bsc_minio` / pass `bsc_minio_dev`)
- `minio-init` — one-shot, creates the `storybook-pages` bucket
- `api` — FastAPI on `:8000` (auto-reload, runs `alembic upgrade head` first)

OpenAPI docs at `http://localhost:8000/docs`. Health at `http://localhost:8000/healthz`.

## Point the Expo client at the API

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_OFFLINE=1 npm run web
```

The splash screen shows a green "Connected to …" banner when the API is reachable, falls back to a grey "Local-only" banner when `EXPO_PUBLIC_API_URL` is unset, or red if the URL is set but unreachable. Parent setup mirrors the parent + child + trusted-circle members to the API on save; the rest of the screens still talk to the local `AsyncStorage` store (see "What's wired vs. follow-up" below).

## Tests

In-memory SQLite via `aiosqlite` so the suite has no external dependencies:

```bash
cd backend
uv venv .venv
uv pip install -e ".[dev]"
.venv/bin/pytest -q
```

Six tests cover:

- `/healthz` and `/v1/personas` are public-readable
- Full green-path: parent setup → trusted circle → child profile → session → benign turn → 5-8 page storybook → share with circle member → empty safety-events list
- Red-zone path: phrase like `"I want to die"` returns the F-10 in-persona reply, the storybook inherits the red override, the parent dashboard surfaces a SafetyEvent with `parent_notified_at` set and conversation starters populated
- Sharing rejects recipients outside the parent's trusted circle
- Auth dependency rejects requests missing the `X-Parent-Id` header

## Auth (dev-stub)

`POST /v1/parents` is the unauthenticated bootstrap. It returns the new parent's UUID; pass that back as the `X-Parent-Id` header on every authenticated request.

Real production replaces this with **Sign in with Apple** (PRD NFR-2) and the **F-1 verifiable parental consent flow** (credit card transaction verification under the FTC's June 2025 rules). Disable the dev stub by setting `BSC_DEV_AUTH_ENABLED=false` — every authenticated route then returns 401.

## Data model

One ORM module per PRD §Data Model entity, in `app/models/`:

| File                      | Entity              |
| ------------------------- | ------------------- |
| `parent.py`               | ParentAccount       |
| `child.py`                | ChildProfile        |
| `persona.py`              | Persona             |
| `trusted_circle.py`       | TrustedCircleMember |
| `session_record.py`       | Session             |
| `turn.py`                 | Turn (child of Session) |
| `storybook.py`            | Storybook           |
| `page.py`                 | StorybookPage       |
| `safety_event.py`         | SafetyEvent         |
| `mood_entry.py`           | MoodEntry           |

Personas are seeded by the initial migration (`alembic/versions/20260509_0000_0001_init.py`) so the curated set is consistent across environments. The fourth slot (Owl) is the F-2 TBD-pending-clinical-advisory placeholder.

## Endpoints (v1)

| Method | Path                                      | Purpose                                                               |
| ------ | ----------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/healthz`                                | Liveness                                                              |
| POST   | `/v1/parents`                             | Bootstrap parent (no auth)                                            |
| GET    | `/v1/parents/me`                          | Current parent                                                        |
| GET    | `/v1/personas`                            | Curated persona catalog (public)                                      |
| GET    | `/v1/children`                            | Children for current parent                                           |
| POST   | `/v1/children`                            | Create child profile (with `session_time_limit_minutes`, F-18)        |
| GET    | `/v1/children/{id}`                       | Get child profile                                                     |
| PATCH  | `/v1/children/{id}`                       | Update name / age / persona / session limit                           |
| GET    | `/v1/trusted-circle`                      | List members                                                          |
| POST   | `/v1/trusted-circle`                      | Add member (name, relationship, email, alert opt-in)                  |
| DELETE | `/v1/trusted-circle/{id}`                 | Remove member                                                         |
| POST   | `/v1/sessions`                            | Start a session for a child + persona + mood; companion opener turn   |
| GET    | `/v1/sessions/{id}`                       | Fetch session with turns                                              |
| POST   | `/v1/sessions/{id}/turns`                 | Append child turn → safety classify → companion reply (or F-10 line)  |
| POST   | `/v1/sessions/{id}/storybook`             | Generate 5-8 page storybook (idempotent on retry)                     |
| GET    | `/v1/storybooks`                          | All storybooks for current parent's children                          |
| GET    | `/v1/storybooks/{id}`                     | Get storybook + pages                                                 |
| PATCH  | `/v1/storybooks/{id}/share`               | Update `shared_with`; rejects recipients outside the trusted circle   |
| GET    | `/v1/safety-events`                       | List red-zone events surfaced to this parent                          |
| POST   | `/v1/safety-events/{id}/acknowledge`      | Mark a red-zone event acknowledged                                    |

## Safety threshold flow (server-side)

Every child turn passes through `app/safety.py:classify`. On red:

1. The companion reply is the F-10 in-persona line ("…someone who loves you is going to help…"), not an LLM call.
2. A `SafetyEvent` is written with `parent_notified_at = now()` (the audit trail for the F-10 < 60s SLA), `child_disclosed_at = now()`, and three conversation starters keyed by reason.
3. The session's `highest_safety_zone` rolls up to red.
4. When the storybook is generated, a transcript-wide pass runs again; if any pass found red the storybook is marked with `safety_override_zone='red'` and surfaces to the parent regardless of the child's sharing choice.

Amber turns increment `ChildProfile.consecutive_amber_sessions`; green sessions reset it. F-11 elevation at >=5 to a clinical-advisory queue is not yet built — the counter is the data side; the queue is a follow-up.

## Cloud deploy (intentionally not in this scaffold)

The compose file is local-only. Real AWS or GCP standup needs:

- Terraform / CDK / Pulumi (RDS Postgres, ElastiCache Redis, S3 + CloudFront, ECS/Cloud Run, Secrets Manager) — pinned to **us-east-1** / **us-central1** for COPPA residency (NFR-3).
- IAM, KMS, VPC, security groups.
- Encryption at rest + in transit (NFR-2).
- A real secrets layer so `BSC_DATABASE_URL`, `BSC_S3_*` etc. don't live in compose.
- App Store distribution + COPPA verifiable consent + Apple Kids Category compliance — none of which the backend alone solves.

Marked as the next major milestone in the root README.

## What's wired vs. follow-up

**Wired:**

- All endpoints listed above
- Server-side safety classifier (mirror of client) with conversation starters
- Server-side stub AI provider (mirror of client) — same swap seam: drop in a real Claude / image-gen provider behind `app/ai/provider.py:StubAIProvider`
- 6/6 smoke tests
- Compose YAML validated, Dockerfile validated locally via uv install
- Alembic seeds the curated personas
- Expo client: API client (`src/api/client.ts`), connectivity banner on splash, `ParentSetupScreen` mirrors parent + child + trusted-circle to the API

**Follow-up (client-side migration is partial):**

- `ConversationScreen`, `StorybookScreen`, `LibraryScreen`, `ParentDashboardScreen` still read/write only the local `AsyncStorage` store. Wire them through `src/api/client.ts` so the conversation, the 5-8 page storybook generation, the share flow, and the red-zone alert all round-trip through the API.
- F-20 per-session $0.50 cost cap enforcement in `app/ai/provider.py`
- Real image generation + S3 upload + signed URLs replacing the emoji+palette placeholders on `StorybookPage`
- Trusted-circle invitation emails and lightweight account flow (F-15)
- Real Sign in with Apple (NFR-2) + COPPA verifiable consent (F-1, NFR-3) replacing the dev-stub auth
- Push/email/web-view delivery to trusted-circle recipients (F-8)
- Apple Kids Category compliance for the iOS frontend (NFR-4)
- Native Swift/SwiftUI iPadOS frontend per PRD §Technical Architecture
