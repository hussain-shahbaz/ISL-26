import axios from 'axios';
import { api, unwrap } from '@/lib/api';
import type { Exam, SubmissionAnswer } from '@/types';

const MODULES = '/modules';

// Teacher: exams authored by the signed-in instructor.
export async function listTeacherExams(subject?: string): Promise<Exam[]> {
  const res = await api.get(`${MODULES}/exam`, { params: subject ? { subject } : undefined });
  return unwrap<Exam[]>(res.data) ?? [];
}

export async function getExam(id: string): Promise<Exam> {
  const res = await api.get(`${MODULES}/exam/${id}`);
  return unwrap<Exam>(res.data);
}

export interface CreateExamPayload {
  subject: string;
  title?: string;
  scheduledTime: string;
  timeAllowed: number;
  totalMarks: number;
  students: string[];
  questions: {
    type: 'mcq' | 'text';
    marks: number;
    questionText: string;
    options?: string[];
    referenceAnswer?: string;
  }[];
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
  const res = await api.post(`${MODULES}/exam`, payload);
  return unwrap<Exam>(res.data);
}

export async function updateExamStatus(id: string, status: Exam['status']): Promise<Exam> {
  const res = await api.patch(`${MODULES}/exam/${id}/status`, { status });
  return unwrap<Exam>(res.data);
}

export async function deleteExam(id: string): Promise<void> {
  await api.delete(`${MODULES}/exam/${id}`);
}

// Student: exams assigned to the signed-in student.
export async function listStudentExams(): Promise<Exam[]> {
  const res = await api.get(`${MODULES}/student-exam`);
  return unwrap<Exam[]>(res.data) ?? [];
}

export async function getStudentExamDetails(examId: string): Promise<Exam & { questions: Exam['questions'] }> {
  const res = await api.get(`${MODULES}/exam/question/${examId}`);
  const data = unwrap<{ exam: Exam; questions: Exam['questions'] }>(res.data);
  return { ...data.exam, questions: data.questions };
}

export interface SubmittedViolation {
  type: string;
  at: number | string;
}

export async function submitExam(
  examId: string,
  answers: SubmissionAnswer[],
  violations: SubmittedViolation[] = [],
) {
  const payload = {
    answers: answers.map((a) => ({
      questionId: a.questionId,
      submittedAnswer: a.submittedAnswer,
    })),
    violations: violations.map((v) => ({ type: v.type, at: v.at })),
  };
  const res = await api.post(`${MODULES}/student-exam/submit/${examId}`, payload);
  return res.data;
}

export interface Submission {
  _id: string;
  examId: string;
  studentId: string;
  status: 'pending_grading' | 'graded';
  submittedAt: string;
  violationCount?: number;
  violations?: { type: string; at: string }[];
  answers?: { questionId: string; submittedAnswer: string }[];
}

// Student: own submission. Teacher/admin (no studentId): all submissions.
export async function getSubmission(examId: string, studentId?: string): Promise<Submission | null> {
  const res = await api.get(`${MODULES}/student-exam/result/${examId}`, {
    params: studentId ? { studentId } : undefined,
  });
  return unwrap<Submission | null>(res.data);
}

export interface StudentLite {
  id: string;
  name: string;
  email: string;
}

// Teacher/admin: search students for enrollment (by name or email).
export async function searchStudents(search: string): Promise<StudentLite[]> {
  const res = await api.get(`${MODULES}/user/students/search`, {
    params: { search, limit: 25 },
  });
  return unwrap<{ users: StudentLite[] }>(res.data)?.users ?? [];
}

// Teacher/admin: resolve pasted emails to canonical student IDs.
export async function resolveStudentEmails(
  emails: string[],
): Promise<{ matched: StudentLite[]; unmatched: string[] }> {
  const res = await api.post(`${MODULES}/user/students/resolve`, { emails });
  return unwrap<{ matched: StudentLite[]; unmatched: string[] }>(res.data) ?? { matched: [], unmatched: [] };
}

export async function getExamSubmissions(examId: string): Promise<Submission[]> {
  const res = await api.get(`${MODULES}/student-exam/result/${examId}`);
  const data = unwrap<Submission[] | Submission | null>(res.data);
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export interface StudentIdentity {
  id: string;
  name: string;
  email: string;
  rollNo?: string | null;
  department?: string | null;
}

// Teacher/admin: turn a list of student IDs (e.g. from a proctor report) into
// human identities so the UI never has to render raw UUIDs.
export async function resolveStudentsByIds(ids: string[]): Promise<StudentIdentity[]> {
  if (ids.length === 0) return [];
  const res = await api.post(`${MODULES}/user/students/resolve-ids`, { ids });
  return unwrap<{ students: StudentIdentity[] }>(res.data)?.students ?? [];
}

// ---- Grading (grade-cheat service) ----

export type GradingMode = 'strict' | 'medium' | 'lenient';

export interface QuestionResult {
  questionId: string;
  score: number;
  maxMarks: number;
  isCorrect?: boolean;
  feedback?: string;
  reasoning?: string;
  cheatingScore?: number;
  cheatingFlag?: boolean;
}

export interface StudentResult {
  examId: string;
  studentId: string;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  gradingMode?: string;
  gradedAt?: string;
  results: QuestionResult[];
}

export interface GradingProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: { completed?: number; total?: number };
  elapsed?: number;
  error?: string;
}

// Returns stored per-student results, or [] if the exam hasn't been graded yet
// (the service answers 404 in that case — not an error for our purposes).
export async function getGradingResults(examId: string): Promise<StudentResult[]> {
  try {
    const res = await api.get(`${MODULES}/grade-cheat/results`, { params: { examId } });
    return unwrap<{ results: StudentResult[] }>(res.data)?.results ?? [];
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    throw err;
  }
}

export interface StartGradingResult {
  taskId?: string;
  alreadyGraded?: boolean;
  alreadyRunning?: boolean;
}

// Kick off grading. Treats "already graded" (409) as a non-error so the caller
// can simply refetch results.
export async function startGrading(
  examId: string,
  mode: GradingMode = 'medium',
): Promise<StartGradingResult> {
  try {
    const res = await api.post(`${MODULES}/grade-cheat/grade/async`, null, {
      params: { examId, mode },
    });
    const data = res.data as { taskId?: string };
    return { taskId: data?.taskId };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const data = err.response.data as { taskId?: string; error?: string };
      const running = /running/i.test(data?.error || '');
      return { taskId: data?.taskId, alreadyGraded: !running, alreadyRunning: running };
    }
    throw err;
  }
}

export async function getGradingProgress(taskId: string): Promise<GradingProgress> {
  const res = await api.get(`${MODULES}/grade-cheat/grade/progress`, { params: { taskId } });
  return res.data as GradingProgress;
}

export interface ExamAnalytics {
  averageScore?: number;
  averagePercentage?: number;
  highestScore?: number;
  lowestScore?: number;
  totalStudents?: number;
  flaggedCount?: number;
}

export async function getExamAnalytics(examId: string): Promise<ExamAnalytics | null> {
  try {
    const res = await api.get(`${MODULES}/grade-cheat/analytics`, { params: { examId } });
    return unwrap<ExamAnalytics>(res.data) ?? null;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}
