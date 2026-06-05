# Main Server Integration - Complete Setup Guide

**Main Server Port**: 3000  
**Log Service Port**: 3001  
**Architecture**: Non-blocking queue-based logging

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│    Main Server (Port 3000)          │
│  ┌─────────────────────────────────┐│
│  │ Express App + Routes            ││
│  │ ┌─────────────────────────────┐││
│  │ │ Logger Middleware           │││
│  │ │ - Captures REQUEST          │││
│  │ │ - Captures RESPONSE         │││
│  │ │ - Queues logs               │││
│  │ └─────────────────────────────┘││
│  │ ┌─────────────────────────────┐││
│  │ │ Log Queue                   │││
│  │ │ - Batches logs              │││
│  │ │ - Drains every 100ms        │││
│  │ │ - Or when size >= 100       │││
│  │ └─────────────────────────────┘││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
           ↓ HTTP POST
┌─────────────────────────────────────┐
│    Log Service (Port 3001)          │
│  - Validates + Sanitizes            │
│  - Stores in MongoDB                │
│  - Maintains hash chain             │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd c:\Users\User\Documents\STUDY\Sem4\ISL\Project\ISL-26\server

npm install
npm install express-validator axios uuid
```

### Step 2: Setup Environment Variables

Create `.env` file in server root:

```env
# Main Server
MAIN_SERVER_PORT=3000
SERVICE_NAME=main-server
NODE_ENV=development

# Log Service
LOG_SERVICE_PORT=3001
LOG_SERVICE_URL=http://localhost:3001/logs

# MongoDB
MONGODB_URI=mongodb://localhost:27017/logs
```

Also create `.env` in `src/modules/log/`:

```env
LOG_SERVICE_PORT=3001
MONGODB_URI=mongodb://localhost:27017/logs
NODE_ENV=development
LOG_LEVEL=debug
```

### Step 3: Start Both Services

**Terminal 1 - Log Service**:
```bash
cd src/modules/log
node app.js
```
Output: `✅ Log service running on port 3001`

**Terminal 2 - Main Server**:
```bash
node app.js
```
Output: `✅ Main server running at http://localhost:3000`

---

## 📝 How Logging Works

1. **Request arrives** at main server → Middleware captures it
2. **REQUEST log queued** → Added to memory queue (non-blocking)
3. **Response sent** → Middleware captures it
4. **RESPONSE log queued** → Added to memory queue (non-blocking)
5. **Main server responds** → User gets response immediately (no wait!)
6. **Queue drains** → Every 100ms or when size >= 100, sends all logs to log service
7. **Log service validates** → Sanitizes, calculates hashes, stores in MongoDB

**Key Point**: Main server never waits for log service response!

---

## 🧪 Test URLs (Postman Collection)

### Health Check

**Request**:
```
GET http://localhost:3000/health
```

**Response**:
```json
{
  "success": true,
  "message": "Main server is healthy",
  "timestamp": "2026-05-17T10:30:00.000Z",
  "queueSize": 0
}
```

---

### 1. Login (Success)

**Request**:
```
POST http://localhost:3000/auth/login
Content-Type: application/json
x-request-id: req-login-001
x-user-id: user-001
x-service: main-server

Body:
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_abc123",
  "user": {
    "id": "user-001",
    "email": "john@example.com"
  }
}
```

**Logs Created**:
- REQUEST: Captures method, path, headers (with password redacted), body
- RESPONSE: Captures status 200, token (redacted), response time

---

### 2. Login (Validation Error)

**Request**:
```
POST http://localhost:3000/auth/login
Content-Type: application/json

Body:
{
  "email": "john@example.com"
}
```

**Response** (400):
```json
{
  "success": false,
  "error": "Email and password required"
}
```

**Logs Created**:
- REQUEST: Email present, password missing
- RESPONSE: Status 400 (error logged for analysis)

---

### 3. Register

**Request**:
```
POST http://localhost:3000/auth/register
Content-Type: application/json
x-user-id: user-new

Body:
{
  "email": "newuser@example.com",
  "password": "newpass123",
  "name": "Jane Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "user-1715875400000",
    "email": "newuser@example.com",
    "name": "Jane Doe"
  }
}
```

---

### 4. Get Profile

**Request**:
```
GET http://localhost:3000/auth/profile
x-user-id: user-001
```

**Response** (200):
```json
{
  "success": true,
  "user": {
    "id": "user-001",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-01-01"
  }
}
```

---

### 5. Logout

**Request**:
```
POST http://localhost:3000/auth/logout
x-user-id: user-001
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 6. Error Test

**Request**:
```
GET http://localhost:3000/auth/error-test
```

**Response** (500):
```json
{
  "success": false,
  "error": "This is a test error"
}
```

**Logs**: Status 500 logged as error

---

### 7. 404 Route

**Request**:
```
GET http://localhost:3000/invalid/route
```

**Response** (404):
```json
{
  "success": false,
  "error": "Route not found"
}
```

---

## 📊 Verify Logs in Log Service

After making some requests, verify logs were stored:

### Query all logs from main-server

**Request**:
```
GET http://localhost:3001/logs/query?service=main-server&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "service": "main-server",
      "eventType": "REQUEST",
      "requestId": "req-login-001",
      "userId": "user-001",
      "timestamp": "2026-05-17T10:30:00.000Z",
      "request": {
        "method": "POST",
        "path": "/auth/login",
        "headers": { /* sanitized */ },
        "body": { /* password redacted */ }
      },
      "previousHash": "abc123...",
      "currentHash": "def456..."
    },
    {
      "_id": "507f...",
      "eventType": "RESPONSE",
      "requestId": "req-login-001",
      "response": {
        "statusCode": 200,
        "responseTime": 45
      },
      "previousHash": "def456...",
      "currentHash": "ghi789..."
    },
    /* more logs */
  ],
  "total": 47,
  "statusCode": 200
}
```

---

## 🔍 Advanced Queries

### Get error logs only
```
GET http://localhost:3001/logs/query?service=main-server&errorOnly=true
```

### Get user activity audit trail
```
GET http://localhost:3001/logs/query?userId=user-001&limit=50
```

### Get REQUEST + RESPONSE pair
```
GET http://localhost:3001/logs/pair/req-login-001
```

### Check hash chain integrity
```
POST http://localhost:3001/logs/verify-chain
Body: {
  "service": "main-server",
  "environment": "development"
}
```

### Get statistics
```
GET http://localhost:3001/logs/stats/main-server
```

---

## 🛡️ Key Features

✅ **Non-blocking Logging**: Main server never waits for log service  
✅ **Queue-based**: Batches logs, sends every 100ms or when size >= 100  
✅ **Auto-sanitization**: Passwords, tokens, API keys redacted  
✅ **Hash Chain**: Detects tampering with audit trail  
✅ **Request Tracking**: x-request-id links REQUEST + RESPONSE  
✅ **User Tracking**: x-user-id for audit trails  
✅ **Request ID Headers**: Add custom headers:
  - `x-request-id`: Track request across logs
  - `x-user-id`: Associate with user
  - `x-service`: Override service name

---

## 📋 Headers Reference

Add these headers in Postman to test tracking:

| Header | Example | Purpose |
|--------|---------|---------|
| `x-request-id` | `req-login-001` | Links REQUEST + RESPONSE |
| `x-user-id` | `user-001` | User audit trail |
| `x-service` | `main-server` | Override service name |

---

## 🔧 Queue Configuration

Edit in `src/common/queue/log-queue.js`:

```javascript
// Default: 100 logs max, drain every 100ms
const queue = new LogQueue(100, 100);

// Change to:
// new LogQueue(50, 200)  // 50 max logs, drain every 200ms
// new LogQueue(200, 50)  // 200 max logs, drain every 50ms
```

---

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on log service | Make sure log service is running on port 3001 |
| Logs not appearing | Check queue size: `GET /health` shows `queueSize` |
| Missing dependencies | Run: `npm install express-validator axios uuid` |
| `.env` not loaded | Delete and recreate `.env`, restart server |
| Port 3000 in use | Kill process or change `MAIN_SERVER_PORT` |
| Passwords not sanitized | Check `src/modules/log/config/config.js` patterns |

---

## 📚 File Structure

```
server/
├── app.js                         ← Main entry point (port 3000)
├── .env                           ← Environment config
├── package.json
├── src/
│   ├── common/
│   │   ├── middleware/
│   │   │   └── logger-middleware.js    ← Captures REQUEST+RESPONSE
│   │   └── queue/
│   │       └── log-queue.js            ← Batches + sends logs
│   ├── modules/
│   │   ├── auth/
│   │   │   └── routes.js               ← Sample routes
│   │   └── log/
│   │       ├── app.js                  ← Log service (port 3001)
│   │       ├── config/
│   │       ├── controller/
│   │       ├── model/
│   │       ├── repository/
│   │       ├── routes/
│   │       ├── service/
│   │       ├── utils/
│   │       └── validator/
```

---

## 🎯 Complete Testing Workflow

1. **Start Log Service**
   ```bash
   cd src/modules/log && node app.js
   ```

2. **Start Main Server**
   ```bash
   node app.js
   ```

3. **Health Check**
   ```
   GET http://localhost:3000/health
   ```

4. **Create Logs**
   ```
   POST http://localhost:3000/auth/login
   ```

5. **Wait 100ms** (queue drains)

6. **Query Logs**
   ```
   GET http://localhost:3001/logs/query?service=main-server
   ```

7. **Verify Hash Chain**
   ```
   POST http://localhost:3001/logs/verify-chain
   ```

---

## 🚀 Next Steps

- [ ] Add authentication middleware to main server
- [ ] Add more routes/modules
- [ ] Persist queue to Redis (for production)
- [ ] Add queue metrics/monitoring
- [ ] Add structured logging library (winston/pino)
- [ ] Add integration tests

