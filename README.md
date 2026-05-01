# Secure Online Examination System

This repository is built for a **modular, security-first, industry-style backend**.  
The goal is not just to make the app work, but to make the code easy to maintain, test, review, and integrate as a team.

---

## 1) Project Idea

We are building a secure online examination system where:

- students log in securely
- teachers manage and monitor exams
- every important action is logged
- the system follows a strict module-based structure
- each team member works only in the module assigned to them

This project is designed around a **clean layered architecture**:

`Client -> Middleware -> Controller -> Service -> Repository -> Database`

That means:

- controllers handle requests and responses
- services contain business rules
- repositories talk to MongoDB
- middleware handles cross-cutting concerns like auth, logging, validation, and response tracking

---

## 2) Important Team Rule

Please **do not copy code blindly** from the sample module.

The sample file is there to help you **understand the structure, naming style, and layering**, not to force exact logic.

Use it as a learning guide, then write your own module in the same style.

---

## 3) How We Work as a Team

Every person should work only inside their own assigned module folder.

Examples:

- if you are assigned authentication, work inside the auth module only
- if you are assigned logging, work inside the logging module only
- if you are assigned exam state, work inside the exam module only

Do not modify another module unless the team agrees on a shared change.

This keeps the codebase safe, clean, and easy to merge.

---

## 4) Clone the Repository

```bash
git clone <repository-url>
cd secure-online-examination-system
```

After cloning, create your own working branch:

```bash
git checkout -b feature/module-name
```

Example:

```bash
git checkout -b feature/auth-module
```

When you finish, push your branch and create a pull request.

---

## 5) Commit Message Style

We follow **Conventional Commits** to keep our commit history clean and professional.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
Must be one of:

- **feat** - A new feature
- **fix** - A bug fix
- **refactor** - Code refactoring (no feature change, no bug fix)
- **docs** - Documentation changes only
- **test** - Adding or updating tests
- **chore** - Build scripts, dependencies, configuration
- **style** - Code style changes (formatting, semicolons, etc.)
- **perf** - Performance improvements

### Scope
The module or component affected (optional but recommended):

- `auth`
- `logging`
- `exam`
- `device`
- `monitoring`
- `risk`
- `common`
- `config`

### Subject

- Use imperative mood: "add" not "added" or "adds"
- Do not capitalize first letter
- Do not end with a period
- Maximum 50 characters
- Be specific and clear

### Body (optional)

- Explain WHY, not WHAT
- Wrap at 72 characters
- Use imperative mood
- Reference issues if applicable

### Footer (optional)

- Reference related issues: `Closes #123` or `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Good commits:**

```
feat(auth): add jwt token refresh mechanism

implement automatic token refresh to prevent session
expiry during active user sessions. uses refresh
tokens stored in secure http-only cookies.

Closes #42
```

```
fix(logging): resolve missing userId in audit logs

add userId extraction from request context before
creating log entry to ensure all audit logs are
properly attributed to users.
```

```
refactor(auth): simplify token validation logic

extract token validation into separate method for
better testability and reusability across modules.
```

```
docs(auth): add api documentation for login endpoint
```

```
test(exam): add unit tests for exam-service
```

### Command to commit properly

```bash
git add .
git commit -m "type(scope): subject" -m "Optional body with more details"
```

Or use your IDE's commit composer for interactive messages.

---

## 7) Folder Structure

We keep the backend organized by responsibility, not by random files.

```text
server/
├── src/
│   ├── common/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── helpers/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── logging/
│   │   ├── exam/
│   │   ├── device/
│   │   ├── monitoring/
│   │   └── risk/
│   │
│   ├── config/
│   ├── routes/
│   └── app.py
│
├── tests/
├── docs/
└── README.md
```

### What each folder means

- `common/`  
  shared logic used by all modules

- `modules/`  
  one folder per feature or security module

- `config/`  
  database, environment, and server settings

- `routes/`  
  central route registration

- `tests/`  
  unit and integration tests

- `docs/`  
  design notes, API notes, and module documentation

---

## 8) Layering Rules

These rules must stay strict:

1. **Controller only receives request and returns response**
2. **Service contains business logic**
3. **Repository handles database access**
4. **Middleware handles request/response cross-cutting work**
5. **Lower layers must not depend on higher layers**
6. **Controllers must not access MongoDB directly**
7. **Services must not read raw HTTP requests**
8. **Repositories must not contain business rules**
9. **Modules must not import internal code from other modules**
10. **All shared behavior should go through the common layer**

This is the main rule set that keeps the system scalable.

---

## 9) Naming Conventions

We will use the same conventions everywhere.

### Methods
Use **camelCase**

Examples:
- `loginUser`
- `validateRequest`
- `logResponse`
- `generateToken`

### Classes
Use **PascalCase**

Examples:
- `AuthController`
- `AuthService`
- `LoggingMiddleware`
- `ExamRepository`

### Constants
Use **UPPER_CASE**

Examples:
- `JWT_SECRET`
- `MAX_LOGIN_ATTEMPTS`
- `DEFAULT_TIMEOUT`

### Files
Use **kebab-case**

Examples:
- `auth-controller.py`
- `auth-service.py`
- `response-logger.py`
- `exam-repository.py`

---

## 10) Request and Response Style

We are keeping the payload style simple.

### Example request body
```json
{
  "username": "ali",
  "password": "123456"
}
```

### Example response body
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "username": "ali"
  }
}
```

### Example log object
```json
{
  "userId": "123",
  "timestamp": "2026-05-02T10:30:00Z",
  "route": "/api/auth/login",
  "request": {
    "method": "POST",
    "body": {
      "username": "ali"
    }
  },
  "response": {
    "statusCode": 200
  },
  "payload": {
    "action": "login"
  },
  "responseBody": {
    "status": "success"
  },
  "sha256HASH": "..."
}
```

---

## 11) Logging Rule

All modules must send logs through the shared logging flow.

Do not write directly to the database from a module.

Logging should capture:

- `userId`
- `timestamp`
- `route`
- `request`
- `response`
- `payload`
- `responseBody`
- `sha256HASH`

This helps with auditing, debugging, and security tracking.

---

## 12) Response Logging

We want to understand both request and response flow.

The middleware should:

- allow the controller to process the request
- capture the final response
- build a clean log object
- send it to the logging module
- never block the actual response

That means logging should never break the user experience.

---

## 13) Module Ownership Rule

Each teammate should focus on one module only.

Example workflow:

- Module owner designs the folder
- Module owner writes controller, service, repository, and module-specific middleware
- Shared utilities are added only when truly reusable
- Any change that affects multiple modules must be discussed first

---

## 14) What a Good Module Should Contain

A proper module should have:

- controller
- service
- repository
- route file
- validation logic
- module-specific middleware if needed
- test file
- small README or notes if needed

The module should stay self-contained as much as possible.

---

## 15) What We Should Avoid

- no giant controller files
- no direct DB access inside controllers
- no business logic inside routes
- no copying logic into multiple modules
- no hardcoded secrets
- no random file naming
- no inconsistent response formats

---

## 16) Sample Design File

A sample design skeleton is included in:

`sample-module-skeleton.py`

It shows:

- class names
- method names
- return-shape examples
- file naming style
- module structure

Again: **learn from it, do not copy it blindly**.

---

## 17) Final Goal

The final system should feel like a real team-built product:

- readable
- modular
- secure
- easy to debug
- easy to integrate
- easy to extend

If a new teammate opens the codebase, they should understand where everything belongs within minutes.
