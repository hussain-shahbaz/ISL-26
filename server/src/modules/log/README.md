# Log Microservice - Testing Guide

**Port**: 3001  
**Base URL**: `http://localhost:3001`

---

## Quick Start

```bash
# Install dependencies
npm install
npm install express-validator

# Set environment variables
# Create .env file with:
# LOG_SERVICE_PORT=3001
# MONGODB_URI=mongodb://localhost:27017/logs
# NODE_ENV=development
# LOG_LEVEL=debug

# Start service
node src/modules/log/app.js
```

---

## Request Validation

All requests are validated using **express-validator** before reaching the controller.

**Validation checks**:
- Required fields present
- Correct data types (string, object, boolean, etc.)
- Valid formats (ISO8601 dates, MongoDB IDs)
- Valid values (enums, ranges)
- Numeric ranges (limit 1-1000, statusCode 100-599)

**Invalid request response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "service",
      "message": "Service is required"
    },
    {
      "field": "environment",
      "message": "Invalid environment"
    }
  ],
  "statusCode": 400
}
```

---

## API Routes

### 1. Health Check
**Endpoint**: `GET /health`  
**Purpose**: Verify service is running  
**Status Code**: 200

**Postman**:
```
GET http://localhost:3001/health
```

**Response**:
```json
{
  "success": true,
  "message": "Log microservice is healthy",
  "timestamp": "2026-05-17T10:30:00.000Z"
}
```

---

### 2. Create Log
**Endpoint**: `POST /logs`  
**Purpose**: Create new REQUEST or RESPONSE log  
**Status Code**: 201 (success) | 400 (validation error) | 500 (error)

**Validation Rules**:
- `service`: Required, string
- `environment`: Required, must be: development | staging | production
- `eventType`: Required, must be: REQUEST | RESPONSE
- `requestId`: Required, string
- `timestamp`: Required, ISO8601 date format
- `request`: Optional, object
- `response`: Optional, object
- `error`: Optional, object
- `userId`: Optional, string

**Postman**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body (REQUEST):
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "REQUEST",
  "requestId": "req-12345",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00Z",
  "request": {
    "method": "POST",
    "path": "/api/auth/login",
    "headers": {
      "authorization": "Bearer token123",
      "content-type": "application/json"
    },
    "body": {
      "email": "user@example.com",
      "password": "secret123"
    }
  }
}

Body (RESPONSE):
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "RESPONSE",
  "requestId": "req-12345",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00.045Z",
  "response": {
    "statusCode": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "success": true,
      "token": "jwt_token_xyz"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "environment": "production",
    "eventType": "REQUEST",
    "requestId": "req-12345",
    "userId": "user-001",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "request": { /* sanitized */ },
    "previousHash": "abc123...",
    "currentHash": "def456...",
    "createdAt": "2026-05-17T10:30:00.000Z"
  },
  "statusCode": 201
}
```

**Sensitive Fields Sanitized**:
- `password`, `passwd` → redacted
- `token`, `apikey` → redacted
- `authorization` header → redacted
- `x-api-key` header → redacted
- Recursive through nested objects

---

### 3. Get Single Log
**Endpoint**: `GET /logs/logs/:id`  
**Purpose**: Retrieve a specific log by ID  
**Status Code**: 200 (success) | 400 (invalid ID) | 404 (not found) | 500 (error)

**Validation Rules**:
- `id`: Required, valid MongoDB ObjectId

**Postman**:
```
GET http://localhost:3001/logs/logs/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "eventType": "REQUEST",
    "requestId": "req-12345",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "previousHash": "abc123...",
    "currentHash": "def456...",
    "request": { /* sanitized data */ }
  },
  "statusCode": 200
}
```

---

### 4. Get REQUEST + RESPONSE Pair
**Endpoint**: `GET /logs/pair/:requestId`  
**Purpose**: Get both REQUEST and RESPONSE logs by requestId  
**Status Code**: 200 (success) | 400 (validation error) | 404 (not found) | 500 (error)

**Validation Rules**:
- `requestId`: Required, string

**Postman**:
```
GET http://localhost:3001/logs/pair/req-12345
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "eventType": "REQUEST",
      "requestId": "req-12345",
      "timestamp": "2026-05-17T10:30:00.000Z",
      "currentHash": "hash1..."
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "eventType": "RESPONSE",
      "requestId": "req-12345",
      "timestamp": "2026-05-17T10:30:00.045Z",
      "previousHash": "hash1...",
      "currentHash": "hash2..."
    }
  ],
  "total": 2,
  "statusCode": 200
}
```

---

### 5. Query Logs (Smart Router)
**Endpoint**: `GET /logs/query`  
**Purpose**: Query logs with various filters  
**Status Code**: 200 (success) | 400 (invalid filter/validation error) | 500 (error)

**Validation Rules**:
- `service`: Optional, string
- `eventType`: Optional, must be: REQUEST | RESPONSE
- `userId`: Optional, string
- `statusCode`: Optional, integer 100-599
- `startTime`: Optional, ISO8601 date
- `endTime`: Optional, ISO8601 date
- `errorOnly`: Optional, boolean
- `limit`: Optional, integer 1-1000 (default: 50)
- `skip`: Optional, integer >= 0 (default: 0)

**Filter Combinations**:

#### a) By Service + Event Type
```
GET http://localhost:3001/logs/query?service=auth-service&eventType=REQUEST&limit=10&skip=0
```

#### b) By Service Only
```
GET http://localhost:3001/logs/query?service=auth-service&limit=20
```

#### c) By User ID (Audit Trail)
```
GET http://localhost:3001/logs/query?userId=user-001&limit=50
```

#### d) By HTTP Status Code
```
GET http://localhost:3001/logs/query?statusCode=500&limit=10
```

#### e) By Date Range
```
GET http://localhost:3001/logs/query?startTime=2026-05-17T10:00:00Z&endTime=2026-05-17T11:00:00Z&limit=100
```

#### f) Error Logs Only
```
GET http://localhost:3001/logs/query?errorOnly=true&limit=50
```

**Response** (all queries return same structure):
```json
{
  "success": true,
  "data": [
    { /* log 1 */ },
    { /* log 2 */ },
    { /* log 3 */ }
  ],
  "total": 1247,
  "statusCode": 200
}
```

---

### 6. Verify Hash Chain Integrity
**Endpoint**: `POST /logs/verify-chain`  
**Purpose**: Detect if hash chain is broken (tampering detection)  
**Status Code**: 200 (always returns 200, check `isValid` field)  | 400 (validation error) | 500 (error)

**Validation Rules**:
- `service`: Required, string
- `environment`: Required, must be: development | staging | production

**Postman**:
```
POST http://localhost:3001/logs/verify-chain
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production"
}
```

**Response (Chain Valid)**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "Hash chain is valid and unbroken",
    "totalLogs": 145
  },
  "statusCode": 200
}
```

**Response (Chain Broken)**:
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "message": "Chain broken at log index 45",
    "brokenAt": {
      "previousLogId": "507f1f77bcf86cd799439045",
      "currentLogId": "507f1f77bcf86cd799439046",
      "expectedHash": "abc123...",
      "receivedHash": "xyz789..."
    },
    "totalLogs": 145
  },
  "statusCode": 200
}
```

---

### 7. Get Statistics
**Endpoint**: `GET /logs/stats/:service`  
**Purpose**: Get aggregated statistics for a service  
**Status Code**: 200 (success) | 400 (validation error) | 500 (error)

**Validation Rules**:
- `service`: Required, string
- `eventType`: Optional, must be: REQUEST | RESPONSE

**Postman**:
```
GET http://localhost:3001/logs/stats/auth-service
GET http://localhost:3001/logs/stats/auth-service?eventType=REQUEST
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalLogs": 5000,
    "requestCount": 2500,
    "responseCount": 2500,
    "errorCount": 125,
    "avgResponseTime": 145.23
  },
  "statusCode": 200
}
```

---

### 8. Cleanup Old Logs
**Endpoint**: `POST /logs/cleanup`  
**Purpose**: Delete logs older than N days  
**Status Code**: 200 (success) | 400 (validation error) | 500 (error)

**Validation Rules**:
- `days`: Required, integer >= 1

**Postman**:
```
POST http://localhost:3001/logs/cleanup
Content-Type: application/json

Body:
{
  "days": 90
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 3245,
    "message": "Deleted logs older than 90 days"
  },
  "statusCode": 200
}
```

---

## Error Responses

### Validation Error (400)
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

### Not Found (404)
```json
{
  "success": false,
  "error": "Log not found",
  "statusCode": 404
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "statusCode": 500
}
```

**Common Status Codes**:
- `200`: Success
- `201`: Created (log creation)
- `400`: Bad request (validation error)
- `404`: Not found (resource not found)
- `500`: Server error

---

## Postman Collection Template

```json
{
  "info": {
    "name": "Log Microservice",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/health"
      }
    },
    {
      "name": "Create Log (REQUEST)",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "http://localhost:3001/logs",
        "body": {
          "mode": "raw",
          "raw": "{ /* see Create Log section */ }"
        }
      }
    }
  ]
}
```

---

## Testing Workflow

1. **Start Service**
   ```bash
   node src/modules/log/app.js
   ```

2. **Check Health**
   ```
   GET http://localhost:3001/health
   ```

3. **Create REQUEST Log**
   ```
   POST http://localhost:3001/logs
   Body: REQUEST object with all required fields
   ```

4. **Create RESPONSE Log** (same requestId)
   ```
   POST http://localhost:3001/logs
   Body: RESPONSE object with all required fields
   ```

5. **Get REQUEST + RESPONSE Pair**
   ```
   GET http://localhost:3001/logs/pair/req-12345
   ```
   Should return 2 logs with `previousHash` linking them

6. **Verify Chain Integrity**
   ```
   POST http://localhost:3001/logs/verify-chain
   Body: {"service": "auth-service", "environment": "production"}
   ```
   Should return `isValid: true`

7. **Query with Filters**
   ```
   GET http://localhost:3001/logs/query?service=auth-service&eventType=REQUEST
   ```

8. **Get Statistics**
   ```
   GET http://localhost:3001/logs/stats/auth-service
   ```

---

## Key Features

✅ **Input Validation**: All requests validated with express-validator  
✅ **Hash Chain Integrity**: Detects any tampering with previous logs  
✅ **Separate Documents**: REQUEST and RESPONSE are independent logs  
✅ **Automatic Sanitization**: Removes passwords, tokens, API keys, etc.  
✅ **Pagination**: All queries support limit/skip  
✅ **Multiple Filters**: Service, eventType, userId, statusCode, dateRange, errors  
✅ **Statistics**: Aggregated counts and averages in single query  
✅ **Cleanup**: TTL-like retention policy  
✅ **Non-blocking**: Fire-and-forget logging pattern (ready for queue integration)

---

## MongoDB Schema

**Collection**: `logs`

**Fields**:
- `_id`: MongoDB ObjectId
- `service`: Service name
- `environment`: dev/staging/production
- `eventType`: REQUEST or RESPONSE
- `requestId`: Links REQUEST + RESPONSE pair
- `userId`: User who made request
- `timestamp`: When event occurred
- `request`/`response`: Captured data (sanitized)
- `error`: Error details if any
- `previousHash`: Hash from previous log (chain link)
- `currentHash`: This log's hash
- `createdAt`: When log was created

**Indexes**: 6 compound indexes for fast queries

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `express-validator not found` | Run: `npm install express-validator` |
| `ECONNREFUSED` | MongoDB not running. Start: `mongod` |
| `Port 3001 in use` | Kill process or change `LOG_SERVICE_PORT` env var |
| `Sanitization not working` | Check `config/config.js` SENSITIVE_FIELD_PATTERNS |
| `Chain broken` | Someone modified a previous log document directly |
| `No logs found` | Create REQUEST + RESPONSE logs first |
| `Validation error` | Check error details for which field failed validation |



---

## API Routes

### 1. Health Check
**Endpoint**: `GET /health`  
**Purpose**: Verify service is running  
**Status Code**: 200

**Postman**:
```
GET http://localhost:3001/health
```

**Response**:
```json
{
  "success": true,
  "message": "Log microservice is healthy",
  "timestamp": "2026-05-17T10:30:00.000Z"
}
```

---

### 2. Create Log
**Endpoint**: `POST /logs`  
**Purpose**: Create new REQUEST or RESPONSE log  
**Status Code**: 201 (success) | 500 (error)

**Postman**:
```
POST http://localhost:3001/logs
Content-Type: application/json

Body (REQUEST):
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "REQUEST",
  "requestId": "req-12345",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00Z",
  "request": {
    "method": "POST",
    "path": "/api/auth/login",
    "headers": {
      "authorization": "Bearer token123",
      "content-type": "application/json"
    },
    "body": {
      "email": "user@example.com",
      "password": "secret123"
    }
  }
}

Body (RESPONSE):
{
  "service": "auth-service",
  "environment": "production",
  "eventType": "RESPONSE",
  "requestId": "req-12345",
  "userId": "user-001",
  "timestamp": "2026-05-17T10:30:00.045Z",
  "response": {
    "statusCode": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "success": true,
      "token": "jwt_token_xyz"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "environment": "production",
    "eventType": "REQUEST",
    "requestId": "req-12345",
    "userId": "user-001",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "request": { /* sanitized */ },
    "previousHash": "abc123...",
    "currentHash": "def456...",
    "createdAt": "2026-05-17T10:30:00.000Z"
  },
  "statusCode": 201
}
```

**Sensitive Fields Sanitized**:
- `password`, `passwd` → redacted
- `token`, `apikey` → redacted
- `authorization` header → redacted
- `x-api-key` header → redacted
- Recursive through nested objects

---

### 3. Get Single Log
**Endpoint**: `GET /logs/logs/:id`  
**Purpose**: Retrieve a specific log by ID  
**Status Code**: 200 (success) | 404 (not found) | 500 (error)

**Postman**:
```
GET http://localhost:3001/logs/logs/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "service": "auth-service",
    "eventType": "REQUEST",
    "requestId": "req-12345",
    "timestamp": "2026-05-17T10:30:00.000Z",
    "previousHash": "abc123...",
    "currentHash": "def456...",
    "request": { /* sanitized data */ }
  },
  "statusCode": 200
}
```

---

### 4. Get REQUEST + RESPONSE Pair
**Endpoint**: `GET /logs/pair/:requestId`  
**Purpose**: Get both REQUEST and RESPONSE logs by requestId  
**Status Code**: 200 (success) | 404 (not found) | 500 (error)

**Postman**:
```
GET http://localhost:3001/logs/pair/req-12345
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "eventType": "REQUEST",
      "requestId": "req-12345",
      "timestamp": "2026-05-17T10:30:00.000Z",
      "currentHash": "hash1..."
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "eventType": "RESPONSE",
      "requestId": "req-12345",
      "timestamp": "2026-05-17T10:30:00.045Z",
      "previousHash": "hash1...",
      "currentHash": "hash2..."
    }
  ],
  "total": 2,
  "statusCode": 200
}
```

---

### 5. Query Logs (Smart Router)
**Endpoint**: `GET /logs/query`  
**Purpose**: Query logs with various filters  
**Status Code**: 200 (success) | 400 (invalid filter) | 500 (error)

**Query Parameters**:
- `limit`: Max results (default: 50, max: 1000)
- `skip`: Pagination offset (default: 0)

**Filter Combinations**:

#### a) By Service + Event Type
```
GET http://localhost:3001/logs/query?service=auth-service&eventType=REQUEST&limit=10&skip=0
```

#### b) By Service Only
```
GET http://localhost:3001/logs/query?service=auth-service&limit=20
```

#### c) By User ID (Audit Trail)
```
GET http://localhost:3001/logs/query?userId=user-001&limit=50
```

#### d) By HTTP Status Code
```
GET http://localhost:3001/logs/query?statusCode=500&limit=10
```

#### e) By Date Range
```
GET http://localhost:3001/logs/query?startTime=2026-05-17T10:00:00Z&endTime=2026-05-17T11:00:00Z&limit=100
```

#### f) Error Logs Only
```
GET http://localhost:3001/logs/query?errorOnly=true&limit=50
```

**Response** (all queries return same structure):
```json
{
  "success": true,
  "data": [
    { /* log 1 */ },
    { /* log 2 */ },
    { /* log 3 */ }
  ],
  "total": 1247,
  "statusCode": 200
}
```

---

### 6. Verify Hash Chain Integrity
**Endpoint**: `POST /logs/verify-chain`  
**Purpose**: Detect if hash chain is broken (tampering detection)  
**Status Code**: 200 (always returns 200, check `isValid` field)  | 500 (error)

**Postman**:
```
POST http://localhost:3001/logs/verify-chain
Content-Type: application/json

Body:
{
  "service": "auth-service",
  "environment": "production"
}
```

**Response (Chain Valid)**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "Hash chain is valid and unbroken",
    "totalLogs": 145
  },
  "statusCode": 200
}
```

**Response (Chain Broken)**:
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "message": "Chain broken at log index 45",
    "brokenAt": {
      "previousLogId": "507f1f77bcf86cd799439045",
      "currentLogId": "507f1f77bcf86cd799439046",
      "expectedHash": "abc123...",
      "receivedHash": "xyz789..."
    },
    "totalLogs": 145
  },
  "statusCode": 200
}
```

---

### 7. Get Statistics
**Endpoint**: `GET /logs/stats/:service`  
**Purpose**: Get aggregated statistics for a service  
**Status Code**: 200 (success) | 500 (error)

**Query Parameters**:
- `eventType`: Optional filter (REQUEST or RESPONSE)

**Postman**:
```
GET http://localhost:3001/logs/stats/auth-service
GET http://localhost:3001/logs/stats/auth-service?eventType=REQUEST
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalLogs": 5000,
    "requestCount": 2500,
    "responseCount": 2500,
    "errorCount": 125,
    "avgResponseTime": 145.23
  },
  "statusCode": 200
}
```

---

### 8. Cleanup Old Logs
**Endpoint**: `POST /logs/cleanup`  
**Purpose**: Delete logs older than N days  
**Status Code**: 200 (success) | 400 (invalid input) | 500 (error)

**Postman**:
```
POST http://localhost:3001/logs/cleanup
Content-Type: application/json

Body:
{
  "days": 90
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 3245,
    "message": "Deleted logs older than 90 days"
  },
  "statusCode": 200
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400/404/500
}
```

**Common Status Codes**:
- `200`: Success
- `201`: Created (log creation)
- `400`: Bad request (invalid parameters)
- `404`: Not found (resource not found)
- `500`: Server error

---

## Postman Collection Template

```json
{
  "info": {
    "name": "Log Microservice",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/health"
      }
    },
    {
      "name": "Create Log (REQUEST)",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "http://localhost:3001/logs",
        "body": {
          "mode": "raw",
          "raw": "{ /* see Create Log section */ }"
        }
      }
    }
  ]
}
```

---

## Testing Workflow

1. **Start Service**
   ```bash
   node src/modules/log/app.js
   ```

2. **Check Health**
   ```
   GET http://localhost:3001/health
   ```

3. **Create REQUEST Log**
   ```
   POST http://localhost:3001/logs
   Body: REQUEST object
   ```

4. **Create RESPONSE Log** (same requestId)
   ```
   POST http://localhost:3001/logs
   Body: RESPONSE object
   ```

5. **Get REQUEST + RESPONSE Pair**
   ```
   GET http://localhost:3001/logs/pair/req-12345
   ```
   Should return 2 logs with `previousHash` linking them

6. **Verify Chain Integrity**
   ```
   POST http://localhost:3001/logs/verify-chain
   Body: {"service": "auth-service", "environment": "production"}
   ```
   Should return `isValid: true`

7. **Query with Filters**
   ```
   GET http://localhost:3001/logs/query?service=auth-service&eventType=REQUEST
   ```

8. **Get Statistics**
   ```
   GET http://localhost:3001/logs/stats/auth-service
   ```

---

## Key Features

✅ **Hash Chain Integrity**: Detects any tampering with previous logs  
✅ **Separate Documents**: REQUEST and RESPONSE are independent logs  
✅ **Automatic Sanitization**: Removes passwords, tokens, API keys, etc.  
✅ **Pagination**: All queries support limit/skip  
✅ **Multiple Filters**: Service, eventType, userId, statusCode, dateRange, errors  
✅ **Statistics**: Aggregated counts and averages in single query  
✅ **Cleanup**: TTL-like retention policy  
✅ **Non-blocking**: Fire-and-forget logging pattern (ready for queue integration)

---

## MongoDB Schema

**Collection**: `logs`

**Fields**:
- `_id`: MongoDB ObjectId
- `service`: Service name
- `environment`: dev/staging/production
- `eventType`: REQUEST or RESPONSE
- `requestId`: Links REQUEST + RESPONSE pair
- `userId`: User who made request
- `timestamp`: When event occurred
- `request`/`response`: Captured data (sanitized)
- `error`: Error details if any
- `previousHash`: Hash from previous log (chain link)
- `currentHash`: This log's hash
- `createdAt`: When log was created

**Indexes**: 6 compound indexes for fast queries

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` | MongoDB not running. Start: `mongod` |
| `Port 3001 in use` | Kill process or change `LOG_SERVICE_PORT` env var |
| `Sanitization not working` | Check `config/config.js` SENSITIVE_FIELD_PATTERNS |
| `Chain broken` | Someone modified a previous log document directly |
| `No logs found` | Create REQUEST + RESPONSE logs first |

