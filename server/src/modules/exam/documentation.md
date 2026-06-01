# Exam API — Integration Guide

Base URL: `/api/exam`

Every request must carry a valid JWT. The JWT middleware must set `req.user.userId` and `req.user.role` before these routes run.

---

## Authentication & Roles

| Role | Access |
|---|---|
| `teacher` | Create, update, delete exams and questions |
| `student` | Read exams assigned to them; read questions for an exam |

---

## Exam Endpoints

### `POST /api/exam`
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
- `questions` — required, non-empty array (see [Question Fields](#question-fields))
- Do **not** send `instructorId` or `teacherName` — set server-side from JWT

**Success `201`:**
```json
{ "status": "success", "data": {} }
```

---

### `GET /api/exam`
Get exams for the authenticated teacher, optionally filtered by subject.

**Role required:** `teacher`

| Query param | Type | Description |
|---|---|---|
| `subject` | string | (optional) Filter by subject |

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `GET /api/exam/student`
Get exams assigned to the authenticated student.

**Role required:** `student`

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `PATCH /api/exam/:id`
Update exam fields.

**Role required:** `teacher` (must own the exam)

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

**Success `200`:**
```json
{ "status": "success", "data": {} }
```

---

### `PATCH /api/exam/:id/status`
Update only the status of an exam.

**Role required:** `teacher` (must own the exam)

**Request body:**
```json
{ "status": "published" }
```

**Allowed values:** `draft` | `saved` | `published` | `submitted` | `checked`

**Success `200`:**
```json
{ "status": "success", "data": {} }
```

---

### `DELETE /api/exam/:id`
Delete an exam.

**Role required:** `teacher` (must own the exam)

**Success `200`:**
```json
{ "status": "success", "message": "Exam deleted successfully" }
```

---

## Question Endpoints

### `POST /api/exam/question/:examId`
Add a question to an existing exam.

**Role required:** `teacher` (must own the exam)

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

#### Question Fields

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

### `GET /api/exam/question/:examId`
Get all questions for a specific exam.

**Role required:** `teacher` or `student`

**Success `200`:**
```json
{ "status": "success", "data": [] }
```

---

### `PATCH /api/exam/question/:id`
Update a question by its ID.

**Role required:** `teacher` (must own the exam the question belongs to)

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

### `DELETE /api/exam/question/:id`
Delete a question by its ID.

**Role required:** `teacher` (must own the exam the question belongs to)

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

All success responses follow: `{ "status": "success", "data": ... }`

---

## Data Models

### Exam
```
instructorId   String
teacherName    String
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

- [ ] JWT middleware sets `req.user.userId` and `req.user.role` before these routes
- [ ] All IDs are 24-character hex MongoDB ObjectIds
- [ ] `scheduledTime` is a valid future ISO 8601 string
- [ ] `totalMarks` equals the exact sum of all question `marks`
- [ ] MCQ questions always have exactly 4 `options`
- [ ] Do **not** send `instructorId` or `teacherName` in the body