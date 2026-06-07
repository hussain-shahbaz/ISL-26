# ExamPro — API Reference & Service Communication

This document is the single source of truth for every HTTP endpoint in the
platform and how the services talk to one another. It reflects the code as it
is actually implemented.

---

## 1. Topology & ports

| Service | Tech | Port | Data store(s) | Reached how |
| ------- | ---- | ---- | ------------- | ----------- |
| **gateway** | Node/Express | 3000 | — | Public entry point |
| **auth-service** | Node/Express | 3001¹ | MongoDB, Redis | In-process on the gateway |
| **user-service** | Node/Express | 3002 | MySQL (Prisma), MongoDB (blacklist) | Gateway proxy |
| **exam-service** | Node/Express | 3003 | MongoDB | Gateway proxy |
| **student-exam** | Node/Express | 3004 | MongoDB | Gateway proxy |
| **grade-cheat** | Python/Flask + Celery | 3005 | MongoDB, Redis, ChromaDB | Gateway proxy |
| **log-service** | Node/Express | 3006 | MongoDB | Gateway proxy + async queue |
| **risk-service** | Node/Express | 3007 | Neo4j | Gateway proxy |

¹ auth-service is attached **in-process** to the gateway (`server/app.js` →
`AttachAuth`), so its routes are served directly at `/api/auth/*` on port 3000.
The 3001 port only applies if it is ever run standalone.

### Polyglot persistence

- **PostgreSQL/MySQL (Prisma)** — relational user profiles & approvals (user-service)
- **MongoDB** — auth identities/sessions, exams, questions, submissions, audit logs, grading results
- **Redis** — OTP, session/rate-limit cache, Celery broker/result backend
- **ChromaDB** — vector embeddings for semantic plagiarism (grade-cheat)
- **Neo4j** — graph analytics for collusion rings (risk-service)

---

## 2. How services communicate

```
            ┌─────────────────────────────────────────────────────────────┐
  Browser ──┤  Gateway :3000                                                │
   (JWT)    │   • verifies JWT once at the edge                             │
            │   • strips client x-user-* headers, then sets trusted ones    │
            │   • normalizes role: instructor → teacher                     │
            │   • RBAC on /log (admin) and /grade-cheat,/risk (teacher/admin)│
            │   • injects x-service-secret on every proxied call            │
            │   • async-logs every request to log-service                   │
            └───────┬───────────────┬──────────────┬───────────┬───────────┘
        in-process  │  proxy        │ proxy         │ proxy     │ proxy
         ┌──────────▼──┐   ┌────────▼────┐  ┌───────▼─────┐  ┌──▼────────┐
         │ auth-service│   │ user-service│  │ exam-service│  │ log / etc │
         └──────┬──────┘   └─────────────┘  └──────▲──────┘  └───────────┘
       internal │ (x-internal-secret)               │ (x-service-secret + x-user-*)
                ▼                                    │
         user-service /register          student-exam ──┘ (fetch exam+questions)
                │
       login(student) ─ fire-and-forget ─► risk-service (device/ip graph)
       submit ─ fire-and-forget ─────────► risk-service (TOOK edge)
```

### Trust & headers

| Header | Set by | Meaning |
| ------ | ------ | ------- |
| `Authorization: Bearer <jwt>` | client | The shared HS256 access token issued by auth-service |
| `x-user-id`, `x-user-role`, `x-session-id`, `x-username` | **gateway only** | Verified identity forwarded downstream. Client-supplied copies are stripped first. |
| `x-service-secret` | gateway / internal callers | Shared service-to-service secret; required by exam, student-exam, log, risk, grade-cheat |
| `x-internal-secret` | auth-service | Privileged internal calls (auth → user `/register`, profile rollback) |
| `x-request-id` | gateway | Correlation id propagated to every service and the audit log |

Downstream services **do not re-verify the JWT**; they trust `x-user-*` after
validating `x-service-secret`. The gateway is therefore the single security
boundary and must be the only ingress (enforced by Nginx/EC2 security groups in
production).

### JWT payload (issued by auth-service)

```json
{
  "user_id": "<uuid>", "userId": "<uuid>",
  "username": "<email>",
  "role": "student | instructor | admin",
  "session_id": "<uuid>", "sessionId": "<uuid>",
  "device_fingerprint_hash": "<sha256>",
  "jti": "<uuid>", "iat": 0, "exp": 0
}
```

Roles are stored as `instructor` but normalized to `teacher` at the gateway, so
downstream `x-user-role` is always `student | teacher | admin`.

---

## 3. Gateway

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET | `/health` | public | Gateway liveness |
| `*` | `/api/auth/*` | mixed | auth-service (see §4) |
| `*` | `/api/modules/user/*` | JWT | → user-service `/api/users/*` |
| `*` | `/api/modules/exam/*` | JWT | → exam-service `/api/exam/*` |
| `*` | `/api/modules/student-exam/*` | JWT | → student-exam `/api/v1/student-exam/*` |
| `*` | `/api/modules/grade-cheat/*` | JWT + teacher/admin | → grade-cheat `/api/*` |
| `*` | `/api/modules/log/*` | JWT + admin | → log-service `/logs/*` |
| `*` | `/api/modules/risk/*` | JWT + teacher/admin | → risk-service `/risk/*` |

Any `*/health` sub-path is public for monitoring. Rate limit: 300 req / 15 min
on `/api` (configurable).

---

## 4. auth-service — `/api/auth`

| Method | Path | Auth | Body / notes |
| ------ | ---- | ---- | ------------ |
| POST | `/register` | public | `{ name, email, password, role }` → stores temp + sends OTP |
| POST | `/verify-email` | public | `{ email, otp }` → creates identity + calls user-service |
| POST | `/login` | public | `{ email, password }` (+ `x-device-fingerprint`) → access token + refresh cookie |
| POST | `/refresh` | cookie | rotates the access token |
| GET | `/me` | Bearer | current identity (no password hash) |
| GET | `/sessions` | Bearer | active sessions (no token hashes) |
| POST | `/logout` | Bearer | revokes session, blacklists `jti` |
| POST | `/request-otp` | public | resend email-verification OTP |
| POST | `/forgot-password` | public | send reset OTP |
| POST | `/verify-reset-otp` | public | verify reset OTP |
| POST | `/reset-password` | public | set new password |

---

## 5. user-service — `/api/users`

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/register` | `x-internal-secret` | called by auth-service after email verification |
| DELETE | `/:userId` | `x-internal-secret` | profile rollback |
| GET | `/profile` | JWT | own profile + identifier |
| PATCH | `/profile/complete` | JWT | complete profile, create `UserIdentifier` |
| PATCH | `/:userId/approval` | JWT + admin | `{ status: "APPROVED" \| "REJECTED" }` |
| GET | `/instructors/pending` | JWT + admin | pending instructors |
| GET | `/instructors` | JWT + admin | all instructors (paginated) |
| GET | `/students` | JWT + admin | students |

**Identity model:** `UserProfile.id` equals the auth-service `userId` (same
UUID). 1:1 with `UserIdentifier` (roll number / employee id, department, batch).

---

## 6. exam-service — `/api/exam`

All routes require `x-service-secret`; identity is read from `x-user-*`.

| Method | Path | Role | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/` | teacher | create exam + questions; `instructorId` taken from identity |
| GET | `/` | teacher | own exams (optional `?subject=`) |
| GET | `/student` | student | exams assigned to the student (by `userId`) |
| GET | `/:id` | teacher (owner) / enrolled student | role-aware: students never receive `referenceAnswer` |
| PATCH | `/:id` | teacher (owner) | update draft exam |
| PATCH | `/:id/status` | teacher (owner) | draft→published etc.; publish builds enrollment |
| DELETE | `/:id` | teacher (owner) | delete draft exam |
| POST | `/question/:examId` | teacher (owner) | add question |
| GET | `/question/:examId` | teacher/enrolled student | `{ exam, questions }`; student copy omits `referenceAnswer` |
| PATCH | `/question/:id` | teacher (owner) | update question |
| DELETE | `/question/:id` | teacher (owner) | delete question |

**Enrollment:** `exam.students[]` holds student `userId`s; on publish each is
linked in the `StudentExam` index (`studentId → examIds`).

---

## 7. student-exam — `/api/v1/student-exam`

All routes require `x-service-secret`; identity from `x-user-*`.

| Method | Path | Role | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/submit/:examId` | student | `{ answers: [{ questionId, submittedAnswer }] }`. Server sets `submittedAt`. Enforces window + single submission. |
| GET | `/` | student | assigned exams (delegates to exam-service) |
| GET | `/result/:examId` | student (own) / teacher,admin (any via `?studentId=`) | submission(s) |

To fetch exam content it calls exam-service `GET /api/exam/question/:examId`
with `x-service-secret` + the student's `x-user-id`/`x-user-role`.

---

## 8. grade-cheat — `/api` (Python)

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/health` | liveness |
| POST | `/grade/async?examId=&mode=&instructions=` | enqueue Celery grading (202) |
| GET | `/grade/progress?taskId=` | poll task |
| GET | `/results?examId=` | grading results |
| GET | `/analytics?examId=` | class analytics |
| GET | `/tasks?examId=` | tasks for an exam |
| DELETE | `/grade/cleanup?taskId=` | delete task record |

Pulls exam + submissions over HTTP (`x-service-secret`). Plagiarism = 60%
semantic (ChromaDB + Gemini embeddings) + 40% TF-IDF. Requires a running Celery
worker: `celery -A app.celery_app worker`.

---

## 9. log-service — `/logs`

All routes require `x-service-secret`; admin-only through the gateway.

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/` | append a log (used by the gateway's async queue) |
| GET | `/query` | filter by `service`, `eventType`, `errorOnly`, `limit` |
| POST | `/verify-chain` | `{ service, environment }` → SHA-256 hash-chain integrity |
| GET | `/stats/:service` | aggregate stats |
| POST | `/cleanup` | retention cleanup |

Each entry stores `previousHash` + `currentHash`; the chain is tamper-evident.

---

## 10. risk-service — `/risk`

All routes require `x-service-secret`; teacher/admin through the gateway.

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/health` | liveness |
| POST | `/events` | `{ type: "login"\|"submission", studentId, deviceFingerprint?, ip?, examId? }` |
| GET | `/overview` | node counts |
| GET | `/collusion?examId=` | collusion `rings` + `pairs` (optionally exam-scoped) |
| GET | `/student/:id` | per-student risk score + shared devices/networks/peers |

Fed by auth-service (login → device/ip) and student-exam (submit → exam edge).

---

## 11. Standard response envelope

Success:

```json
{ "status": "success", "data": { /* ... */ }, "message": "optional" }
```

Error:

```json
{ "status": "error", "error_code": 400, "message": "…", "timestamp": "ISO-8601" }
```
