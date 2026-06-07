import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Clock,
  Trophy,
  Users,
  Send,
  Trash2,
  Play,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import {
  getExam,
  updateExamStatus,
  deleteExam,
  getExamSubmissions,
  type Submission,
} from '@/features/exams/api';
import { PageHeader, ErrorState, Skeleton, EmptyState } from '@/components/app/widgets';
import { ExamStatusBadge } from '@/features/exams/components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ExamDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'teacher';

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => getExam(id),
    enabled: Boolean(id),
  });

  const publish = useMutation({
    mutationFn: () => updateExamStatus(id, 'published'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      qc.invalidateQueries({ queryKey: ['teacher-exams'] });
      toast.success('Exam published', 'Assigned students can now take it.');
    },
    onError: (err) => toast.error('Publish failed', apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => deleteExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-exams'] });
      toast.success('Exam deleted');
      navigate('/app/exams');
    },
    onError: (err) => toast.error('Delete failed', apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !exam) return <ErrorState />;

  const meta = [
    { icon: CalendarClock, label: 'Scheduled', value: exam.scheduledTime ? formatDate(exam.scheduledTime) : 'TBA' },
    { icon: Clock, label: 'Duration', value: `${exam.timeAllowed} min` },
    { icon: Trophy, label: 'Total marks', value: `${exam.totalMarks}` },
    { icon: Users, label: 'Students', value: `${exam.students?.length ?? 0}` },
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/app/exams')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to exams
      </button>

      <PageHeader
        title={exam.title || exam.subject}
        description={exam.subject}
        action={
          isTeacher ? (
            <div className="flex gap-2">
              {exam.status === 'draft' && (
                <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                  <Send size={16} /> Publish
                </Button>
              )}
              {(exam.status === 'draft' || exam.status === 'published') && (
                <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
                  <Trash2 size={16} /> Delete
                </Button>
              )}
            </div>
          ) : exam.status === 'published' ? (
            <Button onClick={() => navigate(`/app/exam/${exam._id}/take`)}>
              <Play size={16} /> Enter exam
            </Button>
          ) : (
            <ExamStatusBadge status={exam.status} />
          )
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <ExamStatusBadge status={exam.status} />
        {exam.teacherName && <span className="text-sm text-muted">by {exam.teacherName}</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {meta.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2">
                <m.icon size={18} className="text-brand" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{m.label}</p>
                <p className="font-medium">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isTeacher && exam.status === 'published' && (
        <Card className="mt-6 border-brand/30">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="text-integrity" />
              <div>
                <p className="font-medium">Proctored session</p>
                <p className="text-sm text-muted">
                  Entering will request fullscreen and begin monitoring integrity signals.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(`/app/exam/${exam._id}/take`)}>
              <Play size={16} /> Start now
            </Button>
          </CardContent>
        </Card>
      )}

      {isTeacher && <ProctorReport examId={id} />}

      {isTeacher && exam.questions && exam.questions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Questions ({exam.questions.length})</h2>
          <div className="space-y-3" data-section="questions">
            {exam.questions.map((q, i) => (
              <Card key={q._id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-muted">Q{i + 1}</span>
                      <p className="mt-1 font-medium">{q.questionText}</p>
                    </div>
                    <Badge tone="exam">{q.marks} pts</Badge>
                  </div>
                  {q.type === 'mcq' && q.options && (
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <li key={oi} className="rounded-lg border border-border bg-surface-2/40 px-3 py-1.5 text-sm text-muted">
                          {opt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.referenceAnswer && (
                    <p className="mt-3 rounded-lg bg-surface-2/50 px-3 py-2 text-xs text-muted">
                      <span className="font-medium text-foreground">Reference:</span> {q.referenceAnswer}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const VIOLATION_LABELS: Record<string, string> = {
  'tab-hidden': 'Tab switch',
  'focus-lost': 'Focus lost',
  'fullscreen-exit': 'Fullscreen exit',
  clipboard: 'Copy / paste',
  'context-menu': 'Right-click',
  'devtools-keys': 'Shortcut',
};

function riskTone(count: number): 'integrity' | 'proctor' | 'risk' {
  if (count === 0) return 'integrity';
  if (count <= 2) return 'proctor';
  return 'risk';
}

function ProctorReport({ examId }: { examId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-submissions', examId],
    queryFn: () => getExamSubmissions(examId),
    enabled: Boolean(examId),
  });

  const submissions: Submission[] = data ?? [];
  const totalViolations = submissions.reduce((acc, s) => acc + (s.violationCount ?? 0), 0);
  const flagged = submissions.filter((s) => (s.violationCount ?? 0) > 0).length;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Eye size={18} className="text-brand" /> Proctor report
        </h2>
        {submissions.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="exam">{submissions.length} submitted</Badge>
            <Badge tone={flagged ? 'risk' : 'integrity'}>{flagged} flagged</Badge>
            <Badge tone={totalViolations ? 'proctor' : 'integrity'}>{totalViolations} violations</Badge>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <ErrorState message="Could not load submissions." />
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Integrity telemetry appears here as students submit."
          icon={ShieldCheck}
        />
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => {
            const count = s.violationCount ?? 0;
            const breakdown = (s.violations ?? []).reduce<Record<string, number>>((acc, v) => {
              acc[v.type] = (acc[v.type] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <Card key={s._id}>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <span className={count > 2 ? 'text-risk' : count > 0 ? 'text-proctor' : 'text-integrity'}>
                    {count > 0 ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground" title={s.studentId}>
                      {s.studentId}
                    </p>
                    <p className="text-xs text-muted">
                      Submitted {formatDate(s.submittedAt)} · {s.status === 'graded' ? 'Graded' : 'Pending grading'}
                    </p>
                  </div>
                  {Object.keys(breakdown).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(breakdown).map(([type, n]) => (
                        <span
                          key={type}
                          className="rounded-md border border-border bg-surface-2/50 px-2 py-0.5 text-[11px] text-muted"
                        >
                          {VIOLATION_LABELS[type] ?? type} ×{n}
                        </span>
                      ))}
                    </div>
                  )}
                  <Badge tone={riskTone(count)}>{count} alerts</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
