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

export async function submitExam(examId: string, answers: SubmissionAnswer[]) {
  const payload = {
    answers: answers.map((a) => ({
      question: { questionId: a.questionId },
      submittedAnswer: a.submittedAnswer,
    })),
  };
  const res = await api.post(`${MODULES}/student-exam/submit/${examId}`, payload);
  return res.data;
}

export async function getSubmission(examId: string, studentId?: string) {
  const res = await api.get(`${MODULES}/student-exam/result/${examId}`, {
    params: studentId ? { studentId } : undefined,
  });
  return unwrap(res.data);
}
