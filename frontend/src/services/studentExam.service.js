/**
 * Student Exam Service Layer
 *
 * All API calls for the student-exam module go through here.
 * Currently uses mock data for standalone testing.
 * When the backend is ready, swap mockApi with real api calls.
 */
import api from './api.js';
// import { mockApi } from './mock/studentExamMock.js';
const apiSecret = import.meta.env.VITE_SERVICE_SECRET;

// const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api/v1/student-exam';
const USE_MOCK = false; // flip to false when backend is running

/**
 * Get all exams assigned to the current student
 */
export async function getAllExams() {
  // if (USE_MOCK) return mockApi.getAllExams();
  // console.log("!!! FUNCTION CALLED !!!");
  console.log(`api scrt: ${import.meta.env.VITE_SERVICE_SECRET}`)
  console.log(`vite url: ${import.meta.env.VITE_API_URL}`)
  const res = await api.get(`/`);

  return res.data;
}

/**
 * Get full exam details with questions (for exam-taking)
 */
export async function getExamDetails(examId, currentTimeRaw) {
  // if (USE_MOCK) return mockApi.getExamDetails(examId);
  const res = await api.get(`/${examId}`, {
    params: {
      currentTimeRaw: currentTimeRaw
    }
  });
  return res.data;
}

/**
 * Submit exam answers
 * @param {string} examId
 * @param {Array<{question: {questionId: string}, submittedAnswer: string}>} answers
 */
export async function submitExam(examId, answers, submissionTimeRaw) {
  // if (USE_MOCK) return mockApi.submitExam(examId, answers);
  const res = await api.post(`/submit/${examId}`, {
    answers,
    params: {
      submissionTimeRaw: submissionTimeRaw
    }
  });
  return res.data;
}

/**
 * Get submission result for a specific exam
 */
export async function getSubmissionResult(examId, studentId) {
  // if (USE_MOCK) return mockApi.getSubmissionResult(examId, studentId);
  const res = await api.get(`${API_BASE}/student-exam/result/${examId}`, {
    params: { studentId },
  });
  return res.data;
}
