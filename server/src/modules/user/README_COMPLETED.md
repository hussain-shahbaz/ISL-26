# User Module - Secure Online Exam Management System

## Overview
This is a complete user management module for the Secure Online Exam Management System. It handles user CRUD operations, approval workflows, and user identifiers for students and instructors.

## Architecture
- **Pattern**: MVC (Model-View-Controller) with Service-Repository pattern
- **Database**: PostgreSQL with Prisma ORM
- **Framework**: Express.js
- **Node.js Version**: 18+ recommended

## Database Schema

### User Model
```
- id (UUID): Primary key
- name (String, max 100): User's full name
- email (String, unique, max 100): User's email address
- _hash_password (String, max 255): Hashed password from auth module
- role (Enum): ADMIN, STUDENT, INSTRUCTOR, SUPERADMIN
- university (String, max 50): Default: "UET"
- approvalStatus (Enum): PENDING, APPROVED, REJECTED (Default: APPROVED for STUDENT)
- approvedAt (DateTime): Timestamp when user was approved
- approvedBy (String): ID of admin/superadmin who approved
- isDeleted (Boolean): Soft delete flag
- createdAt (DateTime): Creation timestamp
- updatedAt (DateTime): Last update timestamp
- identifier (UserIdentifier): One-to-one relationship
```

### UserIdentifier Model
```
- id (UUID): Primary key
- identifier (String, unique, max 50): Registration/Roll number
- department (String, max 100): Department name
- degreeProgram (String, optional, max 100): Degree program
- batch (Int, optional): Batch year
- userId (String, unique): Foreign key to User
```

### Role Types
1. **STUDENT**: Default role, direct signup allowed
2. **INSTRUCTOR**: Needs ADMIN approval
3. **ADMIN**: Needs SUPERADMIN approval
4. **SUPERADMIN**: System administrator

## API Endpoints

### User CRUD Operations

#### 1. Create User
```
POST /api/v1/user/create
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "_hash_password": "hashed_password_from_auth_module",
  "role": "STUDENT",
  "university": "UET"
}

Response (201):
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "university": "UET",
    "approvalStatus": "APPROVED",
    "isDeleted": false,
    "createdAt": "2025-05-17T...",
    "updatedAt": "2025-05-17T...",
    "identifier": null
  }
}
```

#### 2. Get User by ID
```
GET /api/v1/user/get/:id

Response (200):
{
  "success": true,
  "message": "User fetched successfully",
  "data": { ... }
}
```

#### 3. Get All Users (with filters)
```
GET /api/v1/user/get-users?role=STUDENT&university=UET

Query Parameters:
- role: Filter by role (STUDENT, INSTRUCTOR, ADMIN, SUPERADMIN)
- university: Filter by university

Response (200):
{
  "success": true,
  "message": "Users fetched successfully",
  "count": 5,
  "data": [ ... ]
}
```

#### 4. Update User
```
PUT /api/v1/user/update/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "_hash_password": "new_hashed_password",
  "role": "INSTRUCTOR",
  "university": "UET"
}

Response (200):
{
  "success": true,
  "message": "User updated successfully",
  "data": { ... }
}
```

#### 5. Delete User (Soft Delete)
```
DELETE /api/v1/user/delete/:id

Response (200):
{
  "success": true,
  "message": "User deleted successfully",
  "data": { ... }
}
```

#### 6. Restore User
```
POST /api/v1/user/restore/:id

Response (200):
{
  "success": true,
  "message": "User restored successfully",
  "data": { ... }
}
```

### User Identifier Operations

#### 1. Create User Identifier
```
POST /api/v1/user/:id/identifier
Content-Type: application/json

{
  "identifier": "2021-001",
  "department": "Computer Science",
  "degreeProgram": "BS Software Engineering",
  "batch": 2021
}

Response (201):
{
  "success": true,
  "message": "User identifier created successfully",
  "data": { ... }
}
```

#### 2. Get User Identifier
```
GET /api/v1/user/:id/identifier

Response (200):
{
  "success": true,
  "message": "User identifier fetched successfully",
  "data": { ... }
}
```

#### 3. Update User Identifier
```
PUT /api/v1/user/:id/identifier
Content-Type: application/json

{
  "identifier": "2021-002",
  "department": "Computer Science",
  "degreeProgram": "BS Software Engineering",
  "batch": 2021
}

Response (200):
{
  "success": true,
  "message": "User identifier updated successfully",
  "data": { ... }
}
```

### Approval Workflow

#### 1. Get Pending Approvals (for ADMIN)
```
GET /api/v1/user/approvals/pending?university=UET

Query Parameters:
- university: Required - Filter by university

Response (200):
{
  "success": true,
  "message": "Pending approvals fetched successfully",
  "count": 3,
  "data": [ ... ]
}
```

#### 2. Approve User Registration
```
POST /api/v1/user/approve/:id
Content-Type: application/json

{
  "approverId": "admin-user-id",
  "approverRole": "ADMIN",
  "approverUniversity": "UET"
}

Rules:
- ADMIN can only approve INSTRUCTOR from their university
- SUPERADMIN can approve ADMIN or INSTRUCTOR from any university

Response (200):
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "approvalStatus": "APPROVED",
    "approvedAt": "2025-05-17T...",
    "approvedBy": "admin-user-id",
    ...
  }
}
```

#### 3. Reject User Registration
```
POST /api/v1/user/reject/:id
Content-Type: application/json

{
  "approverId": "admin-user-id",
  "approverRole": "ADMIN",
  "approverUniversity": "UET"
}

Rules:
- ADMIN can only reject INSTRUCTOR from their university
- SUPERADMIN can reject ADMIN or INSTRUCTOR from any university

Response (200):
{
  "success": true,
  "message": "User rejected successfully",
  "data": {
    "approvalStatus": "REJECTED",
    "approvedAt": "2025-05-17T...",
    "approvedBy": "admin-user-id",
    ...
  }
}
```

#### 4. Get Users by Approval Status
```
GET /api/v1/user/approvals/:status?role=INSTRUCTOR&university=UET

Path Parameters:
- status: PENDING, APPROVED, or REJECTED

Query Parameters:
- role: Filter by role (optional)
- university: Filter by university (optional)

Response (200):
{
  "success": true,
  "message": "Users with PENDING approval status fetched successfully",
  "count": 5,
  "data": [ ... ]
}
```

### Statistics

#### Get User Statistics
```
GET /api/v1/user/statistics

Response (200):
{
  "success": true,
  "message": "User statistics fetched successfully",
  "data": {
    "adminCount": 5,
    "studentCount": 100,
    "instructorCount": 20,
    "totalCount": 125
  }
}
```

## Key Features

### 1. University Isolation
- ADMIN users can only manage users from their own university
- Queries automatically filtered by university for ADMIN context
- Default university: "UET"

### 2. Approval Workflow
- **STUDENT**: Auto-approved on creation (approvalStatus = APPROVED)
- **INSTRUCTOR**: Requires ADMIN approval from same university
- **ADMIN**: Requires SUPERADMIN approval
- **SUPERADMIN**: Created directly by system (no approval needed)

### 3. Soft Deletion
- Users marked as deleted with `isDeleted` flag
- Can be restored at any time
- All queries exclude deleted users by default

### 4. Password Security
- Only `_hash_password` field stored (not plaintext)
- Password hashing handled by Auth Module
- This module accepts pre-hashed passwords

### 5. User Identifiers
- Optional additional information for STUDENT and INSTRUCTOR only
- Stores: identifier (roll/reg number), department, degree, batch year
- One-to-one relationship with User

## Validation Rules

### User Creation
- Name: Required, max 100 characters
- Email: Required, valid format, unique, max 100 characters
- _hash_password: Required, max 255 characters
- Role: Optional, must be ADMIN, STUDENT, INSTRUCTOR, or SUPERADMIN
- University: Optional, defaults to "UET", max 50 characters

### User Update
- All fields optional
- Same validation rules apply to non-null fields

### User Identifier
- identifier: Required, unique, max 50 characters
- department: Required, max 100 characters
- degreeProgram: Optional, max 100 characters
- batch: Optional, must be positive number

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP Status Codes:
- 201: Resource created
- 200: Success
- 400: Bad request / Validation failed
- 404: Resource not found
- 500: Server error

## Integration Points

### Dependencies
- **@prisma/client**: ^7.8.0 - Database client
- **@prisma/adapter-pg**: ^7.8.0 - PostgreSQL adapter
- **express**: ^5.2.1 - Web framework
- **cors**: ^2.8.6 - Cross-origin resource sharing

### Packages to Install Manually
```bash
npm install bcrypt  # For password hashing if needed locally
```

### Related Modules
- **Auth Module**: Handles login, registration, password hashing, JWT generation
- **Exam Module**: Creates exams, manages exam participation, checks eligible students
- **Course Module**: Manages courses and their instructors

## Database Migration

To apply the schema changes:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or manually execute migration.sql on your database
```

## File Structure

```
user-module/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── [migration files]
├── user-controller.js
├── user-service.js
├── user-validator.js
├── user-repository.js
├── user-route.js
├── db.js
├── app.js
├── server.js
└── package.json
```

## Testing Workflow

### 1. Create a Student (Auto-approved)
```bash
POST /api/v1/user/create
{
  "name": "Alice",
  "email": "alice@example.com",
  "_hash_password": "hashed_pwd_123",
  "role": "STUDENT"
}
# Returns approvalStatus: APPROVED
```

### 2. Create an Instructor (Pending approval)
```bash
POST /api/v1/user/create
{
  "name": "Bob",
  "email": "bob@example.com",
  "_hash_password": "hashed_pwd_456",
  "role": "INSTRUCTOR",
  "university": "UET"
}
# Returns approvalStatus: PENDING
```

### 3. Admin views pending approvals
```bash
GET /api/v1/user/approvals/pending?university=UET
```

### 4. Admin approves instructor
```bash
POST /api/v1/user/approve/:instructorId
{
  "approverId": "admin-uuid",
  "approverRole": "ADMIN",
  "approverUniversity": "UET"
}
```

## Notes

- All timestamps are in ISO 8601 format
- UUIDs used for all ID fields
- Email addresses are case-insensitive (stored as provided)
- Soft deletion preserves data integrity
- Approval audit trail (approvedBy, approvedAt) maintained

## Future Enhancements

- Bulk user import from CSV
- User deactivation (different from deletion)
- Role-based access control (RBAC) middleware
- Audit logging for all operations
- Batch operations (bulk approval, bulk deletion)

