# 🚀 Microservice Integration - Quick Start

## ⚡ 5-Minute Setup

### Step 1: Update `.env` File

Create/Update `server/.env`:

```env
# Main Server
MAIN_SERVER_PORT=3000
NODE_ENV=development

# Log Service
LOG_SERVICE_URL=http://localhost:3001/logs

# Microservice Secret (same across all microservices)
X_SERVICE_SECRET=supersecretkey

# Microservice URLs
EXAM_SERVICE_URL=http://localhost:3002
STUDENT_EXAM_SERVICE_URL=http://localhost:3005
GRADE_CHEAT_SERVICE_URL=http://localhost:3004
```

### Step 2: Install Dependencies

```bash
cd server
npm install
npm install express-validator axios  # ensure axios is installed
```

### Step 3: Start All Services (in different terminals)

**Terminal 1 - Log Service:**
```bash
cd server/src/modules/log && node app.js
```

**Terminal 2 - Exam Service:**
```bash
cd server/src/modules/exam && node server.js
```

**Terminal 3 - Student-Exam Service:**
```bash
cd server/src/modules/student-exam && npm start
```

**Terminal 4 - Grade-Cheat Service:**
```bash
cd server/src/modules/grade-cheat && python main.py
```

**Terminal 5 - Main Server:**
```bash
cd server && npm start
```

### Step 4: Test the Integration

```bash
# Test health
curl http://localhost:3000/health

# Test exam service through main server
curl http://localhost:3000/api/modules/exam/

# Test student-exam service
curl http://localhost:3000/api/modules/student-exam/

# Test grade-cheat health
curl http://localhost:3000/api/modules/grade-cheat/health
```

**Done! ✅**

---

## 📝 What Was Implemented

| Component | Description |
|-----------|-------------|
| Proxy Routing | `/api/modules/:service/*` automatically forwards to microservices |
| Security | `x-service-secret` header added to all microservice requests |
| Logging | Queue-based logging captures all microservice requests |
| Error Handling | Consistent error format with proper HTTP status codes |
| Documentation | Complete guides for setup, testing, and troubleshooting |

---

## 🔄 Request Flow

```
Client → /api/modules/exam/
         ↓
Main Server (strips /api/modules/)
         ↓
Adds x-service-secret header
         ↓
Forwards to http://localhost:3002/api/exam/
         ↓
Exam Service responds
         ↓
Logged automatically
         ↓
Response returned to Client
```

---

## 📖 Documentation

- **Setup & Architecture**: `src/common/microservices/README.md`
- **Testing Guide**: `MICROSERVICE_TESTING.md`
- **Implementation Details**: `MICROSERVICE_INTEGRATION_SUMMARY.md`

---

## ✅ Verification Checklist

- [ ] `.env` file exists with X_SERVICE_SECRET
- [ ] All 5 services running on correct ports
- [ ] Health check returns 200
- [ ] Can access `/api/modules/exam/`
- [ ] Can access `/api/modules/student-exam/`
- [ ] Can access `/api/modules/grade-cheat/health`
- [ ] Logs appearing in Log Service

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| 503 Service unavailable | Check if microservice is running: `curl localhost:300X/health` |
| ECONNREFUSED | Verify port in .env matches microservice port |
| x-service-secret missing | Verify X_SERVICE_SECRET in .env |
| Logs not appearing | Wait 100ms, check Log Service on port 3001 |

---

## 📞 For More Info

See:
- `MICROSERVICE_TESTING.md` - Detailed testing procedures
- `MICROSERVICE_INTEGRATION_SUMMARY.md` - Complete implementation details
- `src/common/microservices/README.md` - Architecture overview
