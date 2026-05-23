# Exam Module — API Documentation

Ye module online exam system ka part hai. Exams aur questions ka CRUD handle karta hai. User data (teachers/students) alag PostgreSQL service mein hai — ye module sirf MongoDB mein exam data store karta hai.

---

## Base URL
```
/api/exam
/api/questions
```

## Authentication
Har request mein JWT token hona chahiye. Token se `req.user` set hota hai:
```
req.user = { userId, role, rollNumber }
```

---

## Status Flow
```
draft ↔ saved ↔ published → submitted ↔ checked
```
- `submitted` ya `checked` se wapis `published`, `saved`, `draft` pe nahi ja sakte
- Publish hone ke baad hi `submitted` ya `checked` ja sakta hai

---

# EXAM ENDPOINTS

---

## 1. Create Exam
**`POST /api/exam`**

Naya exam banao. Questions bhi saath create hote hain.

**Access:** Sirf `teacher`

**Request Body:**
```json
{
  "instructorId": "101",
  "subject": "Mathematics",
  "scheduledTime": "2026-06-20T10:00:00.000Z",
  "timeAllowed": 60,
  "totalMarks": 10,
  "students": ["roll-001", "roll-002"],
  "questions": [
    {
      "type": "mcq",
      "questionText": "What is the capital of Pakistan?",
      "marks": 5,
      "options": ["Lahore", "Karachi", "Islamabad", "Peshawar"],
      "referenceAnswer": "Islamabad"
    },
    {
      "type": "text",
      "questionText": "What is Pythagoras theorem?",
      "marks": 5,
      "referenceAnswer": "Sum of squares of two sides equals square of hypotenuse"
    }
  ]
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| instructorId | Required, integer |
| subject | Required, non-empty string |
| scheduledTime | Required, future date |
| timeAllowed | Required, positive integer (minutes) |
| totalMarks | Required, positive integer — must equal sum of question marks |
| students | Required, non-empty array of roll numbers |
| questions | Required, non-empty array — each question validated separately |
| questions[].type | Required, `mcq` or `text` |
| questions[].questionText | Required |
| questions[].marks | Required, positive integer |
| questions[].referenceAnswer | Required |
| questions[].options | Required if type is `mcq`, exactly 4 options |
| questions[].imageUrl | Optional |

**Success Response `201`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64abc123...",
    "instructorId": "101",
    "subject": "Mathematics",
    "scheduledTime": "2026-06-20T10:00:00.000Z",
    "timeAllowed": 60,
    "totalMarks": 10,
    "students": ["roll-001", "roll-002"],
    "status": "draft",
    "createdAt": "2026-05-20T08:00:00.000Z",
    "updatedAt": "2026-05-20T08:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 201 | Exam created successfully |
| 400 | Validation failed |
| 403 | Role is not teacher |

---

## 2. Get All Exams (Teacher)
**`GET /api/exam`**

Token se `instructorId` nikalta hai — teacher sirf apni exams dekhta hai.

**Access:** Sirf `teacher`

**Query Params (Optional):**
| Param | Description |
|---|---|
| subject | Filter by subject |

**Example:**
```
GET /api/exam
GET /api/exam?subject=Mathematics
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "64abc123...",
      "instructorId": "101",
      "subject": "Mathematics",
      "scheduledTime": "2026-06-20T10:00:00.000Z",
      "timeAllowed": 60,
      "totalMarks": 10,
      "students": ["roll-001", "roll-002"],
      "status": "draft"
    }
  ]
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Success |
| 400 | Error fetching exams |

---

## 3. Get Exams by Student
**`GET /api/exam/student/:rollNumber`**

Student ke roll number se uske saare exams fetch karo (published, submitted, checked).

**Access:** Teacher ya Student

**Params:**
| Param | Description |
|---|---|
| rollNumber | Student ka roll number |

**Example:**
```
GET /api/exam/student/roll-001
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "64abc123...",
      "subject": "Mathematics",
      "scheduledTime": "2026-06-20T10:00:00.000Z",
      "timeAllowed": 60,
      "totalMarks": 10,
      "status": "published"
    }
  ]
}
```

> Agar koi exam nahi mila ya rollNumber exist nahi karta — empty array return hoga, error nahi.

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Success (empty array bhi 200 hai) |
| 400 | Server error |

---

## 4. Update Exam
**`PATCH /api/exam/:id`**

Exam ki info update karo. Sirf `draft` ya `saved` exam update ho sakti hai.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| id | Exam ka MongoDB ObjectId (24 characters) |

**Request Body (sab optional, jo change karna ho woh bhejo):**
```json
{
  "subject": "Physics",
  "scheduledTime": "2026-07-01T10:00:00.000Z",
  "timeAllowed": 90,
  "totalMarks": 20,
  "students": ["roll-001", "roll-002", "roll-003"]
}
```

**Rules:**
- `instructorId` update nahi ho sakta — ignore kiya jayega
- `status` update nahi ho sakta — alag endpoint use karo
- `published`, `submitted`, `checked` exam update nahi ho sakti

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64abc123...",
    "subject": "Physics",
    "totalMarks": 20,
    "status": "draft"
  }
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Updated successfully |
| 400 | Validation failed ya exam published/submitted/checked hai |
| 403 | Not authorized — ye teri exam nahi |
| 404 | Exam not found |

---

## 5. Update Status
**`PATCH /api/exam/:id/status`**

Exam ka status update karo.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| id | Exam ka MongoDB ObjectId |

**Request Body:**
```json
{
  "status": "saved"
}
```

**Status Rules:**
- `draft` ↔ `saved` ↔ `published` — aage peeche ja sakte hain
- `published` → `submitted` ja sakta hai
- `submitted` ↔ `checked` — aage peeche ja sakte hain
- `submitted` ya `checked` → `published`, `saved`, `draft` — nahi ja sakta
- Publish hone ke baad hi `submitted` ya `checked` ja sakta hai

**Publish Hone Ke Liye Zaruri:**
- `subject` hona chahiye
- `scheduledTime` future mein honi chahiye
- `timeAllowed` positive integer hona chahiye
- `totalMarks` positive integer hona chahiye
- `students` array empty nahi honi chahiye
- Kam az kam ek question honi chahiye
- Questions ke total marks === exam totalMarks

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64abc123...",
    "status": "published"
  }
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Status updated |
| 400 | Invalid status ya publish conditions fail |
| 403 | Not authorized |
| 404 | Exam not found |

---

## 6. Delete Exam
**`DELETE /api/exam/:id`**

Exam delete karo. Saath uski saari questions bhi delete ho jaati hain.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| id | Exam ka MongoDB ObjectId |

**Rules:**
- `published`, `submitted`, `checked` exam delete nahi ho sakti

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Exam deleted successfully"
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Deleted successfully |
| 400 | Exam published/submitted/checked hai |
| 403 | Not authorized |
| 404 | Exam not found |

---

# QUESTION ENDPOINTS

---

## 7. Create Question
**`POST /api/questions/:examId`**

Existing exam mein naya question add karo. Exam ka `totalMarks` automatically update hoga.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| examId | Exam ka MongoDB ObjectId |

**Request Body (MCQ):**
```json
{
  "type": "mcq",
  "questionText": "What is the speed of light?",
  "marks": 5,
  "options": ["3x10^6", "3x10^8", "3x10^10", "3x10^12"],
  "referenceAnswer": "3x10^8",
  "imageUrl": "https://example.com/image.png"
}
```

**Request Body (Text):**
```json
{
  "type": "text",
  "questionText": "Define Newton's second law",
  "marks": 5,
  "referenceAnswer": "Force equals mass times acceleration"
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| type | Required, `mcq` or `text` |
| questionText | Required |
| marks | Required, positive integer |
| referenceAnswer | Required |
| options | Required if mcq, exactly 4 |
| imageUrl | Optional |

**Rules:**
- `published`, `submitted`, `checked` exam mein question add nahi ho sakta
- Question add hone pe exam ka `totalMarks` automatically update hoga

**Success Response `201`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64xyz789...",
    "examId": "64abc123...",
    "type": "mcq",
    "questionText": "What is the speed of light?",
    "marks": 5,
    "options": ["3x10^6", "3x10^8", "3x10^10", "3x10^12"],
    "referenceAnswer": "3x10^8"
  }
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 201 | Question created |
| 400 | Validation failed ya exam locked hai |
| 403 | Not authorized |
| 404 | Exam not found |

---

## 8. Get Questions by Exam
**`GET /api/questions/question/:examId`**

Exam ki saari questions fetch karo.

**Access:** Teacher (owner) ya Student (enrolled, exam published aur started)

**Params:**
| Param | Description |
|---|---|
| examId | Exam ka MongoDB ObjectId |

**Teacher Response `200`:** Saari fields milti hain including `referenceAnswer`

**Student Response `200`:** `referenceAnswer` strip ho jata hai

**Student Ke Liye Conditions:**
- Exam `published` honi chahiye
- `scheduledTime` guzar chuka ho
- Student `students` array mein hona chahiye

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "64xyz789...",
      "examId": "64abc123...",
      "type": "mcq",
      "questionText": "What is the capital of Pakistan?",
      "marks": 5,
      "options": ["Lahore", "Karachi", "Islamabad", "Peshawar"]
    }
  ]
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Success |
| 400 | Exam not available ya student enrolled nahi |
| 403 | Not authorized (teacher ka case) |
| 404 | Exam not found |

---

## 9. Update Question
**`PATCH /api/questions/question/:id`**

Question update karo. Marks update hone pe exam ka `totalMarks` automatically update hoga.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| id | Question ka MongoDB ObjectId |

**Request Body (sab optional):**
```json
{
  "questionText": "Updated question text",
  "marks": 10,
  "options": ["A", "B", "C", "D"],
  "referenceAnswer": "B"
}
```

**Rules:**
- `examId` update nahi ho sakta — ignore kiya jayega
- `published`, `submitted`, `checked` exam ka question update nahi ho sakta
- Marks update hone pe exam ka `totalMarks` automatically update hoga

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64xyz789...",
    "questionText": "Updated question text",
    "marks": 10
  }
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Updated successfully |
| 400 | Validation failed ya exam locked |
| 403 | Not authorized |
| 404 | Question not found |

---

## 10. Delete Question
**`DELETE /api/questions/question/:id`**

Question delete karo. Exam ka `totalMarks` automatically update hoga.

**Access:** Sirf exam ka owner `teacher`

**Params:**
| Param | Description |
|---|---|
| id | Question ka MongoDB ObjectId |

**Rules:**
- `published`, `submitted`, `checked` exam ka question delete nahi ho sakta
- Delete hone pe exam ka `totalMarks` automatically update hoga

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Question deleted successfully"
}
```

**Status Codes:**
| Code | Reason |
|---|---|
| 200 | Deleted successfully |
| 400 | Exam locked hai |
| 403 | Not authorized |
| 404 | Question not found |

---

# Common Error Responses

**400 — Validation Error:**
```json
{
  "status": "error",
  "errors": ["subject is required", "timeAllowed must be a positive integer"]
}
```

**403 — Not Authorized:**
```json
{
  "status": "error",
  "message": "Not authorized"
}
```

**404 — Not Found:**
```json
{
  "status": "error",
  "message": "Exam not found"
}
```

---

# totalMarks Auto-Update Logic

| Operation | Effect on totalMarks |
|---|---|
| Question add | `totalMarks + newQuestion.marks` |
| Question update (marks changed) | `totalMarks + (newMarks - oldMarks)` |
| Question delete | `totalMarks - deletedQuestion.marks` |

---

# Student Exam Mapping

Jab exam publish hoti hai — har enrolled student ke liye `StudentExam` collection mein `examId` add ho jata hai. Isse student ki exams O(log n) mein fetch hoti hain instead of scanning har exam ki students array.

Jab students list update hoti hai — removed students ke mapping se `examId` hata diya jata hai aur naye students ke mapping mein add kar diya jata hai.