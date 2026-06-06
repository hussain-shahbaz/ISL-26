import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  Lock,
} from 'lucide-react';
import { getStudentExamDetails, submitExam } from '@/features/exams/api';
import { useProctoring, type Violation } from '@/features/exams/useProctoring';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import { ErrorState } from '@/components/app/widgets';
import { Logo } from '@/components/brand/Logo';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { formatCountdown, cn } from '@/lib/utils';

const MAX_VIOLATIONS = 5;

export default function ExamRunnerPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const storageKey = `exampro.answers.${examId}`;

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const { data: exam, isLoading, isError, error } = useQuery({
    queryKey: ['student-exam-detail', examId],
    queryFn: () => getStudentExamDetails(examId),
    enabled: Boolean(examId),
    retry: false,
  });

  const questions = exam?.questions ?? [];

  const doSubmit = useCallback(
    async (reason?: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const payload = Object.entries(answers).map(([questionId, submittedAnswer]) => ({
          questionId,
          submittedAnswer,
        }));
        await submitExam(examId, payload);
        localStorage.removeItem(storageKey);
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        toast.success('Exam submitted', reason || 'Your answers were recorded securely.');
        navigate('/app/results', { replace: true });
      } catch (err) {
        submittedRef.current = false;
        toast.error('Submission failed', apiErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [answers, examId, navigate, storageKey],
  );

  const onViolation = useCallback((v: Violation) => {
    toast.warning('Integrity alert', v.label);
  }, []);

  const onLimitReached = useCallback(() => {
    toast.error('Too many violations', 'The exam is being submitted automatically.');
    void doSubmit('Auto-submitted after repeated integrity violations.');
  }, [doSubmit]);

  const { violations, count, requestFullscreen } = useProctoring({
    active: started && !submittedRef.current,
    maxViolations: MAX_VIOLATIONS,
    onViolation,
    onLimitReached,
  });

  // Secure countdown derived from the server-provided schedule.
  useEffect(() => {
    if (!started || !exam) return;
    const start = new Date(exam.scheduledTime).getTime();
    const end = start + exam.timeAllowed * 60 * 1000;
    const tick = () => {
      const remaining = Math.floor((end - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        void doSubmit('Time is up. Your answers were submitted automatically.');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started, exam, doSubmit]);

  // Persist answers for resilience against reloads.
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q._id]?.trim()).length,
    [questions, answers],
  );

  async function begin() {
    await requestFullscreen();
    setStarted(true);
  }

  if (isLoading) return <PageLoader />;
  if (isError || !exam) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <ErrorState message={apiErrorMessage(error, 'This exam is not available right now.')} />
          <Button className="mt-5" variant="outline" onClick={() => navigate('/app/exams')}>
            Back to exams
          </Button>
        </div>
      </div>
    );
  }

  // ---- Lobby ----
  if (!started) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 shadow-elev"
        >
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold">{exam.title || exam.subject}</h1>
          <p className="mt-1 text-muted">{exam.subject}</p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Questions', value: questions.length },
              { label: 'Minutes', value: exam.timeAllowed },
              { label: 'Marks', value: exam.totalMarks },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface-2/40 p-3">
                <p className="font-display text-xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-proctor/30 bg-[color-mix(in_oklab,var(--proctor)_8%,transparent)] p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert size={16} className="text-proctor" /> This is a proctored exam
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted">
              <li>• Stay in fullscreen. Leaving is recorded as a violation.</li>
              <li>• Switching tabs, copy/paste and right-click are monitored.</li>
              <li>• {MAX_VIOLATIONS} violations will auto-submit your exam.</li>
              <li>• The timer is enforced by the server and cannot be paused.</li>
            </ul>
          </div>

          <Button onClick={begin} size="lg" className="mt-6 w-full">
            <Maximize size={18} /> Begin proctored exam
          </Button>
        </motion.div>
      </div>
    );
  }

  const q = questions[current];
  const danger = count >= MAX_VIOLATIONS - 2;

  // ---- Active exam ----
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-integrity" />
          <span className="truncate text-sm font-medium">{exam.title || exam.subject}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={danger ? 'risk' : 'integrity'}>
            {danger ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
            {count}/{MAX_VIOLATIONS} alerts
          </Badge>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm tabular-nums',
              secondsLeft !== null && secondsLeft < 60
                ? 'border-risk/50 text-risk'
                : 'border-border text-foreground',
            )}
          >
            <Clock size={14} />
            {secondsLeft !== null ? formatCountdown(secondsLeft) : '--:--'}
          </span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_240px]">
        {/* Question */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={q?._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted">
                  Question {current + 1} of {questions.length}
                </span>
                <Badge tone="exam">{q?.marks} pts</Badge>
              </div>
              <p className="mt-4 text-lg leading-relaxed">{q?.questionText}</p>

              {q?.type === 'mcq' ? (
                <div className="mt-6 space-y-2.5">
                  {q.options?.map((opt) => {
                    const selected = answers[q._id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setAnswers((a) => ({ ...a, [q._id]: opt }))}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                          selected
                            ? 'border-brand bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]'
                            : 'border-border bg-surface-2/40 hover:border-[color-mix(in_oklab,var(--brand)_40%,var(--border))]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded-full border',
                            selected ? 'border-brand bg-brand' : 'border-muted',
                          )}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-[#04121a]" />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  className="mt-6 min-h-[180px]"
                  placeholder="Type your answer..."
                  value={answers[q?._id ?? ''] || ''}
                  onChange={(e) => q && setAnswers((a) => ({ ...a, [q._id]: e.target.value }))}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft size={16} /> Previous
            </Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={() => doSubmit()} disabled={submitting}>
                {submitting ? <Spinner /> : <Send size={16} />} Submit exam
              </Button>
            )}
          </div>
        </div>

        {/* Palette + monitor */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Progress</p>
            <p className="mt-1 text-sm font-medium">
              {answeredCount}/{questions.length} answered
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {questions.map((qq, i) => (
                <button
                  key={qq._id}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'grid aspect-square place-items-center rounded-lg border text-xs font-medium transition-colors',
                    i === current
                      ? 'border-brand bg-brand text-[#04121a]'
                      : answers[qq._id]?.trim()
                        ? 'border-integrity/50 bg-[color-mix(in_oklab,var(--integrity)_14%,transparent)] text-integrity'
                        : 'border-border text-muted hover:bg-surface-2',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
              <Eye size={13} /> Proctor log
            </p>
            {violations.length === 0 ? (
              <p className="mt-3 text-sm text-integrity">No violations detected.</p>
            ) : (
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-auto text-xs">
                {violations.slice().reverse().map((v, i) => (
                  <li key={i} className="flex items-center gap-2 text-risk">
                    <ShieldAlert size={12} className="shrink-0" />
                    {v.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={requestFullscreen}>
            <Maximize size={15} /> Re-enter fullscreen
          </Button>
        </aside>
      </div>
    </div>
  );
}
