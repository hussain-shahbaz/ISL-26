# ExamPro — Secure Online Examination System

A modular, security-first online examination platform built as a set of microservices behind an API gateway, backed by an intentional **distributed polyglot database** layer. It enforces academic integrity through authentication, RBAC, secure sessions, audit logging with tamper-evident hash chains, and AI-assisted grading and plagiarism detection.

> This is both an Information Security semester project and an Advanced Database Management System project. See `docs/PHASE1_AUDIT.md` for the full system audit and `docs/PHASE2_PLAN.md` for the target architecture and roadmap.

---

## Architecture

```
                       Browser (React + TypeScript SPA)
                                    |
                          API Gateway (Express, :3000)
            JWT verify · reverse proxy · audit logging · CORS · rate limit
                                    |
   ┌──────────────┬──────────────┬──────────────┬───────────────┬──────────────┐
   ▼              ▼              ▼              ▼               ▼              ▼
 auth-service  user-service  exam-service  student-exam   grade-cheat     log-service
   :3001          :3002         :3003         :3004        :3005 (Py)        :3006
```

### Distributed polyglot persistence

| Store | Purpose |
|---|---|
| **PostgreSQL** | Relational source of truth: users, auth identities, exams, questions, sessions |
| **MongoDB** | Append-only / document data: audit logs (hash chain), submissions, grading results |
| **Redis** | OTP, session cache, rate limiting, Celery broker, pub/sub |
| **ChromaDB** | Vector store for semantic plagiarism detection |
| **Neo4j** | Graph analytics: collusion rings, shared-device and multi-session detection |

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

- **Single shared JWT** (HS256) issued only by auth-service; verified across services.
- **Service-to-service auth** via a shared `SERVICE_SECRET` header.
- **RBAC** (student / teacher / admin) enforced on protected routes.
- **Tamper-evident audit logs** via SHA-256 hash chaining in the log-service.
- **Secret hygiene**: all secrets come from environment; nothing hardcoded.

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
