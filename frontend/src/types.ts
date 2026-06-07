export type Role = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  userId: string;
  name?: string;
  email: string;
  role: Role;
}

export type ExamStatus = 'draft' | 'published' | 'submitted' | 'checked';

export interface Question {
  _id: string;
  type: 'mcq' | 'text';
  marks: number;
  questionText: string;
  options?: string[];
  referenceAnswer?: string;
}

export interface Exam {
  _id: string;
  title?: string;
  subject: string;
  teacherName?: string;
  instructorId?: string;
  scheduledTime: string;
  timeAllowed: number;
  totalMarks: number;
  students?: string[];
  status: ExamStatus;
  questions?: Question[];
  // Per-student submission state (only present on the student exam list).
  submitted?: boolean;
  submittedAt?: string | null;
}

export interface SubmissionAnswer {
  questionId: string;
  submittedAnswer: string;
}

export interface ApiEnvelope<T> {
  status?: 'success' | 'error';
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  error_code?: number;
}
