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
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { getExam, updateExamStatus, deleteExam } from '@/features/exams/api';
import { ProctorReport } from '@/features/exams/ProctorReport';
import { studentExamState, STUDENT_STATE_LABEL, STUDENT_STATE_TONE } from '@/features/exams/status';
import { PageHeader, ErrorState, Skeleton } from '@/components/app/widgets';
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

  const studentState = !isTeacher ? studentExamState(exam) : null;

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
          ) : studentState === 'open' ? (
            <Button onClick={() => navigate(`/app/exam/${exam._id}/take`)}>
              <Play size={16} /> Enter exam
            </Button>
          ) : studentState === 'submitted' ? (
            <Button variant="outline" onClick={() => navigate(`/app/results/${exam._id}`)}>
              <CheckCircle2 size={16} /> View result
            </Button>
          ) : (
            <Badge tone={STUDENT_STATE_TONE[studentState ?? 'unavailable']}>
              {STUDENT_STATE_LABEL[studentState ?? 'unavailable']}
            </Badge>
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

      {!isTeacher && studentState === 'open' && (
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

      {!isTeacher && studentState === 'submitted' && (
        <Card className="mt-6 border-integrity/30">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-integrity" />
              <div>
                <p className="font-medium">You've submitted this exam</p>
                <p className="text-sm text-muted">
                  {exam.submittedAt
                    ? `Submitted on ${formatDate(exam.submittedAt)}. Grades appear once your teacher releases them.`
                    : 'Your answers were recorded. Grades appear once your teacher releases them.'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(`/app/results/${exam._id}`)}>
              View result
            </Button>
          </CardContent>
        </Card>
      )}

      {!isTeacher && (studentState === 'closed' || studentState === 'upcoming') && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-3 p-6">
            {studentState === 'closed' ? (
              <Lock size={22} className="text-risk" />
            ) : (
              <Clock size={22} className="text-exam" />
            )}
            <div>
              <p className="font-medium">
                {studentState === 'closed' ? 'This exam has closed' : 'This exam has not opened yet'}
              </p>
              <p className="text-sm text-muted">
                {studentState === 'closed'
                  ? 'The submission window has ended. You can no longer enter this exam.'
                  : `The exam opens at ${formatDate(exam.scheduledTime)}.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isTeacher && <ProctorReport exam={exam} />}

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

