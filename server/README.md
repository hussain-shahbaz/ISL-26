# ExamPro — Backend

Microservices and the API gateway for the Secure Online Examination System. See the [root README](../README.md) for the overall architecture and the distributed database layer.

---

## Layout

```text
server/
├── app.js                 # API gateway (entry point, :3000)
├── Dockerfile             # shared image: gateway, exam, student-exam, log
├── auth-service/          # authentication (attached in-process to the gateway)
├── user-service/          # user profiles & RBAC (:3002, own Dockerfile)
├── risk-service/          # Neo4j collusion graph analytics (:3007, own Dockerfile)
├── scripts/               # operational scripts (test-routes integration check)
├── docs/                  # integration, API reference, testing, architecture
└── src/
    ├── common/
    │   ├── microservices/ # reverse-proxy router (/api/modules/*)
    │   ├── middleware/    # gateway auth + async audit-logging middleware
    │   └── queue/         # non-blocking log queue
    └── modules/
        ├── exam/          # exam & question authoring (:3003)
        ├── student-exam/  # submissions & results (:3004)
        ├── grade-cheat/   # LLM grading + plagiarism, Python/Flask (:3005)
        └── log/           # tamper-evident audit logging (:3006)
```

---

## Prerequisites

- Node.js 22 LTS (avoid Node 23.x — Prisma rejects it)
- Python 3.11+ (grade-cheat)
- Running database layer: `docker compose up -d` from the repo root

---

## Running

Configuration is read from the repo-root `.env` (see `../.env.example`).

```bash
npm install          # in server/

npm run dev          # gateway + auth-service        -> http://localhost:3000
npm run log          # log-service                   -> http://localhost:3006
npm run exam         # exam-service                  -> http://localhost:3003
npm run submission   # student-exam service          -> http://localhost:3004
npm run risk         # risk-service (Neo4j)          -> http://localhost:3007
```

user-service and risk-service are standalone packages — install their deps once:

```bash
cd user-service && npm install && npm run dev   # -> http://localhost:3002
cd risk-service && npm install && npm start      # -> http://localhost:3007 (needs Neo4j)
```

The grade-cheat service is Python:

```bash
cd src/modules/grade-cheat
pip install -r requirements.txt
python main.py                                        # -> http://localhost:3005
celery -A app.celery_app worker --loglevel=info       # background grading
```

---

## How requests flow

1. Client calls the gateway at `/api/...`.
2. Gateway applies security headers, CORS, rate limiting, and assigns a request id.
3. Request/response are captured by the logging middleware and queued (non-blocking).
4. `/api/auth/*` is served in-process; `/api/modules/<service>/*` is reverse-proxied to the relevant microservice with the shared `x-service-secret`.
5. The log queue drains asynchronously to the log-service, which stores entries in a SHA-256 hash chain.

---

## Health checks

Every service exposes a health endpoint returning `{ module, status, dependencies, version }`:

```bash
curl http://localhost:3000/health            # gateway
curl http://localhost:3000/api/auth/health   # auth
curl http://localhost:3006/health            # log-service
npm run health                               # checks all services
```

---

## Reference docs

- **[`docs/API.md`](./docs/API.md)** — full API reference for every service and how they communicate (headers, trust model, JWT contract).
- [`docs/`](./docs) — integration guide, microservice testing, architecture diagrams.
- Module-specific notes live alongside each module (e.g. `src/modules/log/README.md`, `risk-service/README.md`).
