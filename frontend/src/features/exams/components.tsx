import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, Trophy, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Exam, ExamStatus } from '@/types';
import { studentExamState, STUDENT_STATE_LABEL, STUDENT_STATE_TONE } from './status';

const statusTone: Record<ExamStatus, 'neutral' | 'exam' | 'integrity' | 'proctor'> = {
  draft: 'neutral',
  published: 'exam',
  submitted: 'proctor',
  checked: 'integrity',
};

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  return (
    <Badge tone={statusTone[status]} className="capitalize">
      {status}
    </Badge>
  );
}

// CTA wording per student state, so the card never invites a student into an
// exam they've already submitted or that has closed.
const STUDENT_CTA: Record<ReturnType<typeof studentExamState>, string> = {
  open: 'Enter exam',
  submitted: 'View result',
  upcoming: 'View details',
  closed: 'View details',
  unavailable: 'View details',
};

export function ExamCard({
  exam,
  to,
  delay = 0,
  cta = 'View',
  studentView = false,
}: {
  exam: Exam;
  to: string;
  delay?: number;
  cta?: string;
  studentView?: boolean;
}) {
  const state = studentView ? studentExamState(exam) : null;
  const resolvedCta = state ? STUDENT_CTA[state] : cta;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={to}
        className="group block h-full rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand)_40%,var(--border))] hover:shadow-elev"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{exam.title || exam.subject}</h3>
            <p className="truncate text-sm text-muted">{exam.subject}</p>
          </div>
          {state ? (
            <Badge tone={STUDENT_STATE_TONE[state]} className="shrink-0">
              {STUDENT_STATE_LABEL[state]}
            </Badge>
          ) : (
            <ExamStatusBadge status={exam.status} />
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={14} />
            {exam.scheduledTime ? formatDate(exam.scheduledTime, { dateStyle: 'short', timeStyle: undefined }) : 'TBA'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {exam.timeAllowed} min
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy size={14} />
            {exam.totalMarks} pts
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">{exam.teacherName || 'Instructor'}</span>
          <span className="inline-flex items-center gap-1 font-medium text-brand">
            {resolvedCta}
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
