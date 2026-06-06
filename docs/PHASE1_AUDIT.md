# PHASE 1 — Project Audit & Current State

> **Secure Online Examination System** — full codebase audit before integration, hardening, frontend, and deployment.
> This document captures **what exists today, what works, what is broken, and what is missing**. It is the baseline ("as-is") snapshot. Planning and fixes happen in later phases.

- **Audited path:** `ISL-26/`
- **Audit type:** Read-only, exhaustive (every source file in every service was read)
- **Git state:** branch `main`, working tree clean. Remote feature branches exist per module (`feature/auth`, `feature/user-service`, `exam-module`, `feature/student-exam-module`, `feature/log-module`, `feature/ai-exam-check`).

---

## 0. TL;DR — Honest Verdict

The backend is a set of **individually decent but disconnected microservices** written by different persons with **inconsistent conventions, three different databases, three different "user" implementations, and no working integration layer**. The "API gateway" exists in code but is **commented out / never mounted**, so right now the services do **not** actually talk to each other through the main server. There is **no frontend** (just a Vite starter that won't even build), **no Docker/infra**, **no CI**, and **secrets are hardcoded** in multiple places.

**Rough production-readiness: ~25%.** The raw material is good; the integration, security hardening, frontend, and deployment are the missing 75%.

---

## 1. Repository Structure (as-is)

```text
ISL-26/
├── README.md                     # Team conventions, layering rules (good, but aspirational)
├── PHASE1_AUDIT.md               # (this file)
├── package.json                  # Near-empty (just nodemon devDep)
├── docs/
│   └── progress.csv              # 5-row task tracker, all status = TODO
├── frontend/                     # Vite + React 19 STARTER ONLY (broken build)
├── sample/                       # Non-running reference skeleton (stub classes)
└── server/
    ├── app.js                    # MAIN GATEWAY (port 3000) — proxy & logging NOT wired
    ├── package.json              # start/dev/log/exam/submission scripts
    ├── .env.example              # Duplicated content; missing service secrets & URLs
    ├── 10+ markdown docs         # Heavy documentation drift (claims ≠ code)
    ├── scripts/check-microservices.js
    ├── test-routes.js            # Tests routes that aren't mounted
    ├── auth-service/             # Node/Express 5, Mongoose + Redis, JWT, OTP  (REAL)
    ├── user-service/             # Node/Express 5, Prisma + MySQL, Mongo blacklist (REAL)
    └── src/
        ├── common/
        │   ├── microservices/    # Proxy router (exists, NOT mounted)
        │   ├── middleware/       # logger-middleware (exists, commented out)
        │   └── queue/            # log-queue (runs, but receives nothing)
        └── modules/
            ├── user/             # Prisma+Postgres schema ONLY — empty stub, dead
            ├── exam/             # Node/Express 5, Mongoose (REAL, partial)
            ├── student-exam/     # Node/Express 5, Mongoose (REAL, heavy mocks)
            ├── log/              # Node/Express 5, Mongoose, SHA-256 hash chain (REAL)
            └── grade-cheat/      # Python/Flask + Celery + Chroma + Gemini (REAL, advanced)
```

### Service / Port / Tech map

| Service | Lang / Framework | DB | Default Port | Status |
|---|---|---|---|---|
| **Main gateway** | Node / Express 5 | (uses log Mongo) | 3000 | Partial — proxy & logging disabled |
| **auth-service** | Node / Express 5 (ESM) | MongoDB + Redis | 3000 embedded / 5000 standalone (bug) | Mostly real |
| **user-service** | Node / Express 5 (ESM) | **MySQL** (Prisma) + Mongo (blacklist) | 3001 (collides w/ log) | Mostly real, standalone only |
| **src/modules/user** | Prisma schema only | **PostgreSQL** | — | **Dead stub** |
| **exam** | Node / Express 5 (CJS) | MongoDB | 3002 | Partial |
| **grade-cheat** | **Python / Flask + Celery** | MongoDB + Redis + **ChromaDB (vector)** | 3004 | Advanced, but unauthenticated |
| **student-exam** | Node / Express 5 (CJS) | MongoDB | 3005 | Partial, heavy mock data |
| **log-service** | Node / Express 5 (CJS) | MongoDB | 3001 | Real, but hash-verify broken |

---

## 2. What's DONE (module by module)

### 2.1 auth-service — *the most complete module*
**Implemented:** register, email-OTP verification (Gmail OAuth2 + nodemailer), login, logout, refresh tokens, forgot/reset password, resend OTP, session storage + listing, single-active-session enforcement, bcrypt hashing (10 rounds), JWT access (15m) + refresh (7d), token blacklist on logout, Zod validation, rate limiting on register.

**Mapped to:** Module 1 (Auth), Module 2 (Sessions), partially Module 3 (device fingerprint stored).

### 2.2 user-service — *profile & approval service*
**Implemented:** internal register (called by auth), rollback delete, get/complete profile, admin lists (students / instructors / pending), admin approval & instructor rejection, JWT verification, RBAC (`authorizeRoles`), optional Mongo blacklist check. Uses **MySQL via Prisma** with migrations.

### 2.3 exam module — *teacher exam authoring*
**Implemented:** exam CRUD, publish lifecycle (`draft/saved/published/submitted/checked`) with publish guards (must have questions, marks, students, schedule), question CRUD, post-publish locking, owner middleware, service-secret auth, seed data.

### 2.4 student-exam module — *submissions*
**Implemented:** answer submission persisted to `SubmittedExam`, duplicate-submission unique index `{examId, studentId}`, result retrieval, basic enrollment/window validators, seed data. (Most inter-service data is currently **mocked**.)

### 2.5 grade-cheat (Python) — *most advanced module*
**Implemented:** MCQ auto-grading (exact match), LLM text grading (Gemini primary, **Groq** fallback) with strict/lenient/medium modes, **plagiarism detection (TF-IDF + cosine, hybrid with semantic embeddings)**, **ChromaDB vector store** + Gemini embeddings, analytics (avg/top-students/strong-weak concepts), Celery async tasks, Redis task tracking, LLM rate-limiter + **multi-key Gemini rotation**, MongoDB persistence. Pulls exam/submission data from other services over HTTP (`x-service-secret`).

### 2.6 log-service — *audit logging*
**Implemented:** log capture, **SHA-256 hash chain**, sanitizer (redacts passwords/tokens/keys), query/pair/stats endpoints, request↔response linking by `requestId`, Mongoose model with indexes, retry-enabled DB connection.

### 2.7 Gateway plumbing (exists but OFF)
**Built:** reverse-proxy router (`microservice-routes.js`) for exam/student-exam/grade-cheat, queue-based async logger middleware, log queue with batching/drain. **All present in code but not enabled in `app.js`.**

---

## 3. What's WRONG / BROKEN (high-impact)

### 3.1 Integration is not actually wired
- `server/app.js` imports the proxy router and logger middleware but **never mounts them** (`app.use('/api/modules', ...)` is missing; `app.use(loggerMiddleware)` is commented out). The startup log **prints proxy routes that don't exist**.
- Only `/health` and `/api/auth/*` actually work on the gateway today.
- `test-routes.js` and `scripts/check-microservices.js` test `/api/modules/*` routes that return 404.

### 3.2 Three databases, three "users", no shared DB
- Integration contract mandates **one** MongoDB `exam_security`. Reality: auth=MongoDB `auth`, user=**MySQL**, src/modules/user=**Postgres** (dead), exam=`exam`, student-exam=`student_exam`/`student_exam_db`/`submission`, log=`logs`, grade-cheat=`grades`.
- **Three user models**: `auth-service` (`AuthIdentity` in Mongo), `user-service` (`UserProfile` in MySQL), `src/modules/user` (`User` in Postgres, no code). Schemas disagree; roles disagree.

### 3.3 JWT does not match the integration contract
- Contract wants payload: `user_id, username, role(student|teacher), session_id, device_fingerprint_hash, exp` with **one shared HS256 secret**.
- Actual: `userId, role(STUDENT|INSTRUCTOR|ADMIN), sessionId, jti` — **no `username`, no `device_fingerprint_hash`**, two separate secrets (`ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET`), role naming `instructor` ≠ contract `teacher`.
- **exam, student-exam, grade-cheat do NOT validate JWT at all** — they only check `x-service-secret`, and exam **hardcodes** `req.user = { userId:'101', role:'student' }`.

### 3.4 Service-to-service secret is mismatched
- Proxy sends `X_SERVICE_SECRET` (default `default-secret-key`); microservices expect `SERVICE_SECRET` (default `supersecretkey` or undefined). **Out of the box every proxied call would 403.**
- student-exam **logs the incoming secret** to stdout.

### 3.5 Hardcoded secrets committed to source
- auth-service: JWT secrets hardcoded as fallbacks (`config.js`), Redis URL hardcoded to a private IP `172.28.244.79` (ignores env).
- grade-cheat: same Redis private IP default, `SECRET_KEY=dev-secret-key`.
- log/queue: `supersecretkey`, `default-secret-key` fallbacks.
- README ships default admin creds (`admin@uet.edu.pk` / `Admin@123`).

### 3.6 Runtime bugs (will crash / misbehave)
- **auth:** Redis never connected when auth runs embedded in gateway → OTP/register fail; `logoutAll` references undefined `Session`; `logoutAll`/`revokeSession` controllers have no routes; blacklist check in `verifyAccessToken` commented out; standalone `config.PORT` typo → always 5000.
- **exam:** `question_service` calls `.toObject()` on `.lean()` docs → student question fetch crashes; `GET /student` route shadowed by `GET /:id` (route order bug); reference answers exposed to students.
- **student-exam:** submission time **hardcoded** to a fixed date; validator checks `submissionTime` but controller sets `submittedAt` → time-window validation never runs; hardcoded student IDs.
- **log:** `GENESIS_MARKER` overwritten to `undefined` (duplicate config key) → non-deterministic genesis hash; **chain verification hashes only 4 fields but creation hashes 9 → verify almost always returns false**; `cleanupOldLogs` calls a commented-out repo method → TypeError; top-level `userId` dropped by schema → audit-by-user broken.
- **grade-cheat:** tests import from wrong paths (ImportError); dead duplicate modules with broken imports (`gemini_service.py`, `services/rate_limiter.py`, `services/task_tracker.py`).

### 3.7 Exam State Machine not implemented
- Contract requires `NOT_STARTED → DEVICE_VERIFIED → TEACHER_APPROVED → ACTIVATION_VALID → IN_PROGRESS → SUBMITTED → ANALYZING → COMPLETED` with `GET /api/exam/state/{id}` and HTTP 409 on wrong state. **Zero references exist anywhere.** Only an unrelated publish lifecycle exists.

### 3.8 Logging gateway contract not met
- Contract: `POST /api/logs/write` returning **202**. Actual: `POST /logs` returning **201** (synchronous). No module currently sends logs through the gateway (middleware off; microservices use `console.log`).

---

## 4. What's MISSING entirely

- ❌ **Frontend** — only a Vite/React starter; broken `hero.png` import blocks build; no pages, routing, API client, auth UI, exam UI, or dashboard. `GUIDE.md` describes an app that doesn't exist.
- ❌ **Infrastructure** — no Dockerfiles, no `docker-compose`, no Kubernetes, no nginx/reverse-proxy config, no process manager.
- ❌ **CI/CD** — no GitHub Actions / pipelines / tests in CI.
- ❌ **Deployment** — nothing for EC2 (no provisioning, no env management, no TLS, no domain).
- ❌ **Unified `.env`** — each service has its own; root has no orchestration env; secrets undocumented.
- ❌ **Modules from the IS spec not built:** device fingerprinting (Module 3, only partial), activation codes (4), question randomization (7), secure server-side timer (8), tab/clipboard monitoring (10/11), multi-session detection (14), behavioral analysis (15), **Risk Scoring & Dashboard / Module 17** (the documented risk formula is unimplemented; no `/risk-data` aggregation endpoints).
- ❌ **MFA/TOTP** — stubbed/commented in auth.
- ❌ **Health endpoints per contract** — all services have *a* health route but none matches `{module, status, dependencies, version}`.
- ❌ **Tests** — grade-cheat tests are broken; JS services have no real test suites (`npm test` is a stub).
- ❌ **API documentation** — scattered, inconsistent markdown; no OpenAPI/Swagger.
- ❌ **Neo4j / Graph DB** — not present (you mentioned wanting it for ADBMS bonus).

---

## 5. What's RIGHT (keep / build on)

- ✅ Clean layered architecture intent (controller → service → repository) documented and mostly followed.
- ✅ auth-service is a genuinely solid base (OTP, refresh tokens, sessions, bcrypt, rate limiting).
- ✅ grade-cheat is impressive: real vector DB (Chroma), embeddings, hybrid TF-IDF+semantic plagiarism, LLM grading with key rotation and rate limiting — strong ADBMS story.
- ✅ log-service hash-chain concept is the right idea for tamper-evident audit logs (just needs the verify bug fixed).
- ✅ Conventional-commits + module-ownership conventions already established in README.
- ✅ Multi-database polyglot persistence (Mongo + MySQL + Redis + Chroma) is a legitimate distributed-DB story for ADBMS — it just needs to be intentional and documented, not accidental.

---

## 6. Documentation Drift (notable)

Docs across the repo describe a finished, integrated system that doesn't match the code:
- `IMPLEMENTATION_REPORT.md` claims gateway integration "COMPLETE" — it's not mounted.
- `frontend/GUIDE.md` describes Router/Axios/folder structure that don't exist.
- log `CONTEXT.md`/`POSTMAN_TESTS.md` describe genesis `previousHash=null` and `***REDACTED***` formats that differ from code.
- Service READMEs disagree on ports, env var names, and endpoint paths.
- README references `sample-module-skeleton.py` which doesn't exist.

---

## 7. Distributed-Database / ADBMS Angle (current vs opportunity)

**Currently in use:** MongoDB (auth, exam, student-exam, log, grade-cheat results), MySQL (user profiles), Redis (OTP, Celery, task state), ChromaDB (vector similarity).

**Opportunity (your idea):** add **Neo4j / graph DB** — strong fit for:
- Behavioral/collusion analysis: model students, exams, answers, devices, sessions as a graph; detect **answer-similarity rings**, shared devices, and **multi-session collusion** via graph traversal.
- Risk-scoring relationships and audit-trail lineage.

This would meaningfully strengthen the ADBMS submission (polyglot persistence + graph analytics).

---

## 8. Priority Buckets (input for Phase 2 planning)

> Not a plan yet — just severity grouping to discuss.

**P0 — Blocks everything**
1. Decide canonical data architecture (which DBs, one shared vs per-service) and kill duplicates (`src/modules/user`, `sample/`, duplicate auth-service in sample).
2. Wire the gateway: mount proxy + logging; unify `SERVICE_SECRET`.
3. Unify JWT to a single contract-compliant spec; make exam/student-exam/grade-cheat validate it.
4. Remove hardcoded secrets; move everything to env; create a real root `.env.example`.

**P1 — Core correctness**
5. Fix runtime bugs (auth Redis, exam `.toObject`/route order, student-exam time, log hash-verify + genesis + cleanup).
6. Implement the exam state machine + `/api/exam/state/{id}` + 409s.
7. Replace mocked inter-service calls with real HTTP calls.
8. Standardize health endpoints + error response format per contract.

**P2 — Product & infra**
9. Build the real frontend (auth, student exam-taking with timer/monitoring, teacher dashboard, risk dashboard) — professional, enterprise UI.
10. Implement Module 17 risk scoring + `/risk-data` aggregation; wire grade-cheat similarity into it.
11. Dockerize every service + `docker-compose` (and infra for EC2).
12. CI/CD, tests, consolidated docs, OpenAPI.

**P3 — Bonus / differentiation**
13. Neo4j graph analytics for collusion/risk.
14. Real-time monitoring (WebSockets), device fingerprinting, activation codes, MFA.

---

*End of Phase 1 audit. Next: brainstorm target architecture, then produce the Phase 2 execution plan and start making scoped, conventional commits.*
