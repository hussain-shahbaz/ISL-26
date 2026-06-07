import type { Exam } from '@/types';

export type StudentExamState = 'upcoming' | 'open' | 'submitted' | 'closed' | 'unavailable';

export interface ExamWindow {
  start: number;
  end: number;
  started: boolean;
  ended: boolean;
}

/** The exam's time window, derived from scheduledTime + timeAllowed (minutes). */
export function examWindow(exam: Pick<Exam, 'scheduledTime' | 'timeAllowed'>): ExamWindow {
  const start = new Date(exam.scheduledTime).getTime();
  const end = start + exam.timeAllowed * 60 * 1000;
  const now = Date.now();
  return { start, end, started: now >= start, ended: now > end };
}

/**
 * What a student can actually do with an exam right now. This is the single
 * source of truth the UI uses to decide whether to show "Enter exam":
 *  - submitted  → already taken (never re-enterable)
 *  - upcoming   → window hasn't opened yet
 *  - open       → live and enterable
 *  - closed     → window passed without (or after) submission
 *  - unavailable→ not published to this student
 */
export function studentExamState(exam: Exam): StudentExamState {
  if (exam.submitted) return 'submitted';
  if (exam.status !== 'published') return 'unavailable';
  const { started, ended } = examWindow(exam);
  if (!started) return 'upcoming';
  if (ended) return 'closed';
  return 'open';
}

export const STUDENT_STATE_LABEL: Record<StudentExamState, string> = {
  upcoming: 'Not started',
  open: 'Open now',
  submitted: 'Submitted',
  closed: 'Closed',
  unavailable: 'Unavailable',
};

export const STUDENT_STATE_TONE: Record<
  StudentExamState,
  'neutral' | 'exam' | 'integrity' | 'proctor' | 'risk'
> = {
  upcoming: 'exam',
  open: 'integrity',
  submitted: 'proctor',
  closed: 'risk',
  unavailable: 'neutral',
};
