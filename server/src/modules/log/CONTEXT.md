# Log Module Context Documentation

## File Structure
```
log/
├── model/
│   └── log.model.js          # MongoDB schema definition
├── repository/
│   └── log.repository.js      # Data access layer (11 methods)
├── service/
│   └── log.service.js         # Business logic layer (7 methods)
├── controller/
│   └── log.controller.js      # HTTP request handlers
├── routes/
│   └── log.routes.js          # Express route definitions
├── config/
│   ├── config.js              # Centralized configuration
│   └── database.js            # MongoDB connection management
├── utils/
│   ├── constants.js           # App-wide constants
│   ├── sanitizer.js           # Sensitive data removal
│   ├── hash-utils.js          # Hash chain operations
│   └── logger.js              # Module logging
└── CONTEXT.md                 # This file

```

---

## Repository Layer Methods (log.repository.js)

All methods return `{ data, total }` structure and include try-catch with error logging.

### 1. `create(logData)`
- **Purpose**: Insert new log document to MongoDB
- **Triggers**: Model's pre-save hook (calculates hash)
- **Returns**: Saved document with `_id`, `currentHash`, `previousHash`
- **Used by**: Service's `captureLog()`

### 2. `findById(logId)`
- **Purpose**: Get single log by ID
- **Returns**: One log document or null
- **Used by**: Service's `retrieveLog()`

### 3. `findByRequestId(requestId, options)`
- **Purpose**: Find all logs with same requestId (REQUEST + RESPONSE pair)
- **Returns**: Array of logs (usually 2: REQUEST and RESPONSE)
- **Used by**: Service's `getRequestResponsePair()`

### 4. `findByService(service, options)`
- **Purpose**: Get logs from specific service
- **Filters**: Optional `eventType`, `startTime`, `endTime`
- **Pagination**: Respects `limit`, `skip`, `sort`
- **Index Used**: service+eventType+timestamp (compound index)
- **Used by**: Service's `queryLogs()`, `verifyChainIntegrity()`

### 5. `findByUserId(userId, options)`
- **Purpose**: Track user activity (audit trail)
- **Returns**: User's logs with pagination
- **Index Used**: userId+timestamp (compound index)
- **Used by**: Service's `queryLogs()`

### 6. `findByDateRange(startTime, endTime, options)`
- **Purpose**: Get logs within time window
- **Filters**: Optional `service`, `eventType`
- **Returns**: Logs in time range with pagination
- **Index Used**: timestamp+service (compound index)
- **Used by**: Service's `queryLogs()`

### 7. `findByStatusCode(statusCode, options)`
- **Purpose**: Find HTTP response status codes
- **Returns**: Logs with matching statusCode
- **Index Used**: statusCode+timestamp (compound index)
- **Used by**: Service's `queryLogs()` for error analysis

### 8. `findErrorLogs(options)`
- **Purpose**: Get all error logs (status >= 400 OR error field exists)
- **Query**: Uses `$or` operator for two conditions
- **Returns**: Error logs with pagination
- **Used by**: Service's `queryLogs()` when `errorOnly=true`

### 9. `getLastLog(service, environment)`
- **Purpose**: Get most recent log from service
- **Critical for**: Hash chain integrity (get previousHash from this log)
- **Sort**: By timestamp descending (newest first)
- **Returns**: One document or null
- **Used by**: Service's `captureLog()` to link hash chain

### 10. `deleteOlderThan(days)`
- **Purpose**: Cleanup old logs (data retention)
- **Deletes**: All logs with timestamp < (now - days)
- **Returns**: `{ deletedCount }`
- **Used by**: Service's `cleanupOldLogs()`

### 11. `getStats(service, options)`
- **Purpose**: MongoDB aggregation pipeline for statistics
- **Returns**: Statistics object with:
  - `totalLogs`: Total count
  - `requestCount`: COUNT(eventType='REQUEST')
  - `responseCount`: COUNT(eventType='RESPONSE')
  - `errorCount`: COUNT(statusCode >= 400 OR error exists)
  - `avgResponseTime`: Average response time
- **Uses**: `$facet` for multiple aggregations in one query
- **Used by**: Service's `getStatistics()`

---

## Service Layer Methods (log.service.js)

All methods return `{ success, data/error, statusCode }`.

### 1. `captureLog(logData)`
- **Entry Point**: Main method for logging
- **Steps**:
  1. Sanitizes request/response/error objects
  2. Gets previous log via `getLastLog()`
  3. Sets `previousHash = previousLog.currentHash`
  4. Calls `repository.create()` (pre-save hook calculates hash)
- **Returns**: Saved log with success=true or error
- **Status Codes**: 201 (created) or 500 (error)

### 2. `retrieveLog(logId)`
- **Purpose**: Fetch single log
- **Returns**: Log document or 404 error
- **Status Codes**: 200 (success), 404 (not found), 500 (error)

### 3. `getRequestResponsePair(requestId)`
- **Purpose**: Get REQUEST and RESPONSE logs together
- **Returns**: Array of 2 logs with same requestId
- **Status Codes**: 200, 404 (no logs found), 500

### 4. `queryLogs(filters, options)`
- **Smart Router**: Routes to correct repository method based on filter type
- **Supported Filters**:
  - `service` + `eventType`: findByService with eventType filter
  - `service` only: findByService
  - `userId`: findByUserId
  - `statusCode`: findByStatusCode
  - `startTime` + `endTime`: findByDateRange
  - `errorOnly=true`: findErrorLogs
- **Returns**: { data, total, success, statusCode }
- **Status Codes**: 200, 400 (invalid filter), 500

### 5. `verifyChainIntegrity(service, environment)`
- **Purpose**: Detect if hash chain is broken (tampering detection)
- **Steps**:
  1. Gets all logs from service (sorted oldest first)
  2. Walks through logs one by one
  3. Checks: `logs[i].previousHash === logs[i-1].currentHash` ?
  4. If no: Chain is broken, returns details
- **Returns**: 
  ```javascript
  {
    isValid: true/false,
    message: "description",
    totalLogs: count,
    brokenAt: { previousLogId, currentLogId, expectedHash, receivedHash } // if broken
  }
  ```
- **Status Codes**: 200 (always, even if broken), 500 (database error)

### 6. `getStatistics(service, options)`
- **Purpose**: Get aggregated statistics
- **Calls**: `repository.getStats()` 
- **Returns**: Statistics object
- **Status Codes**: 200, 500

### 7. `cleanupOldLogs(days)`
- **Purpose**: Delete logs older than N days
- **Calls**: `repository.deleteOlderThan(days)`
- **Returns**: { deletedCount, message }
- **Status Codes**: 200, 500

---

## Hash Chain Architecture

### How It Works
```
Log 1:  previousHash=null, currentHash="genesis123"
Log 2:  previousHash="genesis123", currentHash=SHA256(genesis123 + log2Data)
Log 3:  previousHash=currentHash2, currentHash=SHA256(currentHash2 + log3Data)
```

### Immutability
- Each log is **immutable** after creation
- Pre-save hook calculates hash
- If anyone modifies Log 2, its hash changes
- Log 3's previousHash won't match Log 2's new hash
- **Chain breaks** → Tampering detected!

### Genesis Hash
- First log in service has `previousHash=null`
- Generated at service startup: `SHA256(serviceName + timestamp)`

---

## Sanitization

Before any log reaches repository, `sanitizer.sanitize()` removes:

**Field Patterns**: password, passwd, token, apikey, ssn, creditcard, cvv, pin, secret, privatekey, etc.

**Headers**: authorization, x-api-key, cookie, x-auth-token, etc.

**Scope**: Recursive traversal up to depth 10

---

## Response Structure

### Success Response
```javascript
{
  success: true,
  data: { /* actual result */ },
  statusCode: 200
}
```

### Error Response
```javascript
{
  success: false,
  error: "Error message",
  statusCode: 500
}
```

---

## Indexes (MongoDB)

| Index | Compound | Columns |
|-------|----------|---------|
| 1 | Yes | service, eventType, timestamp |
| 2 | Yes | userId, timestamp |
| 3 | Yes | timestamp, service |
| 4 | Yes | statusCode, timestamp |
| 5 | No | requestId |
| 6 | No | currentHash |

These enable fast queries on all common filter combinations.

---

## Request/Response Separation

### Why Separate Documents?
- REQUEST arrives first, gets logged
- RESPONSE comes later, but if UPDATE to REQUEST document, hash breaks chain!
- **Solution**: CREATE separate RESPONSE document, never UPDATE REQUEST

### Linking
Both have same `requestId`:
```javascript
REQUEST: { eventType: 'REQUEST', requestId: 'req-123', ... }
RESPONSE: { eventType: 'RESPONSE', requestId: 'req-123', ... }
```

Query by `requestId` returns both together.

---

## Example Flow

```
1. Request arrives at main server
   → Middleware captures: method, path, headers, body
   → Sends to log service: { eventType: 'REQUEST', requestId: 'xyz', ... }
   
2. Service.captureLog() called
   → Sanitizes request data
   → Gets previous log's currentHash
   → Creates REQUEST log with previousHash
   → Pre-save hook calculates currentHash
   → Returns { success, data, statusCode }

3. Response sent by main server
   → Middleware captures: statusCode, headers, responseTime, body
   → Sends to log service: { eventType: 'RESPONSE', requestId: 'xyz', ... }
   
4. Service.captureLog() called again
   → Sanitizes response data
   → Gets previous log (which is REQUEST) currentHash
   → Creates RESPONSE log with previousHash = REQUEST.currentHash
   → Hash chain continues: Genesis → Request1 → Response1 → Request2 → Response2...

5. Later: Verify integrity
   → Service.verifyChainIntegrity('main-server')
   → Walks all logs
   → Checks each previousHash matches previous log's currentHash
   → Returns isValid=true or detects break point
```

---

## Configuration

**See**: `config/config.js` for:
- MongoDB connection settings
- Sanitization patterns
- Query limits (MAX_LIMIT=1000, DEFAULT_LIMIT=50)
- Event types, environments, HTTP methods
- Error codes and messages

