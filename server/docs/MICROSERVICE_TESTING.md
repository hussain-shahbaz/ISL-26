# Microservice Integration - Testing & Validation Guide

## ✅ Pre-Integration Checklist

Before testing, ensure:

- [ ] `.env` file exists in `server/` root with all microservice URLs
- [ ] `X_SERVICE_SECRET` is set to the same value as `SERVICE_SECRET` in each microservice's `.env`
- [ ] All microservices are running on their respective ports
- [ ] MongoDB is running for database operations

---

## 🚀 Setup & Start All Services

### Terminal 1 - Log Service
```bash
cd server/src/modules/log
node app.js
# Expected: ✅ Log service running on port 3001
```

### Terminal 2 - Exam Service
```bash
cd server/src/modules/exam
npm install  # if not already done
node server.js
# Expected: Server chal raha hai port 3002 pe
```

### Terminal 3 - Student-Exam Service
```bash
cd server/src/modules/student-exam
npm install  # if not already done
npm start
# Expected: Student Exam Service is running on port 3005
```

### Terminal 4 - Grade-Cheat Service
```bash
cd server/src/modules/grade-cheat
pip install -r requirements.txt  # if not already done
python main.py
# Expected: Running on port 3004
```

### Terminal 5 - Main Server
```bash
cd server
npm install express-validator axios  # ensure axios is installed
npm start
# Expected: ✅ Main server running at http://localhost:3000
```

---

## 🧪 Test Cases

### Test 1: Health Check
Verify main server is running and all services are accessible.

**Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Main server is healthy",
  "timestamp": "2026-06-06T02:20:00.000Z",
  "queueSize": 0
}
```

---

### Test 2: Exam Service - Get All Exams

**Request:**
```bash
curl -X GET http://localhost:3000/api/modules/exam/ \
  -H "x-request-id: test-001"
```

**Request Flow:**
1. Main server receives at `/api/modules/exam/`
2. Strips `/api/modules/` prefix
3. Adds headers:
   - `x-service-secret: supersecretkey`
   - `x-request-id: test-001`
   - `x-forwarded-from: main-server`
4. Forwards to `http://localhost:3002/api/exam/`

**Expected Response:**
```json
{
  "status": "success",
  "data": [...]
}
```

**Logs Captured:**
- REQUEST: Method GET, Path /api/modules/exam/, headers (with x-service-secret)
- RESPONSE: Status 200, response time, data received

---

### Test 3: Create Exam (with body)

**Request:**
```bash
curl -X POST http://localhost:3000/api/modules/exam/ \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-create-exam" \
  -d '{
    "subject": "Mathematics",
    "title": "Mid-Term Exam",
    "totalMarks": 50,
    "scheduledTime": "2025-12-01T09:00:00.000Z",
    "timeAllowed": 90,
    "questions": [
      {
        "type": "mcq",
        "questionText": "What is 2 + 2?",
        "options": ["2", "3", "4", "5"],
        "referenceAnswer": "4",
        "marks": 10
      }
    ]
  }'
```

**Verification:**
- [ ] Request logged with body (sanitized if needed)
- [ ] Forwarded to exam service with `x-service-secret` header
- [ ] Response received and returned to client
- [ ] Response logged with status code and response time

---

### Test 4: Student-Exam Service - Get Assigned Exams

**Request:**
```bash
curl -X GET http://localhost:3000/api/modules/student-exam/ \
  -H "x-request-id: test-student-exams"
```

**Request Flow:**
1. Main server receives at `/api/modules/student-exam/`
2. Strips `/api/modules/` prefix
3. Forwards to `http://localhost:3005/api/v1/student-exam/`

**Expected Response:**
```json
{
  "success": true,
  "message": "Exams fetched successfully",
  "statusCode": 200,
  "data": [...]
}
```

---

### Test 5: Grade-Cheat Service - Start Grading

**Request:**
```bash
curl -X POST "http://localhost:3000/api/modules/grade-cheat/grade/async?examId=exam_001&mode=medium" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-grading"
```

**Request Flow:**
1. Main server receives at `/api/modules/grade-cheat/grade/async?examId=exam_001&mode=medium`
2. Forwards to `http://localhost:3004/api/grade/async?examId=exam_001&mode=medium`
3. Query parameters automatically included

**Expected Response:**
```json
{
  "success": true,
  "taskId": "task_123",
  "message": "Grading started"
}
```

---

### Test 6: Service Unavailable (Error Handling)

**Stop exam service, then request:**
```bash
curl -X GET http://localhost:3000/api/modules/exam/
```

**Expected Response (503):**
```json
{
  "success": false,
  "error": "Service unavailable: Microservice is unreachable",
  "statusCode": 503
}
```

**Verification:**
- [ ] Consistent error format returned
- [ ] Appropriate status code (503, not 500)
- [ ] Error message is helpful
- [ ] Request logged (ECONNREFUSED captured)

---

### Test 7: Invalid Route (404)

**Request:**
```bash
curl -X GET http://localhost:3000/api/modules/exam/invalid-endpoint
```

**Expected Response (404 or microservice response):**
- If endpoint doesn't exist on microservice:
```json
{
  "status": "error",
  "message": "Route not found"
}
```

---

## 📊 Verify Logging

After running tests, verify logs were captured:

**Query logs:**
```bash
curl "http://localhost:3001/logs/query?service=main-server&limit=20"
```

**Expected:**
- Multiple REQUEST/RESPONSE pairs
- All with x-service-secret in headers (sanitized)
- Timestamps for each request
- Status codes captured

---

## 🔍 Debug Checklist

| Issue | Check |
|-------|-------|
| 503 Service unavailable | Is microservice running on correct port? |
| ECONNREFUSED | Check firewall, service process, port binding |
| x-service-secret missing | Verify it's added in microservice-routes.js headers |
| Wrong API path | Verify baseApiPath matches microservice's actual path |
| Headers not forwarded | Check if headers object is correctly spread |
| Query params lost | Verify params: req.query in axios config |
| Body not sent | Check method !== 'GET' condition |
| Response is empty | Verify microservice response format |

---

## 🧪 Postman Collection

You can import this collection in Postman:

### Exam Service Tests

```
GET /api/modules/exam/
POST /api/modules/exam/
GET /api/modules/exam/:id
PATCH /api/modules/exam/:id
DELETE /api/modules/exam/:id
```

### Student-Exam Service Tests

```
GET /api/modules/student-exam/
POST /api/modules/student-exam/submit/:examId
GET /api/modules/student-exam/result/:examId
```

### Grade-Cheat Service Tests

```
POST /api/modules/grade-cheat/grade/async?examId=:examId&mode=:mode
GET /api/modules/grade-cheat/grade/progress?taskId=:taskId
GET /api/modules/grade-cheat/results?examId=:examId
GET /api/modules/grade-cheat/analytics?examId=:examId
GET /api/modules/grade-cheat/health
```

---

## 📈 Performance Testing

### Test 1: Request Time
Measure time from client to microservice and back:

```bash
time curl -X GET http://localhost:3000/api/modules/exam/
```

Should be < 100ms for local services.

### Test 2: Concurrent Requests
Send 10 concurrent requests:

```bash
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/modules/exam/ &
done
wait
```

All should complete successfully.

---

## 🔐 Security Testing

### Test 1: x-service-secret Header
Verify header is being sent:

```bash
# Start tcpdump or use Postman's request inspector
curl -X GET http://localhost:3000/api/modules/exam/ \
  -v
```

Look for: `x-service-secret: supersecretkey`

### Test 2: Request ID Tracking
Verify all logs linked by request ID:

```bash
curl -X GET http://localhost:3000/api/modules/exam/ \
  -H "x-request-id: unique-id-123"

# Then query logs:
curl "http://localhost:3001/logs/query?requestId=unique-id-123"
```

Expected: Both REQUEST and RESPONSE with same requestId

---

## 🎯 Sign-Off Checklist

After all tests pass:

- [ ] Health check returns 200 with queue size
- [ ] All 3 microservices reachable via `/api/modules/:service/*`
- [ ] x-service-secret header automatically added
- [ ] Requests logged to queue system
- [ ] Responses returned in consistent format
- [ ] Errors handled with 503/504 for service issues
- [ ] Query parameters forwarded correctly
- [ ] Request bodies forwarded correctly
- [ ] Service unavailable returns 503 (not 500)
- [ ] All microservice responses returned as-is

---

## 📝 Common Issues & Solutions

### Issue: 404 on /api/modules/exam/
**Solution:** Ensure exam service is running on port 3002 and responding to `/api/exam/`

### Issue: x-service-secret not in microservice request
**Solution:** Verify headers are correctly spread in microservice-routes.js line 51-57

### Issue: Body not being sent to microservice
**Solution:** Check that POST/PATCH requests include body in axios config

### Issue: Query parameters not reaching microservice
**Solution:** Verify `params: req.query` is in axios config

### Issue: Logs showing wrong service name
**Solution:** Verify x-forwarded-from header is set to 'main-server'

---

## 📞 Support

For issues:
1. Check service logs for error messages
2. Verify all microservices are running: `curl localhost:300X/health`
3. Check firewall/network connectivity between services
4. Review `src/common/microservices/microservice-routes.js` for proxy logic
5. Enable debug logging in .env: `LOG_LEVEL=debug`
