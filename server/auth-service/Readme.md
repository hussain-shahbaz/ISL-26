# 🔐 Auth Service

Authentication and authorization microservice for the **Secure Online Examination System**. This service handles user identity management, secure authentication, email verification, and password recovery with enterprise-grade security.

## 📋 Overview

This service handles:

- User registration & login
- JWT-based authentication with refresh tokens
- Session management with logout capabilities
- Email verification with OTP
- Secure password reset flow
- Multi-device session tracking
- Rate limiting & abuse prevention

---

## ✨ Features

### 🔑 Authentication
- User registration with validation
- Secure login with session creation
- Access token generation (short-lived)
- Refresh token generation & rotation
- Session management & tracking
- Logout from single device
- Logout from all devices

### 📧 Email Verification
- OTP-based email verification
- Gmail OAuth2 integration for sending
- OTP expiration (configurable)
- Resend cooldown to prevent spam
- Attempt limiting with temporary blocking
- Secure OTP hashing

### 🔄 Password Reset
- Forgot password flow with OTP
- Reset OTP verification
- Secure password reset
- Session validation for recovery

### 🛡️ Security Features
- **bcrypt** password hashing with salt rounds
- **OTP** hashing for secure verification
- **JWT** authentication (HS256)
- **Refresh token** rotation
- Secure session handling
- **Zod** request validation
- Rate limiting logic
- Token invalidation/blacklisting
- Session revocation

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB |
| **ORM** | Prisma |
| **Authentication** | JWT (jsonwebtoken) |
| **Password Hashing** | bcrypt |
| **Email Service** | Nodemailer + Gmail OAuth2 |
| **Validation** | Zod |

---

## 📁 Folder Structure

```bash
src/
├── config/              # Configuration files (database, environment)
├── controllers/         # Request handlers
├── middleware/          # Express middleware (auth, validation, error handling)
├── models/              # Data models/schemas
├── repositories/        # Database access layer
├── routes/              # API route definitions
├── services/            # Business logic (auth, email)
├── utils/               # Utility functions (JWT, hashing, OTP)
├── validators/          # Zod validation schemas
└── app.js               # Express app setup
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas)
- Gmail account for OAuth2 (for email verification)

### Installation

1. **Clone & Install Dependencies**
```bash
npm install
```

2. **Setup Environment Variables**

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/auth-service-db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Service (Gmail OAuth2)
GOOGLE_USER=your_email@gmail.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

3. **Setup Prisma**
```bash
npx prisma migrate dev
```

4. **Run Development Server**
```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## 📡 API Routes

### Authentication Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login user & create session |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout current session |
| `POST` | `/auth/logout-all` | Logout all sessions |

### Email Verification Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/verify-email` | Verify email with OTP |
| `POST` | `/auth/request-otp` | Request new verification OTP |

### Password Reset Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/forgot-password` | Send reset OTP to email |
| `POST` | `/auth/request-reset-password-otp` | Request new reset OTP |
| `POST` | `/auth/verify-reset-otp` | Verify reset OTP |
| `POST` | `/auth/reset-password` | Reset password |

---

## 🔄 Authentication Flows

### Registration & Email Verification Flow
```
Register (email, password)
        ↓
   Send OTP Email
        ↓
  User Verifies OTP
        ↓
   Email Confirmed
        ↓
   Account Active
```

### Login Flow
```
Login (email, password)
        ↓
Validate Credentials
        ↓
Generate Session
        ↓
Create JWT Access Token
        ↓
Create Refresh Token
        ↓
Return Tokens
```

### Password Reset Flow
```
Forgot Password (email)
        ↓
Send Reset OTP
        ↓
User Verifies OTP
        ↓
Confirm Reset Request
        ↓
New Password Set
        ↓
Session Invalidated
```

---

## 🔒 Request Validation

All request bodies are validated using **Zod** middleware before reaching controllers. Invalid requests return `400 Bad Request` with detailed validation errors.

Example validation error response:
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 📝 Example Requests

### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "emailVerified": false
  }
}
```

### Refresh Token
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `MONGO_URI connection error` | Check MongoDB is running and URI is correct |
| `OTP email not sending` | Verify Gmail OAuth2 credentials and tokens |
| `JWT decode errors` | Ensure JWT secrets match between services |
| `Rate limit exceeded` | Wait before retrying requests |
| `Session not found` | Login again to create new session |

---

## 📦 Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `prisma` - Modern ORM
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `nodemailer` - Email service
- `zod` - Schema validation
- `dotenv` - Environment variables

---

## 📄 License

This project is part of the Secure Online Examination System. All rights reserved.

---

## 👤 Author

Developed as part of ISL-26 project for Secure Online Examination System.

---

## 📞 Support

For issues or questions, please check the main project repository or documentation.