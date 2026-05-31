# Student Exam API Documentation

## Overview
The Student Exam API is a Node.js/Express service built for managing student exam submissions, tracking, and result retrieval. It provides endpoints for students to submit exams, retrieve assigned exams, and access their submission results.

---

## Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Environment Variables](#environment-variables)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Database Schema](#database-schema)
6. [Error Handling](#error-handling)
7. [Testing with Postman](#testing-with-postman)

---

## Setup & Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas connection)
- npm or yarn

### Installation Steps

```bash
# Navigate to the student-exam module
cd server/src/modules/student-exam

# Install dependencies
npm install

# Setup environment variables (see Environment Variables section)
# Create a .env file in the module root

# Seed the database with sample data
node seed.js

# Start the server
npm run dev
# or
npm start
```

---

## Environment Variables

Create a `.env` file in the `server/src/modules/student-exam/` directory:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/student-exam-db
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/student-exam-db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1/student-exam
```

### 1. Get All Exams (Assigned to Student)
**GET** `/`

Retrieves all exams assigned to the current student.

**Query Parameters:** None

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional - currently uses hardcoded studentId)
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exams fetched successfully",
  "statusCode": 200,
  "data": [
    {
      "_id": "exam_id_1",
      "title": "Mathematics Final Exam",
      "description": "Final examination for Mathematics",
      "examDate": "2026-05-30",
      "examTime": "09:00",
      "duration": 120,
      "totalMarks": 100,
      "status": "published",
      "questions": [
        {
          "questionId": "q1",
          "questionText": "What is 2+2?",
          "options": ["3", "4", "5", "6"],
          "correctAnswer": "4",
          "marksAllocated": 5
        }
      ],
      "createdAt": "2026-05-20T10:00:00.000Z",
      "updatedAt": "2026-05-25T15:30:00.000Z"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 500,
  "data": {}
}
```

---

### 2. Submit Exam
**POST** `/submit/:examId`

Submits an exam with student answers.

**URL Parameters:**
- `examId` (string, required): The ID of the exam being submitted

**Request Body:**
```json
{
  "answers": [
    {
      "question": {
        "questionId": "q1"
      },
      "submittedAnswer": "4"
    },
    {
      "question": {
        "questionId": "q2"
      },
      "submittedAnswer": "Answer text for open-ended question"
    }
  ]
}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional - currently uses hardcoded studentId)
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam submitted successfully",
  "statusCode": 200,
  "data": {
    "_id": "submission_id",
    "examId": "exam_id_1",
    "studentId": "301",
    "answers": [
      {
        "questionId": "q1",
        "submittedAnswer": "4"
      }
    ],
    "status": "pending_grading",
    "submittedAt": "2026-05-24T12:17:00.000Z",
    "createdAt": "2026-05-24T12:17:00.000Z",
    "updatedAt": "2026-05-24T12:17:00.000Z"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Exam already submitted" | "Invalid examId" | "Exam not published",
  "statusCode": 500,
  "data": {}
}
```

**Validations Performed:**
- Student ID must be valid
- Exam ID must exist and be valid
- Exam must be published
- Exam must be assigned to the student
- Exam cannot be submitted twice (unique constraint on examId + studentId)
- Current time must be between exam start and end time
  - Exam Start: `examDate + examTime`
  - Exam End: `examDate + examTime + duration (in minutes)`

---

### 3. Get Submission Results
**GET** `/result/:examId?studentId=<studentId>`

Retrieves the submission details and results for a specific exam and student.

**URL Parameters:**
- `examId` (string, required): The ID of the exam

**Query Parameters:**
- `studentId` (string, required): The ID of the student

**Headers:**
```
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Submission details fetched successfully",
  "statusCode": 200,
  "data": {
    "_id": "submission_id",
    "examId": "exam_id_1",
    "studentId": "101",
    "answers": [
      {
        "_id": "answer_id",
        "questionId": "q1",
        "submittedAnswer": "4"
      }
    ],
    "status": "pending_grading",
    "submittedAt": "2026-05-24T12:17:00.000Z",
    "createdAt": "2026-05-24T12:17:00.000Z",
    "updatedAt": "2026-05-24T12:17:00.000Z"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Submission not found" | "Invalid examId or studentId",
  "statusCode": 500,
  "data": {}
}
```

---

## Request/Response Formats

### Standard Response Structure

All API responses follow this structure:

```json
{
  "success": boolean,
  "message": "Human readable message",
  "statusCode": number,
  "data": {} | [] | null
}
```

### Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Database Schema

### SubmittedExam Collection

```javascript
{
  _id: ObjectId,
  examId: String (required),
  studentId: String (required),
  answers: [{
    questionId: String (required),
    submittedAnswer: String (required)
  }],
  status: String (enum: ['pending_grading', 'graded'], default: 'pending_grading'),
  submittedAt: Date (required),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Indexes
- **Unique Index**: `{ examId: 1, studentId: 1 }` - Prevents duplicate submissions
- **Performance Index**: `{ examId: 1, status: 1 }` - For fetching all submissions for an exam

---

## Error Handling

### Common Errors

| Error | Status | Cause |
|-------|--------|-------|
| "Exam already submitted" | 500 | Duplicate submission attempt |
| "Exam not published" | 500 | Exam status is not 'published' |
| "Exam not assigned to student" | 500 | Student doesn't have access to exam |
| "Submission not found" | 500 | No submission exists for given exam/student |
| "Invalid examId" | 500 | ExamId doesn't exist in database |

---

## Testing with Postman

### Import Postman Collection
A Postman collection file is available at:
```
server/src/modules/student-exam/postmanData.txt
```

### Manual Testing Examples

#### 1. Get All Exams
```
GET http://localhost:3000/api/v1/student-exam/
Content-Type: application/json
```

#### 2. Submit an Exam
```
POST http://localhost:3000/api/v1/student-exam/submit/exam_001
Content-Type: application/json

{
  "answers": [
    {
      "question": {
        "questionId": "q1"
      },
      "submittedAnswer": "4"
    },
    {
      "question": {
        "questionId": "q2"
      },
      "submittedAnswer": "Option B"
    },
    {
      "question": {
        "questionId": "q3"
      },
      "submittedAnswer": "The answer to this open-ended question is..."
    }
  ]
}
```

#### 3. Get Submission Results
```
GET http://localhost:3000/api/v1/student-exam/result/exam_001?studentId=101
Content-Type: application/json
```

---

## Authentication Notes

⚠️ **IMPORTANT**: Currently, student ID is hardcoded in the controller for testing:
- `getAllExams()`: Uses studentId `'101'`
- `submitExam()`: Uses studentId `'301'`
- `getExamDetails()`: Uses studentId `'101'`

**TODO**: Replace hardcoded IDs with JWT token extraction:
```javascript
// Current (testing):
const id = '301';

// Future (production):
const id = req.user.id; // extracted from JWT token
```

---

## Sample Data

The database is seeded with sample data via `seed.js`. Sample data includes:
- Multiple exams with different subjects
- Questions of various types (MCQ, open-ended)
- Student submissions with answers
- Different submission statuses (pending_grading, graded)

Run seed:
```bash
node seed.js
```

---

## Project Structure

```
student-exam/
├── app.js                          # Express app configuration
├── server.js                       # Server entry point
├── db.js                          # Database connection
├── seed.js                        # Sample data seeding
├── student-exam-model.js          # MongoDB schema
├── student-exam-repository.js     # Data access layer
├── student-exam-service.js        # Business logic
├── student-exam-controller.js     # Request handlers
├── student-exam-route.js          # Route definitions
├── student-exam-validator.js      # Input validation
├── package.json                   # Dependencies
└── API_README.md                  # This file
```

---

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Database Seeding**
   ```bash
   node seed.js
   ```

4. **Access API**
   - Base URL: `http://localhost:3000/api/v1/student-exam`
   - Use Postman or cURL for testing

---

## Troubleshooting

### Database Connection Issues
- Ensure MongoDB is running locally or connection string is correct
- Check `.env` file for correct `MONGODB_URI`

### Port Already in Use
```bash_URI`
- For MongoDB Atlas, verify IP whitelist includes your machine
- Test connection: `mongo "<MONGO_URI>"` or use MongoDB Compass
# Change PORT in .env file or:
lsof -i :3000  # Find process
kill -9 <PID>  # Kill process
```

### Exam Submission Not Working
- Verify exam ID is valid
- Check if current time is within exam window
- Ensure exam is published (status = 'published')
- Verify student has been assigned the exam

---

## Future Enhancements

- [ ] JWT authentication integration
- [ ] Auto-grading for MCQ questions
- [ ] Email notifications for exam submissions
- [ ] Exam analytics and reporting
- [ ] Real-time exam timer
- [ ] Question shuffling
- [ ] Partial submission recovery
- [ ] Proctoring features

---

## Support & Contact

For issues or questions, refer to the main project README or contact the development team.

---

**Last Updated**: May 31, 2026  
**Version**: 1.0.0
