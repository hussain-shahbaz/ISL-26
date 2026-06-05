# 👤 User Service

User profile microservice for the **Secure Online Examination System**.  
Handles profile creation, completion, admin management, and inter-service communication.

---

## 🛠 Tech Stack

| Tool | Purpose |
|---|---|
| Node.js + Express | Server |
| MySQL + Prisma | Database |
| Zod | Validation |
| JWT | Token verification |

---

## 📁 Folder Structure

```
user-service/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/         # DB config
│   ├── schemas/        # Zod validation
│   ├── controllers/    # Request/response handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Prisma queries
│   ├── routes/         # Express routes
│   ├── middlewares/    # authenticate, authorizeRoles, internalOnly
│   └── utils/          # format.js helpers
├── .env
└── server.js
```

---

## ⚙️ Environment Variables

```env
PORT=3001
DATABASE_URL=mysql://root:password@localhost:3306/user_service_db
JWT_SECRET=your_jwt_secret
INTERNAL_SECRET=your_internal_secret
```

---

## 🗄 Database Schema

### UserProfile
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key — shared across all services |
| name | String | Full name |
| email | String | Unique email |
| role | Enum | STUDENT, INSTRUCTOR, ADMIN |
| university | String? | STUDENT + ADMIN only |
| avatarUrl | String? | Profile picture URL |
| bio | String? | Short bio |
| isProfileComplete | Boolean | Gates exam access |
| approvalStatus | Enum | PENDING, APPROVED, REJECTED |
| approvedAt | DateTime? | When admin approved |
| approvedBy | String? | Admin userId who approved |
| isDeleted | Boolean | Soft delete flag |
| deletedAt | DateTime? | When soft deleted |

### UserIdentifier
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| identifier | String | rollNo (STUDENT) / employeeId (INSTRUCTOR) |
| department | String? | Department name |
| degreeProgram | String? | STUDENT only |
| batch | Int? | STUDENT only |
| profileId | String | FK → UserProfile.id |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run migrations
npx prisma migrate dev

# Run in development
npm run dev
```

---

## 👤 Default Admin Account

Admin is manually inserted into MySQL — cannot self-register.

```sql
INSERT INTO UserProfile (
  id, name, email, role, university,
  isProfileComplete, approvalStatus,
  approvedAt, isDeleted, createdAt, updatedAt
) VALUES (
  '7c426e12-5b70-445d-b007-87be55ea1ab2',
  'Super Admin', 'admin@uet.edu.pk',
  'ADMIN', 'UET', 1, 'APPROVED',
  NOW(), 0, NOW(), NOW()
);
```

> Same UUID must be used in auth-service MongoDB record.

---

## 📮 API Endpoints

### Internal Routes (auth-service only)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/internal/register` | Create profile after email verification |
| DELETE | `/internal/users/:userId` | Rollback profile if auth fails |

### Profile Routes (any logged-in user)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Get own profile |
| PATCH | `/api/users/profile/complete` | Complete profile |

### Admin Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/students` | All students (paginated) |
| GET | `/api/users/instructors` | All instructors (paginated) |
| GET | `/api/users/pending` | Pending instructor requests |
| PATCH | `/api/users/:userId/approval` | Approve or reject instructor |

---

## 🔄 Profile Completion Flow

```
Registration:
  UserProfile created
  isProfileComplete = false
  UserIdentifier = NOT created

Complete Profile:
  STUDENT sends → university, rollNo, batch, department
  INSTRUCTOR sends → employeeId, department
  ADMIN sends → university

  UserIdentifier created ✅
  isProfileComplete = true ✅
```

---

## ✅ Approval Logic

| Role | Default Status | Who Approves |
|---|---|---|
| STUDENT | APPROVED | Auto approved |
| INSTRUCTOR | PENDING | Admin approves |
| ADMIN | PENDING | Manually inserted as approved |

---

## 🧪 Postman Test Cases

### Internal Routes

#### 1. Create Profile — Student ✅
```
POST /internal/register
Headers: x-internal-secret: your_internal_secret

{
  "userId": "uuid-here",
  "name": "Ali Hassan",
  "email": "ali@uet.edu.pk",
  "role": "STUDENT"
}
Expected: 201 — { userId }
```

#### 2. Create Profile — Instructor ✅
```
POST /internal/register
Headers: x-internal-secret: your_internal_secret

{
  "userId": "uuid-here",
  "name": "Dr. Ahmed Raza",
  "email": "ahmed@uet.edu.pk",
  "role": "INSTRUCTOR"
}
Expected: 201 — { userId }
```

#### 3. Create Profile — Duplicate email ❌
```
POST /internal/register
{ "email": "ali@uet.edu.pk", ... }
Expected: 409 — Email already exists
```

#### 4. Wrong internal secret ❌
```
POST /internal/register
Headers: x-internal-secret: wrongsecret
Expected: 403 — Forbidden
```

---

### Profile Routes

#### 5. Complete Profile — Student ✅
```
PATCH /api/users/profile/complete
Authorization: Bearer student_jwt

{
  "university": "UET",
  "rollNo": "2021-CS-101",
  "batch": 2021,
  "department": "Computer Science",
  "degreeProgram": "BS Computer Science"
}
Expected: 200 — isProfileComplete: true
```

#### 6. Complete Profile — Instructor ✅
```
PATCH /api/users/profile/complete
Authorization: Bearer instructor_jwt

{
  "employeeId": "EMP-2023-045",
  "department": "Computer Science"
}
Expected: 200 — isProfileComplete: true, approvalStatus: PENDING
```

#### 7. Complete Profile — Already complete ❌
```
PATCH /api/users/profile/complete
(call twice)
Expected: 400 — Profile is already complete
```

#### 8. Complete Profile — Duplicate rollNo ❌
```
Two students same rollNo
Expected: 409 — Roll number or employee ID already exists
```

#### 9. Get Own Profile ✅
```
GET /api/users/profile
Authorization: Bearer any_jwt
Expected: 200 — full profile data
```

#### 10. Get Profile — No token ❌
```
GET /api/users/profile
Expected: 401 — Unauthorized
```

---

### Admin Routes

#### 11. Get All Students ✅
```
GET /api/users/students?page=1&limit=10
Authorization: Bearer admin_jwt
Expected: 200 — paginated students list
```

#### 12. Get All Students — Search ✅
```
GET /api/users/students?page=1&limit=10&search=ali
Authorization: Bearer admin_jwt
Expected: 200 — filtered students
```

#### 13. Get All Instructors ✅
```
GET /api/users/instructors?page=1&limit=10
Authorization: Bearer admin_jwt
Expected: 200 — paginated instructors list
```

#### 14. Get Pending Requests ✅
```
GET /api/users/pending?page=1&limit=10
Authorization: Bearer admin_jwt
Expected: 200 — pending instructors only
```

#### 15. Approve Instructor ✅
```
PATCH /api/users/:userId/approval
Authorization: Bearer admin_jwt

{ "status": "APPROVED" }
Expected: 200 — approvalStatus: APPROVED
```

#### 16. Reject Instructor ✅
```
PATCH /api/users/:userId/approval
Authorization: Bearer admin_jwt

{ "status": "REJECTED" }
Expected: 200 — approvalStatus: REJECTED
```

#### 17. Approve Student ❌
```
PATCH /api/users/:studentId/approval
{ "status": "APPROVED" }
Expected: 400 — Students don't need approval
```

#### 18. Approve already approved ❌
```
PATCH /api/users/:userId/approval (already APPROVED)
Expected: 400 — User is not in pending status
```

#### 19. Admin access with student JWT ❌
```
GET /api/users/students
Authorization: Bearer student_jwt
Expected: 403 — Forbidden
```

#### 20. Pagination ✅
```
GET /api/users/students?page=2&limit=5
Expected: 200 — page 2, 5 results, pagination meta
```

---

## 🔗 Inter-Service Communication

### Called by auth-service:
```
POST /internal/register
Headers: x-internal-secret: secret
Body: { userId, name, email, role }
Returns: { success: true, userId }
```

### Called by exam-service (future):
```
GET /internal/users/:userId
POST /internal/users/batch
```

---

## 🛡 Security

- Internal routes protected by shared secret header
- Public routes protected by JWT verification
- Role-based access control on all admin routes
- Admin scoped to their university only
- Soft delete — data never permanently lost
