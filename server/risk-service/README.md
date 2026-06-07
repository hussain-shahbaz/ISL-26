# risk-service

Graph-based exam integrity analytics, backed by **Neo4j**. This is the
Advanced DBMS "graph" pillar of the polyglot stack: it models students,
devices, networks and exams as a graph and detects **collusion rings**,
**shared devices**, and **multi-account abuse** that are awkward to express in
relational or document stores.

## Graph model

```
(:Student {id})
(:Device {fingerprint})      // privacy-preserving device fingerprint hash
(:Network {ip})
(:Exam {id})

(Student)-[:USED_DEVICE {lastSeen}]->(Device)
(Student)-[:USED_NETWORK {lastSeen}]->(Network)
(Student)-[:TOOK {submittedAt}]->(Exam)
```

Uniqueness constraints are created on each node key at boot (`initSchema`), so
the graph stays normalized (one node per real-world entity).

## How it is fed

- **auth-service** emits a `login` event (student id + device fingerprint hash +
  IP) on every successful student login — fire-and-forget, never blocking auth.
- **student-exam** emits a `submission` event (student id + exam id) on submit,
  creating the `TOOK` edge used to scope collusion to a single exam.

## API (mounted at `/risk`, reached via the gateway at `/api/modules/risk`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/health` | Liveness + dependency report |
| `POST` | `/events` | Ingest `{ type, studentId, deviceFingerprint?, ip?, examId? }` |
| `GET`  | `/overview` | Node counts (students/devices/networks) |
| `GET`  | `/collusion?examId=` | Collusion **rings** + **pairs** (optionally exam-scoped) |
| `GET`  | `/student/:id` | Per-student risk profile + explainable score |

All routes require the shared `x-service-secret` (injected by the gateway).
Through the gateway the route group is additionally restricted to
**teacher/admin** roles.

## Run

```bash
npm install
# needs Neo4j (docker compose up -d neo4j)
NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=... npm start
npm run seed   # loads a demo graph and prints the collusion rings it finds
```

## Detection logic

Two distinct students linked to the **same device** or the **same network** are
a collusion signal. Pairs are unioned (union-find) into rings of 2+ members.
The per-student score weights shared devices most heavily (same machine), then
shared peers, then shared networks.
