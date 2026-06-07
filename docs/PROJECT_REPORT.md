# ExamPro — Secure Online Examination System
### Detailed Project Report

---

## Cover

| | |
|---|---|
| **Project Title** | ExamPro — A Secure, Microservice-Based Online Examination System |
| **Repository** | ISL-26 |
| **Domain** | Information Security / Distributed Web Systems |
| **Supervisor** | Dr. Ayesha Altaf |
| **Document** | Final Project Report |

### Team Members

| # | Name | Registration |
|---|------|--------------|
| 1 | Shahzib Ali | 2024-CS-48 |
| 2 | Haris Nadeem | 2024-CS-03 |
| 3 | Hussain Shahbaz | 2024-CS-04 |
| 4 | Abdullah Shaukat | 2024-CS-28 |
| 5 | Ziyan Rana | 2024-CS-49 |
| 6 | Ali Hamdan | 2024-CS-32 |
| 7 | Ali Zargham | 2024-CS-11 |
| 8 | Hussain Yasin | 2024-CS-44 |

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Challenges](#3-challenges)
4. [Requirements](#4-requirements)
5. [System Architecture](#5-system-architecture)
6. [Microservices (Detailed)](#6-microservices-detailed)
7. [Databases & Polyglot Persistence](#7-databases--polyglot-persistence)
8. [Security Architecture](#8-security-architecture)
9. [Advanced Features](#9-advanced-features)
10. [Implementation & Integrations](#10-implementation--integrations)
11. [Performance Analysis](#11-performance-analysis)
12. [Testing & Validation](#12-testing--validation)
13. [Deployment](#13-deployment)
14. [Future Enhancements](#14-future-enhancements)
15. [Conclusion](#15-conclusion)
16. [Appendices](#16-appendices)

---

## 1. Abstract

ExamPro is a **secure, cloud-deployable online examination platform** built on a
**microservice architecture** with a **polyglot persistence** data layer. It allows
institutions to register and approve instructors, lets instructors author and
schedule exams, lets students sit those exams in a **proctored**, full-screen
environment, and then **auto-grades** the submissions using a combination of exact
matching (MCQ) and **Large Language Model (LLM) grading** (free-text answers).

Security is a first-class concern throughout the system. The platform implements
edge-verified **JWT authentication**, **role-based access control (RBAC)**,
**single-session enforcement**, **device fingerprinting**, OTP-backed email
verification, an **administrator approval workflow** for instructors, brute-force
**rate limiting**, and a **tamper-evident, hash-chained audit log**. Academic
integrity is enforced both client-side (proctoring) and server-side
(**semantic plagiarism detection** and **graph-based collusion analytics**).

The system is fully containerised with Docker Compose, deployed behind an Nginx
edge and a Caddy reverse proxy with automatic HTTPS, and has been validated on an
AWS EC2 instance reachable at a public domain.

---

## 2. Introduction

### 2.1 Background

Online examinations became a mainstream requirement for universities, certification
bodies, and corporate training. However, most quick solutions either (a) are
monolithic and difficult to scale/secure, or (b) treat security and academic
integrity as afterthoughts. Remote assessment introduces a unique threat surface:
candidates may impersonate one another, share answers, use unauthorised material,
or collude across devices and accounts. At the same time the **audit trail** of who
did what — and the **integrity** of that trail — becomes legally and academically
important.

ExamPro was designed as an **Information Security course project** to demonstrate
how a modern, distributed web application can be engineered with security woven
through every layer rather than bolted on at the end.

### 2.2 Motivation

- **Security-first engineering.** Demonstrate real-world controls — JWT, RBAC,
  session management, device binding, rate limiting, tamper-evident logging — in a
  working system rather than as theory.
- **Academic integrity.** Combine client-side proctoring with server-side
  plagiarism detection and graph analytics to detect cheating and collusion.
- **Modern architecture.** Apply microservices, polyglot persistence, an API
  gateway, asynchronous processing, and containerised deployment.
- **Realistic operations.** Ship something that actually deploys to the cloud
  with HTTPS, health checks, and graceful degradation.

### 2.3 Problem Statement

> Design and implement a secure online examination system that authenticates and
> authorises users robustly, prevents and detects cheating, preserves a verifiable
> audit trail, scales horizontally through independent services, and can be
> deployed and operated reliably — all while remaining usable for students,
> instructors, and administrators.

### 2.4 Project Scope

**In scope:**

- Three roles: **Student**, **Instructor (Teacher)**, **Administrator**.
- Secure account lifecycle: registration → email OTP verification → (instructor)
  admin approval → login → authenticated usage → password change.
- Exam authoring (MCQ + free-text), scheduling, student enrolment, publishing.
- Proctored, full-screen exam-taking with violation tracking and auto-submit.
- Automated grading (MCQ exact match + LLM grading of text) and class analytics.
- Plagiarism detection and graph-based integrity/collusion analytics.
- Tamper-evident audit logging with chain verification.
- Admin console (user approvals, audit log, integrity graph).
- Containerised deployment with reverse proxy and automatic HTTPS.

**Out of scope (current release):**

- Live video/webcam proctoring and biometric identity checks.
- Payment/billing and multi-tenant organisation isolation.
- Native mobile applications.
- Question banks/randomised question pools (planned — see §14).

### 2.5 Objectives

1. Build a horizontally decomposable backend of independent microservices.
2. Centralise authentication and identity propagation at an API gateway.
3. Use the **right database for each job** (polyglot persistence).
4. Implement layered ("defence-in-depth") security controls.
5. Provide automated, explainable grading and integrity analytics.
6. Deliver a polished, enterprise-grade web UI.
7. Make the whole stack reproducible with a single `docker compose up`.

---

## 3. Challenges

| Challenge | How it was addressed |
|-----------|----------------------|
| **Trust between services** | A single edge (gateway) verifies the JWT once; downstream services trust normalized `x-user-*` headers and a shared `SERVICE_SECRET`. Inbound identity headers are stripped at the edge to prevent spoofing. |
| **Consistent identity across data stores** | Auth identity (MongoDB) and user profile (PostgreSQL) share the **same `userId`**, so the JWT subject resolves the same person everywhere. |
| **Tamper-evident logging without blocking requests** | Logs are queued asynchronously (Redis-backed queue) and written by a dedicated log service that chains each entry with SHA-256. |
| **Hash-chain integrity bugs** | The chain must hash exactly what is persisted (schema defaults like `{}` once broke verification); writes are serialised per service and ordered by insertion (`_id`) to avoid forks. |
| **Grading latency & external API limits** | Grading runs **asynchronously** via Celery workers with rate limiting and rotating LLM API keys; clients poll a progress endpoint. |
| **Cheating detection at scale** | Hybrid plagiarism (semantic vector similarity + TF-IDF) plus a Neo4j graph to surface collusion rings and shared-device patterns. |
| **Preventing privilege bypass** | RBAC enforced both at the gateway (route guards) and inside services; instructor **approval state is embedded in the JWT** and re-checked server-side. |
| **Operational robustness** | Health checks, dependency ordering, graceful shutdown (log queue drain), and graceful degradation (e.g., risk service returns 503 if the graph DB is down). |

---

## 4. Requirements

### 4.1 Functional Requirements

**Authentication & Accounts**
- FR-1: Users register as Student or Instructor (admins are seeded, never self-registered).
- FR-2: Email ownership is verified via a time-limited OTP before the account becomes active.
- FR-3: Instructors require **administrator approval** before they can use teaching features.
- FR-4: Users log in with email + password and receive a short-lived access token + refresh token.
- FR-5: Authenticated users can change their password (which revokes all sessions).
- FR-6: A user may have only **one active session** at a time.

**Exams**
- FR-7: Instructors create exams with metadata (subject, title, schedule, duration, total marks).
- FR-8: Instructors add MCQ (with a marked correct option) and free-text questions.
- FR-9: Instructors enrol students via search or by pasting emails, then publish.
- FR-10: Students see their assigned exams and take them in a proctored runner.
- FR-11: Submissions are stored with answers and recorded proctoring violations.

**Grading & Integrity**
- FR-12: MCQs are graded by exact match; text answers are graded by an LLM with feedback.
- FR-13: The system detects plagiarism between submissions and reports similarity.
- FR-14: The system surfaces collusion rings / shared-device patterns for review.

**Administration & Audit**
- FR-15: Admins approve/reject instructors and review all platform accounts.
- FR-16: Every request/response is logged; admins can filter, paginate, and inspect logs.
- FR-17: Admins can **verify the integrity** (hash chain) of the audit log.

### 4.2 Non-Functional Requirements

- **NFR-1 Security:** Defence-in-depth (see §8); secrets never shipped with weak defaults in production.
- **NFR-2 Performance:** Asynchronous logging and grading keep request latency low; per-request latency is captured in logs.
- **NFR-3 Availability:** Independent services with health checks; partial outages degrade gracefully.
- **NFR-4 Scalability:** Stateless services behind the gateway can be scaled horizontally; workers scale independently.
- **NFR-5 Maintainability:** Clear service boundaries, layered (route → controller → service → repository) structure.
- **NFR-6 Portability:** Entire stack runs from a single `docker compose up --build`.
- **NFR-7 Usability:** Responsive, accessible, enterprise-grade SPA.

---

## 5. System Architecture

### 5.1 Architectural Style

ExamPro follows a **microservices** style behind a **single API gateway**, with a
**polyglot persistence** layer and an **asynchronous worker** for heavy/slow jobs.
The frontend is a **single-page application (SPA)** served by Nginx, which also
reverse-proxies API traffic to the gateway.

### 5.2 High-Level Diagram

```
                              ┌──────────────────────────┐
        HTTPS (Caddy)         │        Browser (SPA)      │
   exampro.prosysltd.com ───► │  React 19 + Vite + TS     │
                              └─────────────┬─────────────┘
                                            │ /api/*
                              ┌─────────────▼─────────────┐
                              │   Nginx edge (frontend)    │  serves SPA, proxies /api
                              └─────────────┬─────────────┘
                                            │
                              ┌─────────────▼─────────────────────────────┐
                              │            API GATEWAY (:3000)             │
                              │  Helmet · CORS · Rate limit · Request-ID   │
                              │  Async audit logging · JWT verify · RBAC   │
                              │  Auth-service attached in-process (/api/auth)
                              └───┬───────┬───────┬───────┬───────┬───────┬┘
        x-user-* + x-service-secret│       │       │       │       │       │
              ┌──────────────┬─────┘       │       │       │       │       └─────────────┐
              ▼              ▼             ▼       ▼       ▼       ▼                     ▼
        ┌──────────┐  ┌────────────┐ ┌────────┐ ┌──────────────┐ ┌────────┐  ┌──────────────┐
        │  user    │  │   exam     │ │student-│ │ grade-cheat  │ │  log   │  │ risk-service │
        │ service  │  │  service   │ │ exam   │ │ (Flask+Celery)│ │service │  │  (Neo4j)     │
        │ (:3002)  │  │  (:3003)   │ │(:3004) │ │   (:3005)    │ │(:3006) │  │   (:3007)    │
        └────┬─────┘  └─────┬──────┘ └───┬────┘ └──────┬───────┘ └───┬────┘  └──────┬───────┘
             │              │            │             │             │              │
       ┌─────▼────┐   ┌─────▼─────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐  ┌─────▼─────┐
       │PostgreSQL│   │ MongoDB   │ │ MongoDB  │ │MongoDB +   │ │ MongoDB  │  │  Neo4j    │
       │(profiles)│   │ (exam db) │ │(student_ │ │Redis+Chroma│ │(exam_logs)│ │ (graph)   │
       └──────────┘   └───────────┘ │  exam)   │ │(grading)   │ └──────────┘  └───────────┘
                                     └──────────┘ └────────────┘
                Shared infra: MongoDB · Redis · Neo4j · ChromaDB
```

### 5.3 Request Lifecycle (example: create exam)

1. Browser calls `POST /api/modules/exam/` with `Authorization: Bearer <jwt>`.
2. Nginx forwards `/api/*` to the gateway.
3. Gateway applies Helmet, CORS, rate limiting, assigns an `x-request-id`, and
   **queues an async audit log** entry.
4. `authenticate` verifies the JWT, **strips any client-supplied identity headers**,
   and re-injects trusted `x-user-id`, `x-user-role`, `x-username`,
   `x-session-id`, `x-user-approval`.
5. Route guard checks RBAC for the target service (where applicable).
6. Gateway proxies the request to the exam service with `x-service-secret`.
7. The exam service validates the body, enforces role + approval, persists the
   exam (MongoDB) and its questions, and returns the result.
8. Gateway queues the response log (with latency/`responseTime`) and returns the
   response to the browser.

### 5.4 Layered Service Structure

Each Node service follows a consistent layering:

```
route → middleware (auth/validation) → controller → service → repository → model/DB
```

This separation keeps transport, business logic, and persistence concerns
independent and testable.

---

## 6. Microservices (Detailed)

> **Ports & images.** All services share the `exampro/server` image except
> `user-service`, `risk-service`, and `grade-cheat`, which have their own images.
> Internal ports: gateway `3000`, user `3002`, exam `3003`, student-exam `3004`,
> grade-cheat `3005`, log `3006`, risk `3007`. The SPA/Nginx is exposed on `80`.

### 6.1 API Gateway (`server/app.js`)

**Role:** The single public entry point and security perimeter.

**Responsibilities:**
- **Security headers** via Helmet, **CORS** with an allow-list of origins.
- **Rate limiting** on `/api` (default 300 requests / 15 min window) and stricter
  limits on auth routes.
- **Request correlation:** assigns/propagates `x-request-id` and exposes it on the
  response for request/response log pairing.
- **Asynchronous audit logging** via `logger-middleware` + a Redis-backed
  `LogQueue` (never blocks the request path).
- **Authentication & identity propagation:** verifies the JWT once at the edge,
  normalizes roles (`instructor → teacher`), and forwards trusted `x-user-*`
  headers downstream.
- **Reverse proxy** of `/api/modules/<service>/*` to the correct microservice,
  attaching the `x-service-secret`.
- **Fail-fast secret validation:** in production the gateway refuses to start if
  `JWT_SECRET`, `SERVICE_SECRET`, or `INTERNAL_SECRET` are missing or left at a
  known insecure default.
- **Graceful shutdown:** drains the log queue on `SIGTERM`/`SIGINT`.

**RBAC at the edge:** `grade-cheat` → teacher/admin, `log` → admin only,
`risk` → teacher/admin. `user`, `exam`, and `student-exam` are authenticated at the
edge and perform fine-grained role checks internally.

### 6.2 Auth Service (`server/auth-service`, attached in-process at `/api/auth`)

**Role:** Owns the account lifecycle and token issuance.

**Key capabilities:**
- **Registration** with admin self-registration blocked.
- **Email OTP verification** (OTP hashed and stored in Redis with attempt limits,
  cooldowns, and expiry). On success it creates the MongoDB auth identity and calls
  the user service to create the matching profile (rolled back on failure).
- **Login:** verifies the bcrypt password hash, requires a verified email,
  enforces **single active session**, resolves the instructor's **approval status**
  and embeds it in the access token, binds the session to a **device fingerprint
  hash**, and creates a session record.
- **Token issuance:** short-lived **access token (15 min)** and **refresh token
  (7 days)**, signed with the shared secret. Claims include `user_id`, `username`,
  `role`, `approval_status`, `session_id`, `device_fingerprint_hash`, and a `jti`.
- **Refresh** re-validates the session and **re-resolves approval status** so
  changes take effect within the access-token lifetime.
- **Logout / logout-all / revoke-session**, with access-token blacklisting by `jti`.
- **Password reset** (OTP-verified) and **authenticated password change** (revokes
  all sessions for safety).
- **Risk signal emission:** on student login it best-effort emits a login event
  (device fingerprint hash + IP) to the risk service.

**Data:** MongoDB `auth` database — auth identities and sessions; Redis — OTPs,
session/rate-limit state, token blacklist.

### 6.3 User Service (`server/user-service`)

**Role:** Owns user **profiles** and the **approval workflow** (PostgreSQL via Prisma).

**Key capabilities:**
- **Profile creation** linked by shared `userId`; students are auto-`APPROVED`,
  instructors start `PENDING`.
- **Profile completion** (role-specific identifiers: student roll number / instructor
  employee ID, department, batch, etc.).
- **Approval management:** list pending instructors, approve/reject; only `PENDING`
  instructors are actionable.
- **Directory queries:** list students/instructors, **search students** and
  **resolve student emails** to IDs (used by the exam student-picker).
- **Internal endpoint** (`/internal/:userId/approval`, service-secret protected) so
  the auth service can embed live approval status into the JWT.

**Data:** PostgreSQL — `UserProfile` and `UserIdentifier` tables (see §7.2).

### 6.4 Exam Service (`server/src/modules/exam`)

**Role:** Authoritative store for exams and questions.

**Key capabilities:**
- **Create exam** (teacher only, must be **approved**); validates metadata and that
  `totalMarks` equals the sum of question marks.
- **Questions:** MCQ (2–6 non-empty options + a `referenceAnswer` = correct option)
  and free-text (with a `referenceAnswer` used for AI grading).
- **Update / delete / change status** guarded by an **owner check** (and approval).
- **Lifecycle:** `draft → published → submitted → checked`; publishing enforces a
  future schedule, enrolled students, questions present, and reconciled marks.
- **Role-aware retrieval:** owning teacher sees reference answers; enrolled students
  receive questions **without** reference answers.

**Data:** MongoDB `exam` database — `Exam` and `Question` collections.

### 6.5 Student-Exam Service (`server/src/modules/student-exam`)

**Role:** Manages student enrolment mapping and submissions.

**Key capabilities:**
- Maintains the **student → exams** enrolment mapping (populated on publish).
- Accepts **submissions** (answers) and records **proctoring violations**
  (sanitised, capped, and counted) for the teacher's proctor report.
- Serves submission data to the grading pipeline.

**Data:** MongoDB `student_exam` database — submissions with embedded violations.

### 6.6 Grade-Cheat Service (`server/src/modules/grade-cheat`, Python/Flask + Celery)

**Role:** Automated grading **and** plagiarism detection — the analytical core.

**Key capabilities:**
- **Asynchronous grading** (`POST /api/grade/async?examId=&mode=`): one active task
  per exam, returns a `taskId`; progress is polled at `/api/grade/progress`.
- **Grading engine:** MCQ by exact (case-insensitive) match; free-text by an **LLM
  grader** (Google Gemini, with key rotation and rate limiting) supporting
  `strict`/`medium`/`lenient` modes and returning score, feedback, reasoning, and
  confidence.
- **Plagiarism detection:** hybrid similarity = **60% semantic** (vector embeddings
  via ChromaDB) + **40% TF-IDF** cosine similarity across peer submissions.
- **Analytics:** class-level statistics per exam (`/api/analytics`).
- **Results & tasks** retrieval endpoints; idempotent (refuses to double-grade).

**Data:** MongoDB `exam_grading` (results, analytics, task records); Redis (Celery
broker/result backend); ChromaDB (answer embeddings for semantic similarity).

### 6.7 Log Service (`server/src/modules/log`)

**Role:** Centralised, **tamper-evident** audit logging.

**Key capabilities:**
- **Capture** request/response events forwarded by the gateway, **sanitising**
  sensitive fields (passwords, tokens, auth headers) before storage.
- **Hash chain:** each entry stores `previousHash` and a `currentHash` computed as
  `SHA-256(previousHash + canonical(logPayload))`, forming a linked, tamper-evident
  chain (genesis anchored per service).
- **Chain integrity verification** scoped per (service, environment), walking
  entries in insertion order.
- **Combinable queries:** filter by service, event type, environment, user, status
  code, time range, error-only, and free-text search — with pagination and latency
  (`responseTime`) on every record.
- **Statistics** and **retention cleanup** of old logs.

**Data:** MongoDB `exam_logs` database — append-only chained log documents.

### 6.8 Risk Service (`server/risk-service`, Neo4j)

**Role:** Graph-based academic-integrity analytics.

**Key capabilities:**
- **Ingest events** (`POST /risk/events`) — e.g., logins with device fingerprint +
  IP, building a graph of students, devices, and exams.
- **Collusion analytics** (`GET /risk/collusion`) — detects **collusion rings** and
  suspicious **pairs** (e.g., shared devices / overlapping patterns), optionally
  scoped to an exam.
- **Per-student risk** (`GET /risk/student/:id`) and an **overview** dashboard feed.
- **Graceful degradation:** returns `503` with a clear message if the graph
  database is unavailable.

**Data:** Neo4j — nodes/relationships for students, devices, exams, and sessions.

### 6.9 Frontend (`frontend`, React SPA served by Nginx)

**Role:** The user-facing application for all three roles.

**Highlights:**
- React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn-style primitives, Framer
  Motion, TanStack Query (server state), Zustand (auth state), React Router, Axios.
- **Auth flows:** login (with live rate-limit lockout countdown), register, OTP
  verification, password reset, authenticated password change.
- **Role-aware app shell:** grouped navigation, contextual header, session-security
  popover, and an **approval gate** that blocks unapproved instructors with a clear
  notice.
- **Exam authoring:** rich question editor with a **correct-answer selector** for
  MCQs and an interactive **student picker** (search + paste-emails).
- **Proctored exam runner:** full-screen, violation tracking, auto-submit on limit.
- **Admin console:** user approvals, **audit log** explorer (filters, pagination,
  expandable detail, chain verification), and the **integrity graph**.
- **Axios interceptors** attach the bearer token and transparently refresh it on
  `401`.

---

## 7. Databases & Polyglot Persistence

### 7.1 Why Polyglot Persistence?

Rather than forcing every concern into one database, ExamPro uses **the database
best suited to each data shape and access pattern**. This is the core idea of
polyglot persistence: it improves performance, models data naturally, and isolates
failure domains.

| Store | Technology | What it holds | Why this store |
|-------|-----------|---------------|----------------|
| **Relational** | PostgreSQL 16 | User profiles, identifiers, approval status | Strong schema, relations, constraints, indexed lookups; profiles are highly structured and relational. |
| **Document** | MongoDB 7 | Auth identities & sessions, exams & questions, submissions, grading results, audit logs | Flexible, nested documents (questions, answers, violations, log payloads) that evolve quickly. |
| **In-memory / KV** | Redis 7 | OTPs, session/rate-limit state, token blacklist, Celery broker, async log queue | Sub-millisecond reads/writes, TTL-based expiry, pub/sub, and a natural message broker. |
| **Graph** | Neo4j 5 | Students ↔ devices ↔ exams relationships | Collusion rings and shared-device patterns are graph problems; traversals are first-class. |
| **Vector** | ChromaDB | Embeddings of free-text answers | Semantic similarity search (nearest-neighbour) for plagiarism detection. |

### 7.2 Logical Databases (MongoDB)

MongoDB hosts several logically separate databases on one instance:

- **`auth`** — auth identities (email, bcrypt hash, role, verification/block flags)
  and session records (device fingerprint, IP, user agent, expiry, revoked flag).
- **`exam`** — `Exam` documents (instructor, schedule, marks, status, enrolled
  students) and `Question` documents (type, text, options, marks, reference answer).
- **`student_exam`** — submissions (answers + embedded proctoring violations + count).
- **`exam_grading`** — grading results, analytics, and async task records.
- **`exam_logs`** — the append-only, hash-chained audit log.

### 7.3 Relational Schema (PostgreSQL via Prisma)

- **`UserProfile`**: `id` (shared with auth `userId`), `name`, `email` (unique),
  `role` (`ADMIN`/`INSTRUCTOR`/`STUDENT`), `university`, `bio`, `avatarUrl`,
  `isProfileComplete`, `approvalStatus` (`PENDING`/`APPROVED`/`REJECTED`),
  `approvedAt`, `approvedBy`, soft-delete flags, timestamps. Indexed on email,
  role, university, approval status, and (role, university).
- **`UserIdentifier`**: one-to-one with a profile — `identifier` (roll number or
  employee ID, unique), `department`, `degreeProgram`, `batch`.

### 7.4 Logging Subsystem & Tamper-Evident Audit Trail

The logging subsystem is a deliberate **security feature**, not just diagnostics:

- **Asynchronous, non-blocking:** the gateway enqueues log events (Redis-backed
  `LogQueue`) so request latency is unaffected; a dedicated log service persists them.
- **Sanitisation:** sensitive fields (passwords, tokens, sensitive headers) are
  stripped/redacted before storage.
- **Hash chaining:** each entry links to the previous one via
  `currentHash = SHA-256(previousHash + canonicalPayload)`. Any modification or
  deletion of a historical entry breaks the chain and is detectable.
- **Deterministic hashing:** the payload hashed is exactly what is persisted
  (post-schema-defaults), and writes are serialised per (service, environment) and
  ordered by insertion (`_id`) to prevent forks. This makes **chain verification**
  reliable.
- **Rich, queryable records:** HTTP method, path, status code, **latency**, user,
  request id, environment, IP, user agent — all filterable and paginated in the
  admin Audit view, with an integrity-verification action.

---

## 8. Security Architecture

Security in ExamPro is **layered (defence-in-depth)**: each control is independent,
so the failure or bypass of one does not collapse the whole system.

### 8.1 Authentication (JWT)

- Credentials are verified against a **bcrypt** password hash.
- On success the auth service issues a **signed JWT access token (15 min)** and a
  **refresh token (7 days)**.
- The JWT carries `user_id`, `username`, `role`, `approval_status`, `session_id`,
  `device_fingerprint_hash`, and a unique `jti`.
- The **gateway verifies the token once** at the edge; downstream services never
  re-parse it — they trust the gateway-propagated `x-user-*` headers.

### 8.2 Identity Propagation & Anti-Spoofing

- The gateway **strips any inbound `x-user-*` headers** before authentication, so a
  client cannot forge identity.
- After verification it injects trusted identity headers and a **`x-service-secret`**
  that downstream services validate, so services only accept calls from the gateway
  (or other trusted internal callers).
- Internal-only endpoints (e.g., profile creation, approval lookup) require a
  separate **`INTERNAL_SECRET`**.

### 8.3 Authorization (RBAC)

- Roles: **student**, **teacher** (normalized from `instructor`), **admin**.
- **Edge guards:** grade-cheat (teacher/admin), audit log (admin), risk
  (teacher/admin).
- **In-service checks:** e.g., only teachers create exams; only the **owning**
  teacher can modify an exam; students only see exams they are enrolled in.
- **Approval enforcement:** an instructor's `approval_status` is embedded in the JWT,
  propagated as `x-user-approval`, and **re-checked server-side** on privileged exam
  operations — so an unapproved instructor cannot create/modify exams even by calling
  the API directly. The frontend additionally shows a blocking "awaiting approval"
  gate.

### 8.4 Account Lifecycle Controls

- **Email OTP verification** before activation (hashed OTPs in Redis, attempt limits,
  cooldowns, expiry).
- **Admin approval workflow** for instructors (`PENDING → APPROVED/REJECTED`).
- **Self-registration as admin is blocked**; admins are seeded.

### 8.5 Session Management

- **Single active session per user:** a second login is refused until the first is
  logged out, limiting credential sharing and concurrent misuse.
- Sessions are stored server-side (MongoDB) with device fingerprint, IP, user agent,
  and expiry; they can be **revoked individually or all at once**.
- **Password change revokes all sessions**, and logout **blacklists the access token**
  by `jti` until its natural expiry.

### 8.6 Device Fingerprinting

- The client computes a stable **device fingerprint** (user agent, language, screen
  metrics, timezone).
- The server stores only a **SHA-256 hash** of it (privacy-preserving), binds it to
  the session, and feeds it (hashed) to the risk graph to detect **shared-device**
  collusion.

### 8.7 Brute-Force & Abuse Protection

- **Global API rate limiting** (default 300 req / 15 min) and **stricter auth-route
  limits**.
- On lockout the API returns `429` with `Retry-After`; the **login page surfaces a
  live countdown** and disables submission.

### 8.8 Transport & Platform Hardening

- **Helmet** security headers and an explicit **CORS allow-list**.
- **HTTPS** terminated by Caddy (automatic certificates) in front of the Nginx edge.
- **Fail-fast secret checks**: the gateway refuses to start in production with weak
  or default secrets.
- JSON body size limits and request timeouts to bound resource usage.

### 8.9 Academic-Integrity / Anti-Cheating Controls

- **Client-side proctoring** (see §9.1): tab-switching, focus loss, fullscreen exit,
  copy/paste, right-click, and dev-tools shortcuts are detected; after a threshold
  the exam **auto-submits**. Violations are persisted server-side for the teacher's
  proctor report.
- **Server-side plagiarism detection** (semantic + TF-IDF) across submissions.
- **Graph-based collusion analytics** (Neo4j) for rings and shared-device patterns.
- **Tamper-evident audit trail** (§7.4) provides forensic, verifiable evidence.

### 8.10 Security Controls Summary

| Threat | Control |
|--------|---------|
| Credential theft / replay | Short-lived JWT, refresh rotation, token blacklist, HTTPS |
| Identity spoofing between services | Header stripping + gateway-only `x-service-secret` |
| Privilege escalation | RBAC at edge + in-service + approval claim in JWT |
| Brute force | Rate limiting + lockout with countdown |
| Account sharing | Single-session enforcement + device binding |
| Exam cheating | Proctoring + auto-submit + plagiarism + graph analytics |
| Log tampering | SHA-256 hash chain + verification |
| Misconfiguration | Production secret fail-fast checks |
| Sensitive data leakage in logs | Field sanitisation before persistence |

---

## 9. Advanced Features

### 9.1 Proctored Exam Runner

A full-screen, distraction-controlled environment that detects and records six
violation types — `tab-hidden`, `focus-lost`, `fullscreen-exit`, `clipboard`,
`context-menu`, `devtools-keys` — counts them, **auto-submits** when the limit
(default 5) is reached, and **persists** them to the server so instructors get a
per-student **proctor report**.

### 9.2 AI-Assisted Grading

MCQs are graded deterministically; free-text answers are graded by an **LLM** that
returns a score, human-readable feedback, an explanation of what was wrong, and a
confidence value. Grading runs **asynchronously** (Celery), is **idempotent** per
exam, and exposes **progress polling** and **class analytics**.

### 9.3 Hybrid Plagiarism Detection

Combines **semantic similarity** (vector embeddings in ChromaDB, 60% weight) with
**TF-IDF cosine similarity** (40% weight) to catch both paraphrased and copied
answers across the cohort.

### 9.4 Graph Integrity Analytics

A Neo4j-backed risk service ingests login/device signals and surfaces **collusion
rings**, suspicious **pairs**, and per-student risk — visualised in the admin
"Integrity graph".

### 9.5 Tamper-Evident Audit Log + Verifier

A hash-chained audit trail with an in-app **"Verify chain"** action that confirms no
historical entry has been altered or removed.

### 9.6 Interactive Student Enrolment

Instructors enrol students via a **searchable picker** or by **pasting emails**,
which are resolved to canonical user IDs server-side.

---

## 10. Implementation & Integrations

### 10.1 Technology Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, TanStack Query, Zustand, React Router, Axios |
| Backend (Node) | Node.js, Express 5, Mongoose, Prisma, jsonwebtoken, bcrypt, Helmet, express-rate-limit, express-validator, Redis client, Nodemailer / Resend |
| Backend (Python) | Flask, Celery, ChromaDB client, Google Gemini SDK |
| Databases | PostgreSQL 16, MongoDB 7, Redis 7, Neo4j 5, ChromaDB |
| Infra | Docker, Docker Compose, Nginx (SPA edge), Caddy (HTTPS reverse proxy), AWS EC2 |

### 10.2 Inter-Service Communication

- **Synchronous:** HTTP/REST via the gateway proxy; service-to-service calls carry
  `x-service-secret` and forwarded `x-user-*` identity. Internal privileged calls use
  `INTERNAL_SECRET` (e.g., auth → user profile/approval).
- **Asynchronous:** Redis serves as the broker for the Celery grading pipeline and
  backs the gateway's audit-log queue.

### 10.3 External Integrations

- **Email (OTP & notifications):** Gmail API / Nodemailer with a Resend fallback.
- **LLM grading:** Google Gemini with **API-key rotation** and rate limiting (Groq
  configurable as an additional provider).
- **ChromaDB** for vector embeddings; **Neo4j** for graph analytics.

### 10.4 Configuration & Secrets

All configuration is environment-driven (`.env`), including `JWT_SECRET`,
`SERVICE_SECRET`, `INTERNAL_SECRET`, database URLs, email credentials, and LLM keys.
Admin seeding is parameterised (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, …), allowing
multiple administrators to be provisioned idempotently.

---

## 11. Performance Analysis

**Design choices that protect latency and throughput:**

- **Non-blocking audit logging.** Logging is queued and written out-of-band, so the
  hash-chain computation and DB write never sit on the request's critical path.
- **Asynchronous grading.** Heavy LLM/plagiarism work runs in Celery workers; the
  API responds immediately with a `taskId`, and clients poll progress. Workers scale
  **independently** of the web tier.
- **Right-sized databases.** Indexed PostgreSQL lookups for profiles; document reads
  for exams/submissions; sub-millisecond Redis for OTP/session/rate-limit state;
  graph traversals only when integrity analytics are requested; vector search only at
  grading time.
- **Edge-once authentication.** The JWT is verified a single time at the gateway, not
  re-parsed by every service, reducing per-hop overhead.
- **Connection pooling & timeouts.** Mongoose connection pools and a proxy timeout
  prevent a slow downstream service from exhausting gateway resources.
- **Observability built-in.** Every request records its **latency (`responseTime`)**
  in the audit log, making it straightforward to profile slow endpoints and error
  rates from the admin Audit view.

**Scalability:** services are stateless behind the gateway (session state lives in
MongoDB/Redis), so the web tier and grading workers can be horizontally scaled; the
data tier can be scaled/replicated independently per technology.

**Graceful degradation:** if the graph DB is down the risk service returns `503`
(the rest of the platform keeps working); LLM/key issues degrade grading without
affecting exam delivery; the gateway drains the log queue on shutdown to avoid losing
audit events.

---

## 12. Testing & Validation

- **Smoke tests** (`server/tests/smoke.test.js`) and a microservice health checker
  (`scripts/check-microservices.js`) validate that every service is reachable and
  reports a healthy contract shape.
- **Health endpoints** on every service (`/health`) with Docker Compose
  **healthchecks** and dependency ordering (`depends_on: condition: service_healthy`).
- **Input validation** at multiple layers: express-validator / Zod schemas
  (auth, user, log) and explicit validators (exam, question), returning structured
  error messages surfaced in the UI.
- **Plagiarism unit tests** (`grade-cheat/tests/test_plagiarism.py`).
- **Manual / integration validation** covered the full journeys: registration → OTP →
  approval → login; exam authoring → publish → take (proctored) → submit → grade →
  results/analytics; admin approvals, audit filtering, and **chain verification**.
- **Security validation:** confirmed header-spoofing is rejected, RBAC blocks
  cross-role access, unapproved instructors are blocked at both UI and API,
  rate-limit lockout triggers a `429` with countdown, and audit-chain tampering is
  detected by the verifier.
- **Deployment validation:** end-to-end run on AWS EC2 behind Caddy with automatic
  HTTPS at a public domain.

---

## 13. Deployment

### 13.1 Containerisation

The entire stack is defined in `docker-compose.yml`: five data stores (PostgreSQL,
MongoDB, Redis, Neo4j, ChromaDB), the application services, a Celery worker, and the
Nginx frontend. One command brings it all up:

```bash
cp .env.example .env   # then set strong secrets
docker compose up -d --build
```

### 13.2 Edge & HTTPS

- **Nginx** (the `frontend` container) serves the built SPA and reverse-proxies
  `/api` to the gateway.
- **Caddy** sits in front on the host, terminating **HTTPS with automatic
  certificates** and proxying to the Nginx edge (e.g., `exampro.prosysltd.com`).
- The public HTTP port is configurable (`HTTP_PORT`) to avoid conflicts with Caddy.

### 13.3 Cloud

Validated on an **AWS EC2** instance: DNS A-record → EC2 public IP, security-group
rules for 80/443, Caddy for TLS, and Docker Compose running the stack with
`restart: unless-stopped` and health checks.

---

## 14. Future Enhancements

1. **Live proctoring** — webcam/screen capture with on-device anomaly detection.
2. **Question banks & randomisation** — per-student randomised question pools.
3. **Refresh-token rotation with reuse detection** and configurable session policies.
4. **Multi-tenant isolation** for multiple institutions/organisations.
5. **Distributed tracing & metrics** (OpenTelemetry, Prometheus/Grafana dashboards).
6. **Centralised log shipping** (e.g., to a SIEM) on top of the existing hash chain.
7. **Accessibility & i18n** — full WCAG audit and multi-language support.
8. **Adaptive risk scoring** — combine proctoring, plagiarism, and graph signals into
   a single explainable integrity score.
9. **Horizontal autoscaling** of the grading workers based on queue depth.
10. **Mobile applications** for students and invigilators.

---

## 15. Conclusion

ExamPro demonstrates that a secure, modern online examination system can be built as
a set of cooperating microservices with a polyglot data layer, while keeping
security and academic integrity at the centre of the design. Authentication is
edge-verified and short-lived; authorization is enforced at multiple layers and even
encodes an instructor approval claim; sessions are single-use and device-bound; the
audit trail is tamper-evident and verifiable; and cheating is countered both in the
browser (proctoring) and on the server (semantic plagiarism + graph collusion
analytics). Heavy work is offloaded to asynchronous workers, observability is built
in via latency-aware audit logs, and the whole system deploys reproducibly to the
cloud behind automatic HTTPS.

The result is a platform that is **functional, secure, observable, and
operable** — and a codebase whose clear service boundaries make it straightforward to
extend with the enhancements outlined above.

---

## 16. Appendices

### Appendix A — Service & Port Map

| Service | Internal Port | Tech | Backing Store |
|---------|---------------|------|---------------|
| Gateway (+ auth in-process) | 3000 | Node/Express 5 | MongoDB `auth`, Redis |
| User service | 3002 | Node + Prisma | PostgreSQL |
| Exam service | 3003 | Node/Express | MongoDB `exam` |
| Student-exam service | 3004 | Node/Express | MongoDB `student_exam` |
| Grade-cheat service | 3005 | Python/Flask + Celery | MongoDB `exam_grading`, Redis, ChromaDB |
| Log service | 3006 | Node/Express | MongoDB `exam_logs` |
| Risk service | 3007 | Node/Express | Neo4j |
| Frontend (Nginx) | 80 | React/Vite (static) | — |
| PostgreSQL | 5432 | — | — |
| MongoDB | 27017 | — | — |
| Redis | 6379 | — | — |
| Neo4j | 7474 / 7687 | — | — |
| ChromaDB | 8000 | — | — |

### Appendix B — Public API Surface (via gateway)

| Prefix | Service | Access |
|--------|---------|--------|
| `/api/auth/*` | Auth (in-process) | Public + authenticated |
| `/api/modules/user/*` | User service | Authenticated; admin for management |
| `/api/modules/exam/*` | Exam service | Authenticated; teacher (approved) for writes |
| `/api/modules/student-exam/*` | Student-exam | Authenticated; student for submissions |
| `/api/modules/grade-cheat/*` | Grade-cheat | Teacher / admin |
| `/api/modules/log/*` | Log service | Admin only |
| `/api/modules/risk/*` | Risk service | Teacher / admin |

### Appendix C — Key Environment Variables

`JWT_SECRET` / `ACCESS_TOKEN_SECRET`, `SERVICE_SECRET`, `INTERNAL_SECRET`,
`POSTGRES_*`, `DATABASE_URL`, `MONGO_URI` / `MONGODB_URI`, `MONGODB_DB_LOGS`,
`MONGODB_DB_GRADING`, `REDIS_URL`, `NEO4J_*`, `CHROMA_*`, `GEMINI_API_KEYS`,
`GROQ_API_KEY`, email credentials (`GMAIL_*` / `RESEND_API_KEY` / `EMAIL_FROM`),
`CORS_ORIGIN` / `PUBLIC_ORIGIN`, `HTTP_PORT`, rate-limit knobs.

### Appendix D — Team & Supervisor

**Supervisor:** Dr. Ayesha Altaf

| Name | Registration |
|------|--------------|
| Shahzib Ali | 2024-CS-48 |
| Haris Nadeem | 2024-CS-3 |
| Hussain Shahbaz | 2024-CS-04 |
| Abdullah Shaukat | 2024-CS-28 |
| Ziyan Rana | 2024-CS-49 |
| Ali Hamdan | 2024-CS-37 |
| Ali Zargham | 2024-CS-11 |
| Hussain Yasin | 2024-CS-44 |

> *Suggested division of work (adjust to reflect actual contributions): Gateway &
> Auth; User service & approval workflow; Exam & Student-exam services; Grade-cheat
> (grading + plagiarism); Log service & audit chain; Risk service & graph analytics;
> Frontend SPA & proctoring; DevOps, Docker & deployment.*

---

*End of report.*
