import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  Clock3,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { getExam, getMyResult } from '@/features/exams/api';
import { Skeleton, ErrorState, EmptyState } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Question } from '@/types';

// Human descriptions for the student's own integrity timeline.
const VIOLATION_DESCRIPTIONS: Record<string, string> = {
  'tab-hidden': 'Switched away from the exam tab',
  'focus-lost': 'Exam window lost focus',
  'fullscreen-exit': 'Left fullscreen mode',
  clipboard: 'Copied or pasted',
  'context-menu': 'Opened the right-click menu',
  'devtools-keys': 'Pressed a blocked developer shortcut',
};
const vDesc = (t: string) => VIOLATION_DESCRIPTIONS[t] ?? t;

function scoreTone(pct: number): 'integrity' | 'proctor' | 'risk' {
  if (pct >= 60) return 'integrity';
  if (pct >= 40) return 'proctor';
  return 'risk';
}

export default function StudentResultPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const examQ = useQuery({ queryKey: ['exam', id], queryFn: () => getExam(id), enabled: Boolean(id) });
  const resultQ = useQuery({
    queryKey: ['my-result', id],
    queryFn: () => getMyResult(id),
    enabled: Boolean(id),
  });

  if (examQ.isLoading || resultQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (resultQ.isError) return <ErrorState message="Could not load your result." />;

  const data = resultQ.data;
  const exam = examQ.data;

  const back = (
    <button
      onClick={() => navigate('/app/results')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft size={15} /> Back to results
    </button>
  );

  if (!data) {
    return (
      <div>
        {back}
        <EmptyState
          title="No submission found"
          description="We couldn't find a submission from you for this exam."
          icon={Award}
        />
      </div>
    );
  }

  const graded = data.status === 'graded' && data.result;
  const result = data.result;
  const pct = result ? Math.round(result.percentage) : 0;

  const answerByQ = new Map((data.answers ?? []).map((a) => [a.questionId, a.submittedAnswer]));
  const resultByQ = new Map((result?.results ?? []).map((r) => [r.questionId, r]));

  // Prefer the exam's question order; fall back to the submitted answers.
  const orderedQuestions: Question[] =
    data.questions && data.questions.length > 0
      ? data.questions
      : (data.answers ?? []).map((a) => ({
          _id: a.questionId,
          type: 'text' as const,
          marks: 0,
          questionText: `Question ${a.questionId.slice(0, 8)}`,
        }));

  const violations = (data.violations ?? [])
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div>
      {back}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{exam?.title || exam?.subject || 'Exam result'}</h1>
          {exam?.subject && <p className="text-sm text-muted">{exam.subject}</p>}
          <p className="mt-1 text-xs text-muted">
            Submitted {formatDate(data.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <Badge tone={graded ? 'integrity' : 'proctor'}>
          {graded ? 'Graded' : 'Awaiting grading'}
        </Badge>
      </div>

      {/* Score summary */}
      <Card className={graded ? 'border-brand/30' : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          {graded && result ? (
            <>
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface-2">
                  <Award size={24} className="text-brand" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Your score</p>
                  <p className="text-2xl font-semibold">
                    {result.totalScore}
                    <span className="text-base font-normal text-muted"> / {result.totalMarks}</span>
                  </p>
                </div>
              </div>
              <Badge tone={scoreTone(pct)} className="text-base">
                {pct}%
              </Badge>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Clock3 size={22} className="text-proctor" />
              <div>
                <p className="font-medium">Your answers were recorded</p>
                <p className="text-sm text-muted">
                  Grades and feedback appear here once your teacher releases them.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-question breakdown */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Your answers</h2>
        <div className="space-y-3">
          {orderedQuestions.map((q, i) => {
            const ans = answerByQ.get(q._id);
            const qr = resultByQ.get(q._id);
            return (
              <Card key={q._id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      <span className="text-muted">Q{i + 1}.</span> {q.questionText}
                    </p>
                    {qr ? (
                      <Badge tone={qr.isCorrect ? 'integrity' : qr.score > 0 ? 'proctor' : 'risk'}>
                        {qr.score}/{qr.maxMarks}
                      </Badge>
                    ) : (
                      <Badge tone="exam">{q.marks} pts</Badge>
                    )}
                  </div>
                  <p className="mt-2 rounded-lg bg-surface-2/40 px-3 py-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-muted">Your answer: </span>
                    {ans ? ans : <span className="italic text-muted">No answer</span>}
                  </p>
                  {qr?.feedback && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                      {qr.isCorrect ? (
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-integrity" />
                      ) : (
                        <XCircle size={14} className="mt-0.5 shrink-0 text-proctor" />
                      )}
                      {qr.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* The student's own integrity timeline */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Integrity summary</h2>
        {violations.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-integrity">
            <ShieldCheck size={16} /> No integrity alerts were recorded during your exam.
          </p>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                <ShieldAlert size={15} className="text-proctor" />
                {violations.length} integrity alert{violations.length > 1 ? 's' : ''} were recorded.
              </p>
              <ul className="space-y-1.5">
                {violations.map((v, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{vDesc(v.type)}</span>
                    <span className="font-mono text-xs text-muted">
                      {formatDate(v.at, { timeStyle: 'medium' })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
