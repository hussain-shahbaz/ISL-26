// Inter-service data access for the student-exam module.
//
// The exam-service is the source of truth for exams, questions and enrollment.
// We call it over HTTP with the shared service secret and forward the student's
// verified identity so the exam-service applies its student-scoped rules
// (published, started, enrolled, referenceAnswer stripped).

const axios = require('axios');

const EXAM_SERVICE_URL = process.env.EXAM_SERVICE_URL || 'http://localhost:3003';
const SERVICE_SECRET = process.env.SERVICE_SECRET || 'dev-service-secret';

function studentHeaders(studentId) {
  return {
    'x-service-secret': SERVICE_SECRET,
    'x-user-id': studentId,
    'x-user-role': 'student',
  };
}

function extractError(res, fallback) {
  if (res.data) {
    if (res.data.message) return res.data.message;
    if (Array.isArray(res.data.errors)) return res.data.errors.join(', ');
  }
  return fallback;
}

// Returns { exam, questions } for the student (referenceAnswer omitted).
// Throws if the exam is missing, not published, not started, or not assigned.
async function getExamForStudent(examId, studentId) {
  const res = await axios.get(`${EXAM_SERVICE_URL}/api/exam/question/${examId}`, {
    headers: studentHeaders(studentId),
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    throw new Error(extractError(res, `exam-service responded ${res.status}`));
  }
  return res.data.data;
}

// Returns the list of exams assigned to the student.
async function getStudentExams(studentId) {
  const res = await axios.get(`${EXAM_SERVICE_URL}/api/exam/student`, {
    headers: studentHeaders(studentId),
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    throw new Error(extractError(res, `exam-service responded ${res.status}`));
  }
  return res.data.data;
}

module.exports = { getExamForStudent, getStudentExams };
