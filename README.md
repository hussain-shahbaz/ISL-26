# ExamPro — Secure Online Examination System

A modular, security-first online examination platform built as a set of microservices behind an API gateway, backed by an intentional **distributed polyglot database** layer. It enforces academic integrity through authentication, RBAC, secure sessions, audit logging with tamper-evident hash chains, and AI-assisted grading and plagiarism detection.

> This is both an Information Security semester project and an Advanced Database Management System project. See `docs/PHASE1_AUDIT.md` for the full system audit and `docs/PHASE2_PLAN.md` for the target architecture and roadmap.

---

## Architecture

```
                      Browser
                         │  http://localhost
                         ▼
              Nginx edge (frontend, :80)
        serves the React SPA · reverse-proxies /api
                         │
                         ▼
              API Gateway (Express, :3000)
   JWT verify · identity propagation · reverse proxy · audit log · CORS · rate limit
                         │
   ┌───────────┬───────────┬───────────┬────────────┬───────────┬───────────┐
   ▼           ▼           ▼           ▼            ▼           ▼           ▼
 auth        user        exam      student-exam  grade-cheat   log         risk
 (in-proc)   :3002       :3003       :3004        :3005 (Py)   :3006       :3007
   │           │           │           │            │           │           │
   ▼           ▼           ▼           ▼            ▼           ▼           ▼
 Mongo      Postgres    Mongo       Mongo      Mongo+Redis    Mongo       Neo4j
 +Redis                                        +Chroma
```

> `auth-service` is attached to the gateway in-process (it shares port 3000 at
> `/api/auth`); every other service runs standalone behind the gateway proxy.

### Distributed polyglot persistence

| Store | Owned by | Purpose |
|---|---|---|
| **PostgreSQL** | user-service (Prisma) | Relational user profiles & identifiers (roll no / employee id), roles, approval status |
| **MongoDB** | auth, exam, student-exam, grade-cheat, log | Auth credentials & sessions, exams & questions, submissions, grading results, audit logs (hash chain) |
| **Redis** | auth, grade-cheat, gateway | OTP & temp-registration, access-token blacklist, rate limiting, Celery broker/result backend |
| **ChromaDB** | grade-cheat | Vector store of answer embeddings for semantic plagiarism detection |
| **Neo4j** | risk-service | Graph analytics: collusion rings, shared-device and multi-session detection |

### Services & ports

| Service | Tech | Port | Responsibility |
|---|---|---|---|
| Gateway | Node / Express | 3000 | Single entry point, proxy, auth, logging |
| auth-service | Node / Express | 3001 | Register, OTP, login, JWT, sessions |
| user-service | Node / Express | 3002 | Profiles, RBAC, admin approvals |
| exam-service | Node / Express | 3003 | Exam & question authoring |
| student-exam | Node / Express | 3004 | Submissions & results |
| grade-cheat | Python / Flask + Celery | 3005 | LLM grading, plagiarism (TF-IDF + vector) |
| log-service | Node / Express | 3006 | Tamper-evident audit logging |
| risk-service | Node / Express | 3007 | Graph collusion & integrity analytics (Neo4j) |

---

## Prerequisites

- **Node.js 22 LTS** (Prisma requires 20.19+/22.12+/24.0+; avoid Node 23.x)
- **Python 3.11+** (for the grade-cheat service)
- **Docker + Docker Compose**

---

## Quick start

### Full stack with Docker Compose (recommended)

One command builds and runs everything — the distributed data layer, every
microservice, and the Nginx edge that serves the SPA and proxies the API.

```bash
cp .env.example .env             # fill in secrets (JWT_SECRET, SERVICE_SECRET, API keys)
docker compose up -d --build     # data layer + all services + frontend
```

Then open **http://localhost** — Nginx serves the React SPA and reverse-proxies
`/api` to the gateway. This is the same setup used for EC2 deployment (see
`docs/PHASE2_PLAN.md`).

### Local development (without containers)

```bash
# 1. Start only the distributed database layer
docker compose up -d postgres mongo redis neo4j chroma

# 2. Run the Node services (from server/)
cd server && npm install
npm run dev                 # gateway + auth on :3000
npm run log                 # log-service on :3006
npm run exam                # exam-service on :3003
npm run submission          # student-exam on :3004
npm run risk                # risk-service on :3007

# 3. Run the grade-cheat service (Python)
cd server/src/modules/grade-cheat && pip install -r requirements.txt && python main.py

# 4. Run the frontend (separate terminal)
cd frontend && npm install
npm run dev                 # SPA on :5173, proxies /api to the gateway
```

---

## Testing & verifying locally

```bash
# Health of every service (run from server/, with the stack up)
cd server && npm run health

# Or check individual gateways directly
curl http://localhost:3000/health             # gateway
curl http://localhost:3000/api/auth/health     # auth (in-process)
curl http://localhost:3007/health              # risk-service

# Dependency-free smoke tests (gateway auth + submission validator)
cd server && npm run test:smoke

# Full HTTP route walk-through against the running stack
node server/scripts/test-routes.js
```

**End-to-end manual check (Docker stack):**

1. Open `http://localhost`, register an instructor and a student (OTP is emailed
   if Gmail is configured; otherwise read it from the auth-service logs).
2. As an admin, approve the instructor under **Users**.
3. As the instructor, author an exam with MCQ + text questions and publish it.
4. As the student, take the proctored exam (tab-switch / fullscreen-exit events
   are recorded) and submit.
5. As the instructor, trigger grading; watch results and plagiarism scores.
6. As an admin, open **Audit log** and verify the SHA-256 hash chain, and open
   **Integrity graph** to see Neo4j collusion analytics.

---

## Repository structure

```text
ISL-26/
├── README.md                 # this file
├── docker-compose.yml        # full stack: data layer + services + Nginx edge
├── .env.example              # single source of truth for configuration
├── docs/                     # project-level docs (audit, plan, progress)
├── frontend/                 # React + TypeScript SPA (Dockerfile + nginx.conf)
└── server/
    ├── app.js                # API gateway
    ├── Dockerfile            # shared image for gateway/exam/student-exam/log
    ├── auth-service/         # authentication (attached in-process to gateway)
    ├── user-service/         # user profiles & RBAC (own Dockerfile, Prisma)
    ├── risk-service/         # Neo4j collusion analytics (own Dockerfile)
    ├── scripts/              # operational scripts (integration smoke test)
    ├── docs/                 # server-level reference docs
    └── src/
        ├── common/           # gateway proxy, logging middleware, queue
        └── modules/
            ├── exam/         # exam authoring
            ├── student-exam/ # submissions
            ├── grade-cheat/  # grading & plagiarism (Python, own Dockerfile)
            └── log/          # audit logging
```

---

## Security model

Security is layered — no single key carries the whole system.

- **Passwords & OTPs hashed with bcrypt**; never stored or logged in plaintext.
- **Single shared JWT** (HS256) issued only by auth-service and verified at the
  gateway. The gateway strips any client-supplied `x-user-*` headers, then sets
  trusted ones from the verified token, so downstream services cannot be spoofed.
- **Refresh-token rotation** with the refresh hash bound to a server-side session;
  logout blacklists the access token (by `jti`) until its natural expiry.
- **Single active session** per user and a **hashed device fingerprint** to detect
  device sharing (also fed to the Neo4j integrity graph).
- **Service-to-service auth** via a shared `SERVICE_SECRET` header on every proxy hop.
- **RBAC** (student / teacher / admin) enforced at the gateway for sensitive routes
  (audit log = admin; grading & risk = teacher/admin).
- **Tamper-evident audit logs** via SHA-256 hash chaining in the log-service, with
  sensitive fields sanitized before storage.
- **Hardening**: Helmet security headers, CORS allow-list, and rate limiting on the
  public API surface.
- **Secret hygiene**: all secrets come from the environment; nothing hardcoded.

---

## Contributing

We follow **Conventional Commits**: `type(scope): subject`

- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`
- Imperative mood, lowercase subject, no trailing period
- Keep commits small, meaningful, and scoped to one logical change

**Layering rule (strict):** `Client → Middleware → Controller → Service → Repository → Database`. Controllers never touch the database directly; services hold business logic; repositories handle persistence; modules do not import another module's internals.

---

## Documentation

- `docs/PHASE1_AUDIT.md` — full as-is audit of the system
- `docs/PHASE2_PLAN.md` — target architecture and execution roadmap
- `frontend/README.md` — frontend stack, structure, and proctoring overview
- `server/README.md` — backend layout and per-service run instructions
- `server/docs/` — service integration, testing, and architecture references
