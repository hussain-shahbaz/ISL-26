# Microservice Integration Guide

## Overview

The main server (port 3000) now delegates all requests to microservices through a unified proxy routing system. Each microservice runs on its own port and handles specific domains.

---

## Microservice Configuration

| Service | Port | Base Path | Route Prefix |
|---------|------|-----------|--------------|
| **Exam** | 3002 | `/api/exam` | `/api/modules/exam/*` |
| **Student-Exam** | 3005 | `/api/v1/student-exam` | `/api/modules/student-exam/*` |
| **Grade-Cheat** | 3004 | `/api` | `/api/modules/grade-cheat/*` |

---

## How It Works

### Request Flow

```
Client Request
    ↓
Main Server (http://localhost:3000)
    ↓
/api/modules/:service/* → Microservice Routes Proxy
    ↓
Strip /api/modules/ prefix
    ↓
Add x-service-secret header + forward to microservice
    ↓
Microservice Response
    ↓
Return to Client
```

### Example

**Client Request:**
```
POST http://localhost:3000/api/modules/exam/
```

**Forwarded to Exam Service:**
```
POST http://localhost:3002/api/exam/
Header: x-service-secret: supersecretkey
```

---

## Environment Configuration

Update `.env` file in the server root with:

```env
# Microservice Secret (shared across all microservices)
X_SERVICE_SECRET=supersecretkey

# Microservice URLs (defaults shown, change if running on different hosts/ports)
EXAM_SERVICE_URL=http://localhost:3002
STUDENT_EXAM_SERVICE_URL=http://localhost:3005
GRADE_CHEAT_SERVICE_URL=http://localhost:3004
```

---

## API Routes

### Exam Service Routes
Base path: `/api/modules/exam`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create exam |
| GET | `/` | Get all exams (teacher) |
| GET | `/:id` | Get exam by ID |
| GET | `/student` | Get assigned exams (student) |
| PATCH | `/:id` | Update exam |
| PATCH | `/:id/status` | Update exam status |
| DELETE | `/:id` | Delete exam |
| POST | `/question/:examId` | Add question to exam |
| GET | `/question/:examId` | Get exam questions |
| PATCH | `/question/:id` | Update question |
| DELETE | `/question/:id` | Delete question |

**Example:**
```bash
curl -X GET http://localhost:3000/api/modules/exam/ \
  -H "x-request-id: req-001"
```

---

### Student-Exam Service Routes
Base path: `/api/modules/student-exam`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get assigned exams |
| POST | `/submit/:examId` | Submit exam |
| GET | `/result/:examId` | Get submission results |

**Example:**
```bash
curl -X POST http://localhost:3000/api/modules/student-exam/submit/exam_001 \
  -H "Content-Type: application/json" \
  -d '{"answers": [...]}'
```

---

### Grade-Cheat Service Routes
Base path: `/api/modules/grade-cheat`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/grade/async` | Start async grading & plagiarism |
| GET | `/grade/progress` | Check grading progress |
| GET | `/results` | Get grading results |
| GET | `/analytics` | Get exam analytics |
| GET | `/health` | Health check |

**Example:**
```bash
curl -X POST "http://localhost:3000/api/modules/grade-cheat/grade/async?examId=exam_001&mode=medium" \
  -H "Content-Type: application/json"
```

---

## Request Headers

All requests are automatically enhanced with:

| Header | Value | Purpose |
|--------|-------|---------|
| `x-service-secret` | From `X_SERVICE_SECRET` env | Authentication with microservice |
| `x-request-id` | Generated or from request | Request tracking |
| `x-forwarded-from` | `main-server` | Identify origin |

---

## Error Handling

All errors are returned in a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 500,
  "details": { ... }  // Optional
}
```

### Common Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 503 | Service unavailable | Microservice is down or unreachable |
| 504 | Gateway timeout | Microservice timed out |
| 500 | Internal server error | Network or parsing error |

---

## Logging

All microservice requests are logged through the existing queue-based logging system:

1. Request arrives → Logger middleware captures it
2. Request added to queue (non-blocking)
3. Proxy forwards to microservice
4. Response received from microservice
5. Response logged to queue
6. Every 100ms: Queue drains → Logs sent to Log Service

---

## Testing

### Start All Services

**Terminal 1 - Log Service:**
```bash
cd server/src/modules/log
node app.js
```

**Terminal 2 - Exam Service:**
```bash
cd server/src/modules/exam
npm install
node server.js
```

**Terminal 3 - Student-Exam Service:**
```bash
cd server/src/modules/student-exam
npm install
npm start
```

**Terminal 4 - Grade-Cheat Service:**
```bash
cd server/src/modules/grade-cheat
pip install -r requirements.txt
python main.py
```

**Terminal 5 - Main Server:**
```bash
cd server
npm install
npm start
```

### Test Routes

**1. Health Check:**
```bash
curl http://localhost:3000/health
```

**2. Get All Exams:**
```bash
curl http://localhost:3000/api/modules/exam/
```

**3. Get Student Exams:**
```bash
curl http://localhost:3000/api/modules/student-exam/
```

**4. Check Grade Service Health:**
```bash
curl http://localhost:3000/api/modules/grade-cheat/health
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 503 Service unavailable | Check if microservice is running on the correct port |
| ECONNREFUSED | Verify microservice is listening on the configured port |
| x-service-secret missing | Ensure `X_SERVICE_SECRET` is set in `.env` |
| Logs not appearing | Check `GET /health` for `queueSize` and wait 100ms |

---

## File Structure

```
server/
├── app.js                              ← Main entry point (updated)
├── .env.example                        ← Environment template (updated)
├── src/
│   ├── common/
│   │   ├── middleware/
│   │   │   └── logger-middleware.js    ← Captures microservice requests
│   │   ├── microservices/
│   │   │   └── microservice-routes.js  ← Proxy routing logic (NEW)
│   │   └── queue/
│   │       └── log-queue.js            ← Batches logs
│   └── modules/
│       ├── exam/                       ← Exam microservice
│       ├── student-exam/               ← Student-Exam microservice
│       ├── grade-cheat/                ← Grade-Cheat microservice
│       └── log/                        ← Log microservice
```

---

## Architecture Diagram

```
┌──────────────────────────────────────┐
│    Client Application                 │
└──────────────────┬───────────────────┘
                   │
                   │ HTTP Request
                   ↓
┌──────────────────────────────────────────────────────┐
│    Main Server (Port 3000)                           │
│  ┌────────────────────────────────────────────────┐ │
│  │ Express App                                     │ │
│  │ - Logger Middleware (captures request)         │ │
│  │ - Microservice Routes Proxy (/api/modules/*) │ │
│  │ - Logger Middleware (captures response)        │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ Queue System (batches logs)                    │ │
│  └────────────────────────────────────────────────┘ │
└──────┬───────────────────┬──────────────┬───────────┘
       │                   │              │
       │ Port 3002         │ Port 3005    │ Port 3004
       ↓                   ↓              ↓
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Exam Service     │ │ Student-Exam │ │ Grade-Cheat  │
│ /api/exam        │ │ /api/v1/...  │ │ /api         │
└──────────────────┘ └──────────────┘ └──────────────┘
       │                   │              │
       └───────────────────┼──────────────┘
                           │
                           ↓
                    ┌──────────────┐
                    │   MongoDB    │
                    └──────────────┘
                           │
       ┌───────────────────┘
       │
       ↓
┌──────────────────┐
│ Log Service      │
│ Port 3001        │
│ /logs            │
└──────────────────┘
```

---

## Next Steps

- [ ] Implement authentication middleware for microservice routes
- [ ] Add request validation middleware
- [ ] Add rate limiting per microservice
- [ ] Implement circuit breaker for resilience
- [ ] Add distributed tracing
- [ ] Add metrics collection per microservice
- [ ] Implement service discovery for dynamic URLs
