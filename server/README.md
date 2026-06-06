# 🚀 ISL-26 Log Microservice - Quick Start

## What's Built?

**Complete microservices architecture with audit logging:**

- ✅ **Main Server** (Port 3000) - API with logging middleware
- ✅ **Log Service** (Port 3001) - Dedicated logging microservice  
- ✅ **Queue System** - Non-blocking, batches logs every 100ms
- ✅ **Hash Chain** - Detects tampering, immutable audit trail
- ✅ **Sanitization** - Auto-redacts passwords, tokens, API keys
- ✅ **Request Tracking** - Links REQUEST + RESPONSE by ID
- ✅ **Express Validator** - All inputs validated before processing

---

## ⚡ 60-Second Setup

### 1. Install Dependencies
```bash
npm install
npm install express-validator axios uuid
```

### 2. Setup .env
```bash
cp .env.example .env
# Edit .env if needed (defaults should work)
```

### 3. Start Log Service (Terminal 1)
```bash
cd src/modules/log
node app.js
```
See: `✅ Log service running on port 3001`

### 4. Start Main Server (Terminal 2)
```bash
node app.js
```
See: `✅ Main server running at http://localhost:3000`

### 5. Test in Postman
```
POST http://localhost:3000/auth/login
Body: {
  "email": "test@example.com",
  "password": "testpass"
}
```

### 6. Verify Logs
```
GET http://localhost:3001/logs/query?service=main-server
```

Done! 🎉

---

## 📖 Learn More

- **Full Setup Guide**: See `INTEGRATION.md`
- **Log Service API**: See `src/modules/log/README.md`
- **Architecture Details**: See `src/modules/log/CONTEXT.md`
- **Microservice Integration**: See `src/common/microservices/README.md`

---

## 🔌 Microservice Integration

All microservices are now integrated through the main server with automatic proxy routing and logging.

### Integrated Services

| Service | Port | Route | Purpose |
|---------|------|-------|---------|
| **Exam** | 3002 | `/api/modules/exam/*` | Manage exams & questions |
| **Student-Exam** | 3005 | `/api/modules/student-exam/*` | Track submissions |
| **Grade-Cheat** | 3004 | `/api/modules/grade-cheat/*` | Grading & plagiarism |

### Quick Test

```bash
# Get exams through main server
curl http://localhost:3000/api/modules/exam/

# Submit exam
curl http://localhost:3000/api/modules/student-exam/

# Check grading service
curl http://localhost:3000/api/modules/grade-cheat/health
```

### How Microservice Requests Are Handled

1. **Request arrives** at main server `/api/modules/exam/...`
2. **Logger middleware** captures REQUEST (added to queue)
3. **Proxy strips prefix** `/api/modules/` and forwards to microservice
4. **x-service-secret header** automatically added from `.env`
5. **Microservice response** received
6. **Logger middleware** captures RESPONSE (added to queue)
7. **Response returned** to client
8. **Queue drains** every 100ms → Logs sent to Log Service

**Key**: Microservice calls are automatically logged without blocking the main request!

---

## 🧪 Sample Routes (Already Built)

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/health` | Service status + queue size |
| POST | `/auth/login` | Test success response |
| POST | `/auth/register` | Test 201 created |
| GET | `/auth/profile` | Test GET request |
| POST | `/auth/logout` | Test simple POST |
| GET | `/auth/error-test` | Test 500 error logging |

---

## 🎯 How It Works

```
1. Request arrives at :3000
   ↓
2. Logger middleware captures REQUEST
   ↓
3. REQUEST added to queue (non-blocking)
   ↓
4. Route handler processes request
   ↓
5. Response sent back to client
   ↓
6. Logger middleware captures RESPONSE
   ↓
7. RESPONSE added to queue (non-blocking)
   ↓
8. Main server responds to client (done!)
   ↓
9. Every 100ms: Queue drains → Sends to log service :3001
   ↓
10. Log service: Validates → Sanitizes → Stores in MongoDB
```

**Key**: Client gets response instantly! Logs sent async.

---

## 📊 Test Flow in Postman

1. **Health Check**
   ```
   GET http://localhost:3000/health
   ```
   Shows: `queueSize: 0` or `queueSize: 5`

2. **Make a Request**
   ```
   POST http://localhost:3000/auth/login
   ```

3. **Immediate Response**
   Gets response right away

4. **Wait 100ms** for queue to drain

5. **Check Logs**
   ```
   GET http://localhost:3001/logs/query?service=main-server&limit=10
   ```
   Shows REQUEST + RESPONSE pair

6. **Verify Chain**
   ```
   POST http://localhost:3001/logs/verify-chain
   {
     "service": "main-server",
     "environment": "development"
   }
   ```
   Returns: `isValid: true`

---

## 🔍 Custom Headers (Optional)

Add these to requests for better tracking:

```
x-request-id: req-12345      # Links REQUEST + RESPONSE
x-user-id: user-001          # For audit trail
x-service: main-server       # Override service name
```

Example:
```
POST http://localhost:3000/auth/login
x-request-id: req-login-001
x-user-id: user-001
```

---

## 🛡️ Security Features

✅ **Passwords Redacted** - Automatically removed before logging  
✅ **Tokens Redacted** - Authorization headers masked  
✅ **API Keys Redacted** - x-api-key values hidden  
✅ **Hash Chain** - Any modification breaks the chain (detected)  
✅ **Input Validation** - Invalid data rejected at routes  
✅ **Immutable Logs** - Can't update, only create  

---

## 📝 Logs Include

**REQUEST**:
- Method, Path, Query, Body
- Headers (sanitized)
- User ID, Request ID
- Timestamp

**RESPONSE**:
- Status Code
- Response Body (sanitized)
- Response Time (ms)
- User ID, Request ID
- Timestamp

**Both**:
- Service Name
- Environment
- Hash Chain (previousHash → currentHash)

---

## ⚙️ Configuration

| Item | Location | Default |
|------|----------|---------|
| Main Server Port | `.env` MAIN_SERVER_PORT | 3000 |
| Log Service Port | `.env` LOG_SERVICE_PORT | 3001 |
| Queue Max Size | `src/common/queue/log-queue.js` | 100 logs |
| Queue Drain Interval | `src/common/queue/log-queue.js` | 100ms |
| MongoDB URI | `.env` MONGODB_URI | localhost:27017 |

---

## 🐛 Troubleshooting

**Q: Logs not appearing?**  
A: Check `GET http://localhost:3000/health` → `queueSize`. Wait 100ms, then query logs.

**Q: Port 3000/3001 in use?**  
A: Change in `.env` or kill existing process.

**Q: Missing dependencies?**  
A: Run `npm install express-validator axios uuid`

**Q: MongoDB connection error?**  
A: Start MongoDB: `mongod`

---

## 📚 Project Structure

```
server/
├── app.js                     ← Main entry point
├── INTEGRATION.md             ← Full guide
├── .env.example               ← Config template
├── package.json
├── src/
│   ├── common/
│   │   ├── middleware/        ← Logger middleware
│   │   └── queue/             ← Log queue system
│   └── modules/
│       ├── auth/              ← Sample routes
│       └── log/               ← Log microservice
│           ├── app.js
│           ├── config/
│           ├── controller/
│           ├── model/
│           ├── repository/
│           ├── routes/
│           ├── service/
│           ├── utils/
│           └── validator/
```

---

## 🎓 Learning Resources

1. **Understanding Queue-Based Logging**:
   - See: `src/common/queue/log-queue.js`
   - How: Batches logs, drains periodically

2. **Understanding Middleware**:
   - See: `src/common/middleware/logger-middleware.js`
   - How: Captures REQUEST and RESPONSE automatically

3. **Understanding Hash Chain**:
   - See: `src/modules/log/utils/hash-utils.js`
   - How: Each log links to previous log's hash

4. **Understanding Sanitization**:
   - See: `src/modules/log/utils/sanitizer.js`
   - How: Recursive removal of sensitive fields

---

## ✅ Ready?

1. ✅ Install deps: `npm install express-validator axios uuid`
2. ✅ Start log service: `cd src/modules/log && node app.js`
3. ✅ Start main server: `node app.js`
4. ✅ Test in Postman: `POST http://localhost:3000/auth/login`
5. ✅ Check logs: `GET http://localhost:3001/logs/query?service=main-server`

**Go build! 🚀**

