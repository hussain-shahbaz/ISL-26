# PHASE 2 — Target Architecture & Execution Roadmap

> Goal: take the audited codebase (see `PHASE1_AUDIT.md`) from ~25% to a **10/10,  ready, integrated, deployable** Secure Online Examination System — with an intentional **distributed polyglot database** design, a professional **React + TypeScript** frontend, and **docker-compose** as the backbone for local dev, demo, and EC2 deployment.

---

## 1. Target Architecture

### 1.1 Distributed Polyglot Persistence (intentional, justified)

| Store | Purpose | Owned by |
|---|---|---|
| **PostgreSQL** | Relational source of truth: users, auth identities, sessions, exams, questions, enrollments, activation codes | auth-service, user-service, exam |
| **MongoDB** | Flexible/document + append-only: audit logs (hash chain), submissions/responses, grading results, risk analyses | log, student-exam, grade-cheat |
| **Redis** | Ephemeral + messaging: OTP, refresh-session cache, rate limiting, Celery broker/result, WebSocket pub/sub | auth, grade-cheat, gateway |
| **ChromaDB** | Vector store: answer embeddings for semantic plagiarism | grade-cheat |
| **Neo4j** | Graph analytics: students↔devices↔sessions↔answers↔exams; collusion rings, shared-device & multi-session detection, risk lineage | risk-service / grade-cheat |

> Rationale: each store is used where it is genuinely the best tool — this is the "polyglot persistence" pattern and gives a strong, defensible ADBMS narrative (relational integrity + document flexibility + cache + vector search + graph analytics).

### 1.2 Service topology (behind the gateway)

```
                          ┌─────────────────────────────┐
   Browser (React SPA) ──▶│  API Gateway (Express :3000) │
                          │  - JWT verify (shared spec)  │
                          │  - reverse proxy /api/*       │
                          │  - async audit logging        │
                          │  - rate limit / CORS / helmet  │
                          └───────────────┬───────────────┘
        ┌───────────────┬────────────────┼───────────────┬────────────────┐
        ▼               ▼                ▼               ▼                ▼
   auth-service    user-service       exam-svc     student-exam     grade-cheat (Py)
   :3001 PG/Redis  :3002 PG           :3003 PG     :3004 Mongo      :3005 Mongo/Redis/Chroma
        │                                                                  │
        └────────────────── log-service :3006 (Mongo, hash chain) ◀────────┘
                                   │
                            risk-service / Neo4j :3007
```

(Ports will be normalized & owned in one place — current code has collisions; final map lives in root `.env.example` + compose.)

### 1.3 Shared contracts (enforced everywhere)
- **JWT (single HS256 secret):** payload `{ user_id, username, role(student|teacher|admin), session_id, device_fingerprint_hash, exp }`.
- **Service-to-service:** one `SERVICE_SECRET` header name across all services + gateway.
- **Responses:** `{ status, data, message }`; errors `{ status:"error", error_code, message, timestamp }`.
- **Health:** `GET /health` → `{ module, status, dependencies, version }`.
- **Logging:** all services emit through gateway/log-service; no direct log writes.
- **Exam state machine:** `NOT_STARTED → DEVICE_VERIFIED → TEACHER_APPROVED → ACTIVATION_VALID → IN_PROGRESS → SUBMITTED → ANALYZING → COMPLETED` with 409 on invalid transitions.

### 1.4 Frontend
- **React 19 + TypeScript + Vite + Tailwind + shadcn/ui**, React Router, TanStack Query, Axios client, Zod, JWT/refresh handling.
- Areas: Auth (login/register/OTP/reset), Student (dashboard, device check, exam-taking with **server-synced timer** + tab/clipboard monitoring), Teacher (exam authoring, approvals, monitoring), Admin (approvals, users), **Risk & Audit dashboards**.

### 1.5 Infra / Deployment
- **Dockerfile per service** + root **`docker-compose.yml`** (all services + Postgres + Mongo + Redis + Neo4j + Chroma).
- `docker-compose.override.yml` for dev (hot reload), production compose for EC2.
- **Nginx** reverse proxy + TLS, single `.env`, healthchecks, named volumes.
- GitHub Actions CI (lint/test/build), basic deploy notes for EC2.

---

## 2. Execution Roadmap (sequenced, each step = meaningful commit(s))

### Stage A — Foundations & hygiene
- A1. Root workspace meta: `.gitignore` cleanup, root `README` rewrite, consolidate/trim drifted docs.
- A2. Unified root `.env.example` (all services, ports, secrets, DB URLs) + per-service alignment.
- A3. Remove dead code: `src/modules/user` stub, `sample/` duplicate auth-service, broken duplicate modules in grade-cheat.

### Stage B — Distributed DB layer
- B1. Provision Postgres/Mongo/Redis/Neo4j/Chroma via docker-compose.
- B2. Migrate auth + user + exam relational data to Postgres (Prisma), unify user model (kill 3-way split).
- B3. Seed scripts per store; shared connection config.

### Stage C — Security & integration core (P0/P1)
- C1. Unify JWT to shared spec; shared verify middleware; remove hardcoded secrets.
- C2. Wire gateway: mount proxy + async logging; unify `SERVICE_SECRET`; CORS/helmet/rate-limit.
- C3. Make exam/student-exam/grade-cheat validate JWT + propagate `req.user`.
- C4. Replace mocked inter-service calls with real HTTP.
- C5. Fix runtime bugs (auth Redis, exam `.toObject`/route order, student-exam timer/time, log hash-verify/genesis/cleanup).
- C6. Standardize health + error responses across all services.

### Stage D — Feature completion
- D1. Exam state machine + `GET /api/exam/state/{id}` + 409s.
- D2. Server-side secure timer; question randomization; activation codes; device fingerprinting.
- D3. **Module 17 risk-service**: `/risk-data` aggregation + risk formula + Neo4j graph ingestion & collusion queries.
- D4. Real audit logging end-to-end; tab/clipboard monitoring endpoints.

### Stage E — Frontend
- E1. Scaffold React+TS+Tailwind+shadcn, API client, auth flow, routing/guards.
- E2. Student exam-taking experience (timer, monitoring, submit).
- E3. Teacher/admin dashboards + risk & audit dashboards.

### Stage F — Infra, CI, docs, deploy
- F1. Dockerfiles + compose (dev + prod) + Nginx + healthchecks.
- F2. GitHub Actions CI; smoke tests.
- F3. OpenAPI/API docs; consolidated README; EC2 deployment guide.

---

## 3. Commit Discipline
- Conventional Commits (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`, `docs(scope):`).
- Small, reviewable, humanized commits per logical change (not one giant commit).
- Commit at the end of each completed sub-step; never commit secrets.

---

*This plan is the contract for Phase 2. Stages run roughly in order, but B/C interleave. Progress tracked via the agent todo list and commits.*
