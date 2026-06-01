# 🔐 Auth Service

Authentication microservice for the **Secure Online Examination System**.  
Handles registration, email verification, login, sessions, and password reset.

---

## 🛠 Tech Stack

| Tool | Purpose |
|---|---|
| Node.js + Express | Server |
| MongoDB + Mongoose | Database |
| Redis | OTP + temp registration storage |
| bcrypt | Password hashing |
| JWT | Access tokens |
| Nodemailer + Gmail OAuth2 | Email delivery |
| Zod | Validation |

---

## 📁 Folder Structure

```
auth-service/
├── src/
│   ├── config/         # DB, Redis config
│   ├── controllers/    # Request/response handlers
│   ├── services/       # Business logic
│   ├── repositories/   # MongoDB queries
│   ├── routes/         # Express routes
│   ├── middlewares/    # JWT auth, role guard
│   ├── http/           # Inter-service HTTP calls
│   │   └── userService.http.js
│   └── utils/          # Hash, OTP, JWT helpers
├── .env
└── server.js
```

---

## ⚙️ Environment Variables

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/auth-service-db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
INTERNAL_SECRET=your_internal_secret
USER_SERVICE_URL=http://localhost:3000
GMAIL_USER=your@gmail.com
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start
```

---

## 👤 Default Admin Account

Admin cannot self-register. It is manually inserted into both databases.

| Field | Value |
|---|---|
| Email | admin@uet.edu.pk |
| Password | Admin@123 |
| Role | ADMIN |
| University | UET |

> ⚠️ Change the password after first login in production.

---

## 📮 API Endpoints

### Public Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-email` | Verify email OTP |
| POST | `/auth/request-new-otp` | Resend verification OTP |
| POST | `/auth/login` | Login |
| POST | `/auth/forgot-password` | Request password reset OTP |
| POST | `/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/logout` | Logout |

---

## 🔄 Registration Flow

```
1. POST /auth/register
   → validates email + password
   → generates userId
   → stores temp data in Redis (10 mins TTL)
   → sends OTP to email

2. POST /auth/verify-email
   → validates OTP from Redis
   → creates auth record in MongoDB
   → calls user-service POST /internal/register
   → user-service creates UserProfile with same userId
   → cleans up Redis
   → returns JWT
```

---

## 🔑 JWT Payload

```json
{
  "userId": "uuid-generated-by-auth-service",
  "role": "STUDENT | INSTRUCTOR | ADMIN",
  "university": "UET",
  "isProfileComplete": false,
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 🔒 OTP Rules

| Rule | Value |
|---|---|
| OTP expiry | 10 minutes |
| Max wrong attempts | 5 |
| Resend cooldown | 30 seconds |
| Max resends | 3 |
| Block duration | 15 minutes |

---

## 🧪 Postman Test Cases

### 1. Register — Student ✅
```
POST /auth/register
{
  "name": "Ali Hassan",
  "email": "ali@gmail.com",
  "password": "Ali@12345",
  "role": "STUDENT"
}
Expected: 201 — OTP sent to email
```

### 2. Register — Instructor ✅
```
POST /auth/register
{
  "name": "Dr. Ahmed Raza",
  "email": "ahmed@gmail.com",
  "password": "Ahmed@12345",
  "role": "INSTRUCTOR"
}
Expected: 201 — OTP sent to email
```

### 3. Register — ADMIN blocked ❌
```
POST /auth/register
{
  "name": "Admin",
  "email": "admin@uet.edu.pk",
  "password": "Admin@123",
  "role": "ADMIN"
}
Expected: 400 — Admin accounts cannot be self registered
```

### 4. Register — Duplicate email ❌
```
POST /auth/register
{ "email": "ali@gmail.com", ... }
Expected: 409 — Email already exists
```

### 5. Verify Email — Valid OTP ✅
```
POST /auth/verify-email
{
  "email": "ali@gmail.com",
  "otp": "482910"
}
Expected: 200 — JWT returned
```

### 6. Verify Email — Wrong OTP ❌
```
POST /auth/verify-email
{
  "email": "ali@gmail.com",
  "otp": "000000"
}
Expected: 400 — Invalid OTP
```

### 7. Verify Email — Expired OTP ❌
```
Wait 10 minutes then verify
Expected: 400 — OTP expired
```

### 8. Request New OTP ✅
```
POST /auth/request-new-otp
{ "email": "ali@gmail.com" }
Expected: 200 — New OTP sent
```

### 9. Request New OTP — Cooldown ❌
```
Request twice within 30 seconds
Expected: 400 — Please wait 30 seconds
```

### 10. Login — Valid credentials ✅
```
POST /auth/login
{
  "email": "ali@gmail.com",
  "password": "Ali@12345"
}
Expected: 200 — JWT returned
```

### 11. Login — Wrong password ❌
```
POST /auth/login
{
  "email": "ali@gmail.com",
  "password": "wrongpassword"
}
Expected: 401 — Invalid credentials
```

### 12. Login — Unverified email ❌
```
Login before verifying OTP
Expected: 401 — Please verify your email first
```

### 13. Forgot Password ✅
```
POST /auth/forgot-password
{ "email": "ali@gmail.com" }
Expected: 200 — Reset OTP sent
```

### 14. Verify Reset OTP ✅
```
POST /auth/verify-reset-otp
{
  "email": "ali@gmail.com",
  "otp": "123456"
}
Expected: 200 — OTP verified
```

### 15. Reset Password ✅
```
POST /auth/reset-password
{
  "email": "ali@gmail.com",
  "password": "NewPass@123"
}
Expected: 200 — Password reset successful
```

### 16. Logout ✅
```
POST /auth/logout
Authorization: Bearer jwt_token
Expected: 200 — Logged out successfully
```

---

## 🔗 Inter-Service Communication

Auth service calls user-service after email verification:

```
POST http://localhost:3001/internal/register
Headers: x-internal-secret: your_internal_secret
Body: { userId, name, email, role }
```

If user-service fails → auth record is rolled back.

---

## 🛡 Security Features

- Passwords hashed with bcrypt (10 rounds)
- OTPs hashed before storing in Redis
- JWT blacklisting on logout
- Rate limiting on OTP requests
- Unverified registrations auto-expire (Redis TTL)
- Admin accounts cannot be self-registered
