import api from './api';

// Exam APIs
export const getAllExams = (subject) =>
  api.get('/exam', { params: subject ? { subject } : {} });

export const getExamById = (id) =>
  api.get(`/exam/${id}`);

export const createExam = (data) =>
  api.post('/exam', data);

export const updateExam = (id, data) =>
  api.patch(`/exam/${id}`, data);

export const updateExamStatus = (id, status) =>
  api.patch(`/exam/${id}/status`, { status });

export const deleteExam = (id) =>
  api.delete(`/exam/${id}`);

// Question APIs
export const getQuestionsByExam = (examId) =>
  api.get(`/exam/question/${examId}`);

export const createQuestion = (examId, data) =>
  api.post(`/exam/question/${examId}`, data);

export const updateQuestion = (id, data) =>
  api.patch(`/exam/question/${id}`, data);

export const deleteQuestion = (id) =>
  api.delete(`/exam/question/${id}`);