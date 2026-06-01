# Log Service - Complete Test Cases for Postman

**Base URL**: `http://localhost:3001`

---

## 🧪 Test Cases Overview

This guide provides step-by-step test cases for all 8 routes of the log service. Follow the order below to fully test the system.

**Total Routes**: 8  
**Test Cases**: 35+  
**Estimated Time**: 10-15 minutes

---

## 📋 Pre-Test Checklist

- [ ] Log service running on port 3001
- [ ] MongoDB running on localhost:27017
- [ ] Postman installed and ready
- [ ] Create Postman collection named "Log Service Tests"
- [ ] Set base URL: `{{BASE_URL}}` = `http://localhost:3001`

---

## 🚀 Route 1: Health Check

**Endpoint**: `GET /health`  
**Purpose**: Verify service is running  
**Authorization**: None

### Test Case 1.1: Service Health

**Request**:
```
GET http://localhost:3001/health
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "message": "Log microservice is healthy",
  "timestamp": "2026-05-17T10:30:00.000Z"
}
```

---

## 📝 Route 2: Create Log (POST /logs)

**Endpoint**: `POST /logs`  
**Purpose**: Create new REQUEST or RESPONSE log  
**Content-Type**: application/json

### Test Case 2.1: Create REQUEST Log (Success)

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "REQUEST",
  "requestId": "req-login-001",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00Z",
  "request": {
    "method": "POST",
    "path": "/api/auth/login",
    "headers": {
      "content-type": "application/json",
      "authorization": "Bearer token-secret-123",
      "user-agent": "Postman/10.0"
    },
    "query": {},
    "body": {
      "email": "john@example.com",
      "password": "securepassword123"
    }
  }
}
```

**Expected Status**: 201

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "environment": "production",
    "eventType": "REQUEST",
    "requestId": "req-login-001",
    "userId": "user-001",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "request": {
      "method": "POST",
      "path": "/api/auth/login",
      "headers": {
        "content-type": "application/json",
        "authorization": "***REDACTED***",
        "user-agent": "Postman/10.0"
      },
      "query": {},
      "body": {
        "email": "john@example.com",
        "password": "***REDACTED***"
      }
    },
    "previousHash": null,
    "currentHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "createdAt": "2026-05-17T10:30:00.000Z"
  },
  "statusCode": 201
}
```

**Note**: Save the `_id` from response as `LOG_ID_1` for later tests.

---

### Test Case 2.2: Create RESPONSE Log (Links to Previous)

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "RESPONSE",
  "requestId": "req-login-001",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00.045Z",
  "response": {
    "statusCode": 200,
    "headers": {
      "content-type": "application/json",
      "authorization": "Bearer jwt-token-xyz"
    },
    "body": {
      "success": true,
      "message": "Login successful",
      "token": "jwt_token_super_secret_abc123",
      "user": {
        "id": "user-001",
        "email": "john@example.com",
        "name": "John Doe"
      }
    },
    "responseTime": 45
  }
}
```

**Expected Status**: 201

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "service": "auth-service",
    "environment": "production",
    "eventType": "RESPONSE",
    "requestId": "req-login-001",
    "userId": "user-001",
    "timestamp": "2026-05-17T10:30:00.045Z",
    "response": {
      "statusCode": 200,
      "headers": {
        "content-type": "application/json",
        "authorization": "***REDACTED***"
      },
      "body": {
        "success": true,
        "message": "Login successful",
        "token": "***REDACTED***",
        "user": {
          "id": "user-001",
          "email": "john@example.com",
          "name": "John Doe"
        }
      },
      "responseTime": 45
    },
    "previousHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "currentHash": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7",
    "createdAt": "2026-05-17T10:30:00.045Z"
  },
  "statusCode": 201
}
```

**Note**: `previousHash` matches REQUEST's `currentHash` ✅

---

### Test Case 2.3: Missing Required Field (Validation Error)

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "environment": "production",
  "eventType": "REQUEST",
  "requestId": "req-test-001",
  "timestamp": "2026-05-17T10:30:00Z",
  "request": {}
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "service",
      "message": "Service is required"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 2.4: Invalid Environment (Validation Error)

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "invalid-env",
  "eventType": "REQUEST",
  "requestId": "req-test-002",
  "timestamp": "2026-05-17T10:30:00Z",
  "request": {}
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "environment",
      "message": "Invalid environment"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 2.5: Invalid Timestamp Format

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "REQUEST",
  "requestId": "req-test-003",
  "timestamp": "invalid-date",
  "request": {}
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "timestamp",
      "message": "Timestamp must be valid ISO8601 date"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 2.6: Create Error Log

**Request**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "RESPONSE",
  "requestId": "req-error-001",
  "userId": "user-002",
  "timestamp": "2026-05-17T10:31:00Z",
  "response": {
    "statusCode": 500,
    "headers": {},
    "body": {
      "success": false,
      "error": "Internal server error"
    }
  },
  "error": {
    "message": "Database connection failed",
    "stack": "Error: ECONNREFUSED at ...",
    "code": "ECONNREFUSED"
  }
}
```

**Expected Status**: 201

**Note**: Status 500 automatically marked as error in logs

---

## 🔍 Route 3: Get Single Log

**Endpoint**: `GET /logs/logs/:id`  
**Purpose**: Retrieve a specific log by ID

### Test Case 3.1: Get Existing Log (Success)

Use the `LOG_ID_1` saved from Test Case 2.1:

**Request**:
```
GET http://localhost:3001/logs/logs/507f1f77bcf86cd799439011
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "eventType": "REQUEST",
    "requestId": "req-login-001",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "previousHash": null,
    "currentHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "request": { /* sanitized */ }
  },
  "statusCode": 200
}
```

---

### Test Case 3.2: Invalid Log ID Format

**Request**:
```
GET http://localhost:3001/logs/logs/invalid-id-format
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "Invalid log ID format"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 3.3: Log Not Found

**Request**:
```
GET http://localhost:3001/logs/logs/507f1f77bcf86cd799999999
```

**Expected Status**: 404

**Expected Response**:
```json
{
  "success": false,
  "error": "Log not found",
  "statusCode": 404
}
```

---

## 🔗 Route 4: Get REQUEST + RESPONSE Pair

**Endpoint**: `GET /logs/pair/:requestId`  
**Purpose**: Get both REQUEST and RESPONSE logs linked by requestId

### Test Case 4.1: Get Existing Pair

**Request**:
```
GET http://localhost:3001/logs/pair/req-login-001
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "eventType": "REQUEST",
      "requestId": "req-login-001",
      "timestamp": "2026-05-17T10:30:00.000Z",
      "currentHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "request": { /* ... */ }
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "eventType": "RESPONSE",
      "requestId": "req-login-001",
      "timestamp": "2026-05-17T10:30:00.045Z",
      "previousHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "currentHash": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7",
      "response": { /* ... */ }
    }
  ],
  "total": 2,
  "statusCode": 200
}
```

---

### Test Case 4.2: No Logs Found for RequestId

**Request**:
```
GET http://localhost:3001/logs/pair/req-nonexistent
```

**Expected Status**: 404

**Expected Response**:
```json
{
  "success": false,
  "error": "No logs found for this request ID",
  "statusCode": 404
}
```

---

## 🔎 Route 5: Query Logs

**Endpoint**: `GET /logs/query`  
**Purpose**: Query logs with various filters

### Test Case 5.1: Query by Service

**Request**:
```
GET http://localhost:3001/logs/query?service=auth-service&limit=10&skip=0
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": [
    { /* log 1 */ },
    { /* log 2 */ },
    { /* log 3 */ }
  ],
  "total": 3,
  "statusCode": 200
}
```

---

### Test Case 5.2: Query by Service + EventType

**Request**:
```
GET http://localhost:3001/logs/query?service=auth-service&eventType=REQUEST&limit=5
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "service": "auth-service",
      "eventType": "REQUEST",
      "requestId": "req-login-001",
      "timestamp": "2026-05-17T10:30:00.000Z",
      "request": { /* ... */ }
    }
  ],
  "total": 1,
  "statusCode": 200
}
```

---

### Test Case 5.3: Query by UserId (Audit Trail)

**Request**:
```
GET http://localhost:3001/logs/query?userId=user-001&limit=10
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": [
    { /* all logs for user-001 */ }
  ],
  "total": 2,
  "statusCode": 200
}
```

---

### Test Case 5.4: Query by Status Code

**Request**:
```
GET http://localhost:3001/logs/query?statusCode=200&limit=5
```

**Expected Status**: 200

**Expected Response**: Returns logs with response statusCode = 200

---

### Test Case 5.5: Query by Date Range

**Request**:
```
GET http://localhost:3001/logs/query?startTime=2026-05-17T10:00:00Z&endTime=2026-05-17T11:00:00Z&limit=20
```

**Expected Status**: 200

**Expected Response**: Returns logs within date range

---

### Test Case 5.6: Query Error Logs Only

**Request**:
```
GET http://localhost:3001/logs/query?errorOnly=true&limit=10
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "response": {
        "statusCode": 500
      }
    }
  ],
  "total": 1,
  "statusCode": 200
}
```

---

### Test Case 5.7: Invalid Limit (Validation Error)

**Request**:
```
GET http://localhost:3001/logs/query?service=auth-service&limit=2000
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 1000"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 5.8: Invalid Status Code

**Request**:
```
GET http://localhost:3001/logs/query?statusCode=999
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "statusCode",
      "message": "StatusCode must be between 100 and 599"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 5.9: No Filter Provided

**Request**:
```
GET http://localhost:3001/logs/query?limit=10
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "No valid filter provided",
  "statusCode": 400
}
```

---

## ✅ Route 6: Verify Chain Integrity

**Endpoint**: `POST /logs/verify-chain`  
**Purpose**: Detect if hash chain is broken (tampering detection)

### Test Case 6.1: Valid Chain

**Request**:
```
POST http://localhost:3001/logs/verify-chain
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production"
}
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "Hash chain is valid and unbroken",
    "totalLogs": 2
  },
  "statusCode": 200
}
```

---

### Test Case 6.2: Missing Environment (Validation Error)

**Request**:
```
POST http://localhost:3001/logs/verify-chain
Content-Type: application/json

Body:
{
  "service": "auth-service"
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "environment",
      "message": "Environment is required"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 6.3: Invalid Environment Value

**Request**:
```
POST http://localhost:3001/logs/verify-chain
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "invalid"
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "environment",
      "message": "Invalid environment"
    }
  ],
  "statusCode": 400
}
```

---

## 📊 Route 7: Get Statistics

**Endpoint**: `GET /logs/stats/:service`  
**Purpose**: Get aggregated statistics

### Test Case 7.1: Get Stats for Service

**Request**:
```
GET http://localhost:3001/logs/stats/auth-service
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "totalLogs": 2,
    "requestCount": 1,
    "responseCount": 1,
    "errorCount": 0,
    "avgResponseTime": 45
  },
  "statusCode": 200
}
```

---

### Test Case 7.2: Get Stats with EventType Filter

**Request**:
```
GET http://localhost:3001/logs/stats/auth-service?eventType=REQUEST
```

**Expected Status**: 200

**Expected Response**: Stats filtered to REQUEST events only

---

### Test Case 7.3: Invalid EventType

**Request**:
```
GET http://localhost:3001/logs/stats/auth-service?eventType=INVALID
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "eventType",
      "message": "EventType must be REQUEST or RESPONSE"
    }
  ],
  "statusCode": 400
}
```

---

## 🧹 Route 8: Cleanup Old Logs

**Endpoint**: `POST /logs/cleanup`  
**Purpose**: Delete logs older than N days

### Test Case 8.1: Cleanup Logs

**Request**:
```
POST http://localhost:3001/logs/cleanup
Content-Type: application/json

Body:
{
  "days": 90
}
```

**Expected Status**: 200

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 0,
    "message": "Deleted logs older than 90 days"
  },
  "statusCode": 200
}
```

---

### Test Case 8.2: Invalid Days (Not Positive)

**Request**:
```
POST http://localhost:3001/logs/cleanup
Content-Type: application/json

Body:
{
  "days": 0
}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "days",
      "message": "Days must be a positive integer"
    }
  ],
  "statusCode": 400
}
```

---

### Test Case 8.3: Missing Days

**Request**:
```
POST http://localhost:3001/logs/cleanup
Content-Type: application/json

Body:
{}
```

**Expected Status**: 400

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "days",
      "message": "Days is required"
    }
  ],
  "statusCode": 400
}
```

---

## 🎯 Complete Test Workflow (Sequential)

Follow this order to test all functionality:

1. ✅ **2.1** - Create REQUEST log (save LOG_ID_1)
2. ✅ **2.2** - Create RESPONSE log (verify hash linking)
3. ✅ **2.3** - Try invalid request (validation)
4. ✅ **2.4** - Try invalid environment (validation)
5. ✅ **2.5** - Try invalid timestamp (validation)
6. ✅ **2.6** - Create error log (status 500)
7. ✅ **3.1** - Get single log by ID
8. ✅ **3.2** - Try invalid ID format
9. ✅ **3.3** - Try non-existent ID (404)
10. ✅ **4.1** - Get REQUEST + RESPONSE pair
11. ✅ **4.2** - Try non-existent pair (404)
12. ✅ **5.1** - Query by service
13. ✅ **5.2** - Query by service + eventType
14. ✅ **5.3** - Query by userId
15. ✅ **5.4** - Query by status code
16. ✅ **5.5** - Query by date range
17. ✅ **5.6** - Query error logs
18. ✅ **5.7** - Try invalid limit
19. ✅ **5.8** - Try invalid status code
20. ✅ **5.9** - Try no filter
21. ✅ **6.1** - Verify chain (should be valid)
22. ✅ **6.2** - Try missing environment
23. ✅ **6.3** - Try invalid environment
24. ✅ **7.1** - Get statistics
25. ✅ **7.2** - Get stats with eventType filter
26. ✅ **7.3** - Try invalid eventType
27. ✅ **8.1** - Cleanup old logs
28. ✅ **8.2** - Try days = 0
29. ✅ **8.3** - Try missing days

**Total**: 29 test cases covering all scenarios ✅

---

## 📦 Postman Collection Export Template

You can use this structure to organize tests:

```
Log Service Tests
├── 1. Health Check
│   └── GET /health
├── 2. Create Logs
│   ├── 2.1 Create REQUEST Log (Success)
│   ├── 2.2 Create RESPONSE Log
│   ├── 2.3 Validation: Missing Field
│   ├── 2.4 Validation: Invalid Environment
│   ├── 2.5 Validation: Invalid Timestamp
│   └── 2.6 Create Error Log
├── 3. Get Single Log
│   ├── 3.1 Get Existing Log
│   ├── 3.2 Validation: Invalid ID Format
│   └── 3.3 Not Found (404)
├── 4. Get Request+Response Pair
│   ├── 4.1 Get Existing Pair
│   └── 4.2 Not Found (404)
├── 5. Query Logs
│   ├── 5.1 Query by Service
│   ├── 5.2 Query by Service + EventType
│   ├── 5.3 Query by UserId
│   ├── 5.4 Query by Status Code
│   ├── 5.5 Query by Date Range
│   ├── 5.6 Query Error Logs
│   ├── 5.7 Validation: Invalid Limit
│   ├── 5.8 Validation: Invalid Status Code
│   └── 5.9 Validation: No Filter
├── 6. Verify Chain
│   ├── 6.1 Valid Chain
│   ├── 6.2 Validation: Missing Environment
│   └── 6.3 Validation: Invalid Environment
├── 7. Get Statistics
│   ├── 7.1 Get Stats
│   ├── 7.2 Get Stats with EventType Filter
│   └── 7.3 Validation: Invalid EventType
└── 8. Cleanup
    ├── 8.1 Cleanup Logs
    ├── 8.2 Validation: Days = 0
    └── 8.3 Validation: Missing Days
```

---

## 💡 Tips for Testing

1. **Save Variables**: After creating logs, save IDs in Postman variables
2. **Use Timestamps**: For date range tests, use `new Date().toISOString()`
3. **Test Validation First**: Verify error handling works before success cases
4. **Verify Hashes**: Check that `previousHash` matches previous log's `currentHash`
5. **Check Sanitization**: Passwords/tokens should be redacted in responses
6. **Monitor Queue**: Main server health endpoint shows queue size
7. **Run Sequentially**: Follow the workflow above for consistency

---

## ✅ Success Criteria

- All 29 test cases pass ✅
- Validation errors return 400 with details ✅
- Hash chain links REQUEST → RESPONSE ✅
- Sensitive fields sanitized in responses ✅
- Logs queryable by all filter types ✅
- Chain integrity verification works ✅
- Statistics aggregation correct ✅
- Cleanup operation successful ✅

