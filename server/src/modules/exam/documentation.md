# Exam API — Integration Guide

All endpoints are prefixed with your base route (e.g. `/api/exams` and `/api/questions`). Every request must carry a valid JWT so the server can populate `req.user` with `userId` and `role`.

---

## Authentication & Roles

| Role | Access |
|---|---|
| `teacher` | Create, update, delete exams and questions |
| `student` | Read exams assigned to them; read questions for an exam |

The JWT middleware must set `req.user.userId` and `req.user.role` before these routes run.

---

## Exam Endpoints

### `POST /exams`
Create a new exam with its questions included.

**Role required:** `teacher`

**Request body:**
```json
{
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
    },
    {
      "type": "text",
      "questionText": "Explain the Pythagorean theorem.",
      "referenceAnswer": "a² + b² = c²",
      "marks": 40
    }
  ]
}
```

**Field rules:**
- `subject` — required, non-empty string
- `title` — required, non-empty string
- `totalMarks` — required, positive integer; **must equal the sum of all question `marks`**
- `scheduledTime` — required ISO date string; must be a future date
- `timeAllowed` — required, positive integer (minutes)
- `questions` — required, non-empty array; each question is validated individually (see Question Fields below)
- `instructorId` and `teacherName` are set server-side from the JWT — do not send them

**Success `201`:**
```json
{ "status": "success", "data": { } }
```

**Error `400`:**
```json
{ "status": "error", "errors": ["totalMarks (50) must equal sum of all question marks (30)"] }
```

**Error `403`:** User is not a teacher.

---

### `GET /exams`
Get exams belonging to the authenticated teacher, optionally filtered by subject.

**Role required:** `teacher`

**Query params:**

| Param | Type | Description |
|---|---|---|
| `subject` | string | (optional) Filter exams by subject |

**Examples:**
```
GET /exams              → all exams for this teacher
GET /exams?subject=Math → only Math exams for this teacher
```

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `GET /exams/student`
Get exams assigned to the authenticated student.

**Role required:** `student`

> **Note:** Student roll number is resolved server-side from `req.user.userId`. No query params needed.

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `PATCH /exams/:id`
Update exam fields (not status — use the dedicated status endpoint for that).

**Role required:** `teacher` (must own the exam)

**URL param:** `:id` — 24-character MongoDB ObjectId

**Request body** (all fields optional):
```json
{
  "title": "Updated Title",
  "subject": "Physics",
  "totalMarks": 100,
  "scheduledTime": "2025-12-15T10:00:00.000Z",
  "timeAllowed": 120
}
```

**Field rules:** Same types as create; `scheduledTime` if provided must still be a future date.

**Success `200`:**
```json
{ "status": "success", "data": {} }
```

**Error `403`:** User is not the exam owner.  
**Error `404`:** Exam not found.

---

### `PATCH /exams/:id/status`
Update only the status of an exam.

**Role required:** `teacher` (must own the exam)

**URL param:** `:id` — 24-character MongoDB ObjectId

**Request body:**
```json
{ "status": "published" }
```

**Allowed status values:** `draft` | `saved` | `published` | `submitted` | `checked`

**Success `200`:**
```json
{ "status": "success", "data": {} }
```

---

### `DELETE /exams/:id`
Delete an exam by ID.

**Role required:** `teacher` (must own the exam)

**URL param:** `:id` — 24-character MongoDB ObjectId

**Success `200`:**
```json
{ "status": "success", "message": "Exam deleted successfully" }
```

---

## Question Endpoints

### `POST /questions/:examId`
Add a question to an existing exam.

**Role required:** `teacher` (must own the exam)

**URL param:** `:examId` — 24-character MongoDB ObjectId

**Request body:**
```json
{
  "type": "mcq",
  "questionText": "Which planet is closest to the sun?",
  "options": ["Earth", "Mars", "Mercury", "Venus"],
  "referenceAnswer": "Mercury",
  "marks": 5,
  "imageUrl": "https://example.com/planet.jpg"
}
```

### Question Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | Yes | `"mcq"` or `"text"` |
| `questionText` | string | Yes | Non-empty |
| `referenceAnswer` | string | Yes | Non-empty |
| `marks` | integer | Yes | Positive integer |
| `options` | string[] | MCQ only | Exactly 4 items |
| `imageUrl` | string | No | Optional image URL |

**Success `201`:**
```json
{ "status": "success", "data": {} }
```

---

### `GET /questions/question/:examId`
Get all questions for a specific exam.

**Role required:** `teacher` or `student`

**URL param:** `:examId` — 24-character MongoDB ObjectId

> **Note for students:** Roll number is resolved from `req.user.userId` internally.

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `PATCH /questions/question/:id`
Update a question by its ID.

**Role required:** `teacher` (must own the exam the question belongs to)

**URL param:** `:id` — 24-character MongoDB ObjectId

**Request body** (all fields optional):
```json
{
  "questionText": "Updated question text",
  "referenceAnswer": "Updated answer",
  "marks": 10,
  "options": ["A", "B", "C", "D"]
}
```

**Success `200`:**
```json
{ "status": "success", "data": {} }
```

---

### `DELETE /questions/question/:id`
Delete a question by its ID.

**Role required:** `teacher` (must own the exam the question belongs to)

**URL param:** `:id` — 24-character MongoDB ObjectId

**Success `200`:**
```json
{ "status": "success", "message": "Question deleted successfully" }
```

---

## Common Error Responses

| Status | Shape | When |
|---|---|---|
| `400` | `{ "status": "error", "errors": [...] }` | Validation failure |
| `400` | `{ "status": "error", "message": "..." }` | Service/DB error |
| `403` | `{ "status": "error", "message": "..." }` | Wrong role or not the owner |
| `404` | `{ "status": "error", "message": "..." }` | Resource not found |

---

## Data Models

### Exam
```
instructorId   String   (set from JWT)
teacherName    String   (set from JWT/service)
title          String
subject        String
scheduledTime  Date
timeAllowed    Number   (minutes)
totalMarks     Number
students       String[]
status         "draft" | "saved" | "published" | "submitted" | "checked"
createdAt      Date     (auto)
updatedAt      Date     (auto)
```

### Question
```
examId          ObjectId → Exam
type            "mcq" | "text"
questionText    String
imageUrl        String | null
options         String[]   (4 items, MCQ only)
marks           Number
referenceAnswer String
createdAt       Date       (auto)
updatedAt       Date       (auto)
```

---

## Quick Integration Checklist

- [ ] JWT middleware runs before all exam/question routes and sets `req.user.userId` and `req.user.role`
- [ ] All IDs are 24-character hex MongoDB ObjectIds
- [ ] `scheduledTime` is sent as a valid future ISO 8601 string
- [ ] `totalMarks` in `POST /exams` equals the exact sum of all question `marks`
- [ ] MCQ questions always include exactly 4 `options`
- [ ] `POST /exams` and `POST /questions/:examId` require role `teacher`
- [ ] `GET /exams/student` and `GET /questions/question/:examId` are accessible to both roles
- [ ] Do **not** send `instructorId` or `teacherName` — they are populated server-side