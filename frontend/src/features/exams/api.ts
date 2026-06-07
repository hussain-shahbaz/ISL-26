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
