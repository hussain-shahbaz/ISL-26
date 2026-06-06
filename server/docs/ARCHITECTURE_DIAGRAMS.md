# Microservice Integration Architecture Diagrams

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                                  │
│                    (Web, Mobile, Third-party APIs)                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                          HTTP Request/Response
                                     │
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MAIN SERVER (Port 3000)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │  Express App                                                            │ │
│ │  ├─ Auth Service (attached)                                            │ │
│ │  ├─ Logger Middleware (REQUEST)                                        │ │
│ │  ├─ Microservice Routes Proxy (/api/modules/:service/*)                │ │
│ │  │  ├─ /exam → Exam Service (3002)                                    │ │
│ │  │  ├─ /student-exam → Student-Exam Service (3005)                    │ │
│ │  │  └─ /grade-cheat → Grade-Cheat Service (3004)                      │ │
│ │  └─ Logger Middleware (RESPONSE)                                       │ │
│ │                                                                         │ │
│ │  Queue System                                                           │ │
│ │  └─ Batches & sends logs every 100ms                                   │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└────────┬────────────────────┬──────────────────────────┬────────────────────┘
         │                    │                          │
    Port 3002            Port 3005                   Port 3004
         │                    │                          │
         ↓                    ↓                          ↓
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │ EXAM SERVICE │    │STUDENT-EXAM    │    │ GRADE-CHEAT      │
   │ (Node.js)    │    │ SERVICE (Node)  │    │ SERVICE (Python) │
   │              │    │                │    │                  │
   │ /api/exam    │    │ /api/v1/       │    │ /api             │
   │              │    │ student-exam   │    │                  │
   └──────────────┘    └────────────────┘    └──────────────────┘
         │                    │                          │
         └────────┬───────────┴──────────────┬───────────┘
                  │                          │
                  ↓                          ↓
        ┌─────────────────────────────────────────────┐
        │          MONGODB INSTANCE                   │
        │  ├─ Exam DB                                 │
        │  ├─ Student-Exam DB                         │
        │  ├─ Grade-Cheat DB                          │
        │  └─ Logs DB                                 │
        └─────────────────────────────────────────────┘
```

---

## 2. Request Flow - Detailed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENT REQUEST: POST /api/modules/exam/                                    │
│  Headers: Content-Type: application/json, x-request-id: req-001             │
│  Body: { "subject": "Math", "title": "Midterm", ... }                       │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAIN SERVER: app.js                                                        │
│  ├─ Parse JSON body                                                        │
│  ├─ Set request ID: req.requestId = 'req-001'                              │
│  └─ → Next middleware                                                       │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGGER MIDDLEWARE: logger-middleware.js (REQUEST)                          │
│  ├─ Capture: method=POST, path=/api/modules/exam/                          │
│ │ ├─ Capture: headers, body                                                │
│  ├─ Add to Queue (non-blocking)                                             │
│  └─ → Next middleware                                                       │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  MICROSERVICE ROUTES: microservice-routes.js                                │
│  ├─ Route: /exam (matches /api/modules/exam/*)                              │
│  ├─ Service config: exam { baseUrl: localhost:3002, path: /api/exam }      │
│  ├─ Build headers:                                                          │
│  │  ├─ x-service-secret: supersecretkey                                    │
│  │  ├─ x-request-id: req-001                                               │
│  │  ├─ x-forwarded-from: main-server                                       │
│  │  └─ content-type: application/json                                      │
│  ├─ Build target URL: http://localhost:3002/api/exam/                      │
│  └─ Forward request via axios.post(...)                                     │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ HTTP POST (internal network)
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXAM SERVICE: app.js (Port 3002)                                           │
│  ├─ Receive POST /api/exam/                                                │
│  ├─ Service auth middleware verifies x-service-secret                       │
│  ├─ Body validation                                                         │
│  ├─ Create exam in MongoDB                                                  │
│  └─ Return 201 { status: 'success', data: {...} }                          │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAIN SERVER: microservice-routes.js                                        │
│  ├─ Receive response status 201                                             │
│  ├─ Receive response body { status: 'success', data: {...} }               │
│  └─ Return to client: res.status(201).json(response.data)                   │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGGER MIDDLEWARE: logger-middleware.js (RESPONSE)                         │
│  ├─ Capture: status=201, responseBody { status: 'success', ... }           │
│  ├─ Capture: responseTime = 45ms                                            │
│  ├─ Add to Queue (non-blocking)                                             │
│  └─ Pass control back                                                       │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENT RESPONSE: 201 Created                                               │
│  Headers: Content-Type: application/json                                    │
│  Body: { "status": "success", "data": {...} }                              │
│                                                                             │
│  ✅ Request complete! (Total time: ~50ms)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                     │
          [Asynchronously in background]
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOG QUEUE SYSTEM: log-queue.js                                             │
│  ├─ Queue contains:                                                         │
│  │  ├─ REQUEST event                                                        │
│  │  └─ RESPONSE event                                                       │
│  │                                                                          │
│  ├─ Wait up to 100ms OR until size >= 100                                   │
│  ├─ Drain: Send all logs to Log Service                                     │
│  └─ Continue                                                                │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOG SERVICE: src/modules/log/app.js (Port 3001)                            │
│  ├─ Receive batch of logs                                                   │
│  ├─ Validate each log                                                       │
│  ├─ Sanitize sensitive fields                                               │
│  ├─ Calculate hash chain                                                    │
│  ├─ Store in MongoDB                                                        │
│  └─ Return 200 OK                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Microservice Integration Routes

```
CLIENT REQUESTS                          MAIN SERVER PROXY              MICROSERVICE
──────────────────────────────────────────────────────────────────────────────────

POST   /api/modules/exam/                Strips /api/modules/exam      POST /api/exam/
                                         Adds x-service-secret
                                         Forwards to :3002

GET    /api/modules/exam/123             Strips /api/modules/exam      GET /api/exam/123
       (includes query params)           Preserves query params

PATCH  /api/modules/student-exam/submit  Strips /api/modules/          POST /api/v1/
       /exam_001                         student-exam                   student-exam/submit/
                                         Forwards to :3005              exam_001

POST   /api/modules/grade-cheat/         Strips /api/modules/          POST /api/
       grade/async                       grade-cheat                    grade/async
       ?examId=123&mode=medium           Preserves query params         ?examId=123&
                                                                        mode=medium
```

---

## 4. Header Flow

```
CLIENT REQUEST HEADERS
├─ content-type: application/json
├─ accept: application/json
├─ x-request-id: req-001 (or generated)
├─ x-user-id: user-123
└─ authorization: Bearer token...

                    ↓ MAIN SERVER PROXY

FORWARDED TO MICROSERVICE (all headers + new ones)
├─ content-type: application/json ✓
├─ accept: application/json ✓
├─ x-request-id: req-001 ✓
├─ x-user-id: user-123 ✓
├─ authorization: Bearer token... ✓
├─ x-service-secret: supersecretkey ← ADDED
├─ x-forwarded-from: main-server ← ADDED
└─ (host header removed)

                    ↓ MICROSERVICE RESPONSE

RESPONSE HEADERS
├─ content-type: application/json
├─ content-length: 234
└─ (any other headers from microservice)

                    ↓ MAIN SERVER → CLIENT

RESPONSE TO CLIENT (all microservice headers)
├─ content-type: application/json ✓
├─ content-length: 234 ✓
└─ (all other headers preserved)
```

---

## 5. Queue System - Logging Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Request 1 → REQUEST Log → Queue (size: 1)                        │
│                                                                     │
│  ↓ Microservice processes...                                        │
│                                                                     │
│  Request 1 → RESPONSE Log → Queue (size: 2)                       │
│                                                                     │
│  ↓ 50ms passed (< 100ms timeout)                                    │
│                                                                     │
│  Request 2 → REQUEST Log → Queue (size: 3)                        │
│                                                                     │
│  ↓ More requests...                                                 │
│                                                                     │
│  Request 50 → RESPONSE Log → Queue (size: 100)                    │
│                                                                     │
│  ↓ Queue size >= 100, DRAIN!                                        │
│                                                                     │
│  ┌─ Batch: [REQUEST-1, RESPONSE-1, REQUEST-2, ... RESPONSE-50]  │
│  │                                                                 │
│  │ Send to Log Service:3001 (async, non-blocking)                 │
│  │                                                                 │
│  └─ Queue cleared, size: 0                                         │
│                                                                     │
│  ↓ Continue receiving...                                            │
│                                                                     │
│  Request 51 → REQUEST Log → Queue (size: 1)                       │
│                                                                     │
│  ↓ 100ms timeout, DRAIN!                                           │
│                                                                     │
│  ┌─ Batch: [REQUEST-51, ...]                                      │
│  │ Send to Log Service:3001                                        │
│  └─ Queue cleared                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT REQUEST: GET /api/modules/exam/                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  EXAM SERVICE NOT RUNNING (Port 3002)                           │
│  Error: ECONNREFUSED                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  MICROSERVICE ROUTES: Error handler                             │
│  ├─ Detect: error.code === 'ECONNREFUSED'                       │
│  ├─ Map to status: 503 Service Unavailable                      │
│  ├─ Format error response:                                      │
│  │  {                                                            │
│  │    "success": false,                                          │
│  │    "error": "Service unavailable: ...",                       │
│  │    "statusCode": 503                                          │
│  │  }                                                            │
│  └─ Return 503 with formatted error                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT RESPONSE: 503 Service Unavailable                       │
│  {                                                              │
│    "success": false,                                            │
│    "error": "Service unavailable: Microservice is unreachable", │
│    "statusCode": 503                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Security - x-service-secret Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Server .env                                               │
│  X_SERVICE_SECRET=supersecretkey                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Microservice Routes: _createProxyHandler()                     │
│  headers['x-service-secret'] = this.serviceSecret               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  HTTP Request to Microservice                                   │
│  Header: x-service-secret: supersecretkey                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Exam Service: service_auth_middleware                          │
│  ├─ Extract header: x-service-secret                            │
│  ├─ Compare with env: SERVICE_SECRET=supersecretkey             │
│  ├─ Match? YES → Continue to route handler                      │
│  └─ Match? NO → Return 401 Unauthorized                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION DEPLOYMENT                                          │
│                                                                 │
│  Load Balancer                                                  │
│  ├─ Port 443 (HTTPS)                                            │
│  │  ├─ api.company.com/                                         │
│  │  └─ → Main Server :3000 (multiple instances)                 │
│  │                                                              │
│  └─ Internal routing                                            │
│     ├─ Main Server → Exam Service :3002                         │
│     ├─ Main Server → Student-Exam :3005                         │
│     ├─ Main Server → Grade-Cheat :3004                          │
│     └─ All services → MongoDB                                   │
│                                                                 │
│  Log Service :3001 (shared)                                     │
│  ├─ Receives logs from all main servers                         │
│  └─ Stores in centralized MongoDB                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Flow - Complete Example

```
┌──────────────────────────────────────────────────────────────────┐
│  Example: Create Exam                                            │
└──────────────────────────────────────────────────────────────────┘

CLIENT
  │
  ├─ POST /api/modules/exam/
  │  Content-Type: application/json
  │  Body: {
  │    "subject": "Mathematics",
  │    "title": "Final Exam",
  │    "totalMarks": 100,
  │    "questions": [...]
  │  }
  │
  ↓
MAIN SERVER (3000)
  │
  ├─ Parse JSON
  ├─ Generate request ID: req-xxx
  ├─ Logger captures REQUEST
  │  → Add to queue (async)
  ├─ Route to microservice proxy
  ├─ Add headers:
  │  - x-service-secret: supersecretkey
  │  - x-request-id: req-xxx
  │  - x-forwarded-from: main-server
  ├─ Forward to http://localhost:3002/api/exam/
  │
  ↓
EXAM SERVICE (3002)
  │
  ├─ Verify x-service-secret ✓
  ├─ Validate body
  ├─ Calculate total marks checksum
  ├─ Create exam document
  ├─ Create question documents
  ├─ Store in MongoDB exam_db
  ├─ Return 201 Created
  │  {
  │    "status": "success",
  │    "data": {
  │      "_id": "exam_123",
  │      "subject": "Mathematics",
  │      "title": "Final Exam",
  │      ...
  │    }
  │  }
  │
  ↓
MAIN SERVER (3000)
  │
  ├─ Receive 201 response
  ├─ Logger captures RESPONSE
  │  → Add to queue (async)
  ├─ Return to client immediately
  │
  ↓
CLIENT
  │
  └─ 201 Created
     {
       "status": "success",
       "data": {
         "_id": "exam_123",
         ...
       }
     }

[Background: Queue drains every 100ms → Logs sent to Log Service → Stored]
```

---

## Key Insights

1. **Non-blocking**: Client gets response before logging completes
2. **Async logging**: Queue system batches logs efficiently
3. **Header forwarding**: All client headers preserved (except host)
4. **Service isolation**: Each microservice independent, own database
5. **Centralized auth**: x-service-secret verified by each service
6. **Error resilience**: Service down → 503 returned, client not blocked
7. **Request tracking**: x-request-id links all logs for tracing
8. **Scalable**: Can add more microservices without modifying main server
