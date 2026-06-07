import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  ShieldCheck,
  ShieldAlert,
  Download,
  Sparkles,
  FileText,
  Loader2,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  getExamSubmissions,
  resolveStudentsByIds,
  getGradingResults,
  startGrading,
  getGradingProgress,
  type Submission,
  type StudentIdentity,
  type StudentResult,
  type QuestionResult,
} from './api';
import { examWindow } from './status';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton, EmptyState, ErrorState } from '@/components/app/widgets';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, initialsOf, cn } from '@/lib/utils';
import type { Exam, Question } from '@/types';

// Short chip labels and longer human descriptions for proctoring events, so the
// report reads like prose instead of raw event keys.
const VIOLATION_LABELS: Record<string, string> = {
  'tab-hidden': 'Tab switch',
  'focus-lost': 'Focus lost',
  'fullscreen-exit': 'Fullscreen exit',
  clipboard: 'Copy / paste',
  'context-menu': 'Right-click',
  'devtools-keys': 'Shortcut',
};
const VIOLATION_DESCRIPTIONS: Record<string, string> = {
  'tab-hidden': 'Switched away from the exam tab',
  'focus-lost': 'Exam window lost focus',
  'fullscreen-exit': 'Left fullscreen mode',
  clipboard: 'Attempted to copy or paste',
  'context-menu': 'Opened the right-click menu',
  'devtools-keys': 'Pressed a blocked developer shortcut',
};
const vLabel = (t: string) => VIOLATION_LABELS[t] ?? t;
const vDesc = (t: string) => VIOLATION_DESCRIPTIONS[t] ?? t;

function riskTone(count: number): 'integrity' | 'proctor' | 'risk' {
  if (count === 0) return 'integrity';
  if (count <= 2) return 'proctor';
  return 'risk';
}

function scoreTone(pct: number): 'integrity' | 'proctor' | 'risk' {
  if (pct >= 60) return 'integrity';
  if (pct >= 40) return 'proctor';
  return 'risk';
}

// A row in the report: the raw submission joined with the resolved identity and
// (when available) the grading result.
interface Row {
  submission: Submission;
  identity?: StudentIdentity;
  result?: StudentResult;
}

function displayName(row: Row): string {
  return row.identity?.name || `Student ${row.submission.studentId.slice(0, 8)}`;
}

export function ProctorReport({ exam }: { exam: Exam }) {
  const examId = exam._id;

  const submissionsQ = useQuery({
    queryKey: ['exam-submissions', examId],
    queryFn: () => getExamSubmissions(examId),
    enabled: Boolean(examId),
  });
  const submissions = useMemo(() => submissionsQ.data ?? [], [submissionsQ.data]);

  const studentIds = useMemo(
    () => [...new Set(submissions.map((s) => s.studentId))],
    [submissions],
  );

  const identitiesQ = useQuery({
    queryKey: ['students-resolve', examId, studentIds],
    queryFn: () => resolveStudentsByIds(studentIds),
    enabled: studentIds.length > 0,
  });

  const resultsQ = useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => getGradingResults(examId),
    enabled: Boolean(examId),
  });

  const identityById = useMemo(
    () => new Map((identitiesQ.data ?? []).map((s) => [s.id, s])),
    [identitiesQ.data],
  );
  const resultByStudent = useMemo(
    () => new Map((resultsQ.data ?? []).map((r) => [r.studentId, r])),
    [resultsQ.data],
  );

  const rows: Row[] = useMemo(
    () =>
      submissions.map((s) => ({
        submission: s,
        identity: identityById.get(s.studentId),
        result: resultByStudent.get(s.studentId),
      })),
    [submissions, identityById, resultByStudent],
  );

  const [taskId, setTaskId] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const autoRef = useRef(false);
  const [active, setActive] = useState<Row | null>(null);

  const graded = (resultsQ.data ?? []).length > 0;
  const win = examWindow(exam);

  async function runGrading(auto = false) {
    if (grading) return;
    setGrading(true);
    try {
      const r = await startGrading(examId, 'medium');
      if (r.alreadyGraded) {
        await resultsQ.refetch();
        setGrading(false);
        if (!auto) toast.success('Already graded', 'Showing the latest scores.');
        return;
      }
      if (r.taskId) {
        setTaskId(r.taskId);
        if (!auto) toast.success('Grading started', 'Scoring answers and checking for plagiarism…');
      } else {
        setGrading(false);
      }
    } catch (err) {
      setGrading(false);
      if (!auto) toast.error('Could not start grading', apiErrorMessage(err));
    }
  }

  // Poll the grading task until it finishes, then refresh results.
  useEffect(() => {
    if (!taskId) return;
    let live = true;
    const id = setInterval(async () => {
      try {
        const p = await getGradingProgress(taskId);
        if (!live) return;
        if (p.status === 'completed') {
          clearInterval(id);
          setTaskId(null);
          setGrading(false);
          await Promise.all([resultsQ.refetch(), submissionsQ.refetch()]);
          toast.success('Grading complete', 'Scores and feedback are ready.');
        } else if (p.status === 'failed') {
          clearInterval(id);
          setTaskId(null);
          setGrading(false);
          toast.error('Grading failed', p.error || 'Please try again.');
        }
      } catch {
        /* transient — keep polling */
      }
    }, 2500);
    return () => {
      live = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Auto-grade once the window has closed and submissions exist but aren't graded.
  useEffect(() => {
    if (autoRef.current) return;
    if (submissionsQ.isLoading || resultsQ.isLoading) return;
    if (submissions.length > 0 && !graded && win.ended && !grading) {
      autoRef.current = true;
      void runGrading(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionsQ.isLoading, resultsQ.isLoading, submissions.length, graded, win.ended]);

  const totalViolations = submissions.reduce((acc, s) => acc + (s.violationCount ?? 0), 0);
  const flagged = submissions.filter((s) => (s.violationCount ?? 0) > 0).length;
  const gradedCount = rows.filter((r) => r.result).length;
  const avgPct =
    gradedCount > 0
      ? Math.round(
          rows.reduce((acc, r) => acc + (r.result?.percentage ?? 0), 0) / gradedCount,
        )
      : null;

  function exportCsv() {
    const header = [
      'Student',
      'Email',
      'Roll No',
      'Submitted At',
      'Status',
      'Score',
      'Total',
      'Percentage',
      'Violations',
      'Violation breakdown',
    ];
    const body = rows.map((r) => {
      const breakdown = (r.submission.violations ?? []).reduce<Record<string, number>>((acc, v) => {
        acc[v.type] = (acc[v.type] ?? 0) + 1;
        return acc;
      }, {});
      const breakdownStr = Object.entries(breakdown)
        .map(([t, n]) => `${vLabel(t)} x${n}`)
        .join('; ');
      return [
        displayName(r),
        r.identity?.email ?? '',
        r.identity?.rollNo ?? '',
        formatDate(r.submission.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }),
        r.result ? 'Graded' : 'Pending grading',
        r.result ? String(r.result.totalScore) : '',
        r.result ? String(r.result.totalMarks) : String(exam.totalMarks),
        r.result ? `${Math.round(r.result.percentage)}%` : '',
        String(r.submission.violationCount ?? 0),
        breakdownStr,
      ];
    });
    downloadCsv(`${(exam.title || exam.subject).replace(/\s+/g, '_')}_proctor_report.csv`, [
      header,
      ...body,
    ]);
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Eye size={18} className="text-brand" /> Proctor report
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {submissions.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="exam">{submissions.length} submitted</Badge>
              <Badge tone={gradedCount === submissions.length ? 'integrity' : 'proctor'}>
                {gradedCount}/{submissions.length} graded
              </Badge>
              {avgPct !== null && <Badge tone={scoreTone(avgPct)}>avg {avgPct}%</Badge>}
              <Badge tone={flagged ? 'risk' : 'integrity'}>{flagged} flagged</Badge>
            </div>
          )}
          {submissions.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runGrading(false)}
                disabled={grading || (graded && gradedCount === submissions.length)}
              >
                {grading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {grading ? 'Grading…' : graded ? 'Graded' : 'Grade now'}
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download size={15} /> Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {submissionsQ.isLoading ? (
        <Skeleton className="h-40" />
      ) : submissionsQ.isError ? (
        <ErrorState message="Could not load submissions." />
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Student submissions and integrity telemetry appear here as they come in."
          icon={ShieldCheck}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <ReportRow key={row.submission._id} row={row} onView={() => setActive(row)} />
          ))}
        </div>
      )}

      <IndividualReport
        row={active}
        exam={exam}
        onClose={() => setActive(null)}
      />
    </section>
  );
}

function ReportRow({ row, onView }: { row: Row; onView: () => void }) {
  const { submission: s, identity, result } = row;
  const count = s.violationCount ?? 0;
  const breakdown = (s.violations ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.type] = (acc[v.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-xs font-semibold">
          {initialsOf(displayName(row))}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{displayName(row)}</p>
          <p className="truncate text-xs text-muted">
            {identity?.email ? identity.email : `ID ${s.studentId.slice(0, 12)}…`}
            {identity?.rollNo ? ` · ${identity.rollNo}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Submitted {formatDate(s.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(breakdown).map(([type, n]) => (
              <span
                key={type}
                className="rounded-md border border-border bg-surface-2/50 px-2 py-0.5 text-[11px] text-muted"
              >
                {vLabel(type)} ×{n}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {result ? (
            <Badge tone={scoreTone(result.percentage)}>
              {result.totalScore}/{result.totalMarks} · {Math.round(result.percentage)}%
            </Badge>
          ) : (
            <Badge tone="neutral">Pending grading</Badge>
          )}
          <span className={count > 2 ? 'text-risk' : count > 0 ? 'text-proctor' : 'text-integrity'}>
            {count > 0 ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
          </span>
          <Badge tone={riskTone(count)}>{count} alerts</Badge>
          <Button size="sm" variant="ghost" onClick={onView}>
            <FileText size={15} /> Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IndividualReport({
  row,
  exam,
  onClose,
}: {
  row: Row | null;
  exam: Exam;
  onClose: () => void;
}) {
  const questionById = useMemo(
    () => new Map((exam.questions ?? []).map((q) => [q._id, q])),
    [exam.questions],
  );

  if (!row) return null;
  const { submission: s, identity, result } = row;
  const name = displayName(row);
  const answerByQ = new Map((s.answers ?? []).map((a) => [a.questionId, a.submittedAnswer]));
  const resultByQ = new Map((result?.results ?? []).map((r) => [r.questionId, r]));

  const orderedQuestions: Question[] =
    exam.questions && exam.questions.length > 0
      ? exam.questions
      : (s.answers ?? []).map((a) => ({
          _id: a.questionId,
          type: 'text' as const,
          marks: 0,
          questionText: `Question ${a.questionId.slice(0, 8)}`,
        }));

  const violations = (s.violations ?? [])
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  function doPrint() {
    printHtml(
      `${name} — ${exam.title || exam.subject}`,
      buildReportHtml({ row, exam, orderedQuestions, answerByQ, resultByQ, violations }),
    );
  }

  return (
    <Dialog
      open={Boolean(row)}
      onClose={onClose}
      title={name}
      description={exam.title || exam.subject}
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={doPrint}>
            <Printer size={15} /> Print / Save PDF
          </Button>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Identity + summary */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" value={identity?.email ?? '—'} />
          <Field label="Roll number" value={identity?.rollNo ?? '—'} />
          <Field
            label="Submitted"
            value={formatDate(s.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}
          />
          <Field
            label="Result"
            value={
              result
                ? `${result.totalScore} / ${result.totalMarks} (${Math.round(result.percentage)}%)`
                : 'Pending grading'
            }
          />
        </div>

        {/* Per-question breakdown */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">Answers & grading</h3>
          <div className="space-y-3">
            {orderedQuestions.map((q, i) => {
              const ans = answerByQ.get(q._id);
              const qr = resultByQ.get(q._id);
              return (
                <div key={q._id} className="rounded-xl border border-border bg-surface-2/30 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">
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
                  <p className="mt-2 rounded-lg bg-background/60 px-3 py-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-muted">Answer: </span>
                    {ans ? ans : <span className="italic text-muted">No answer</span>}
                  </p>
                  {qr?.feedback && (
                    <p className="mt-2 flex items-start gap-2 text-xs text-muted">
                      {qr.isCorrect ? (
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-integrity" />
                      ) : (
                        <XCircle size={13} className="mt-0.5 shrink-0 text-proctor" />
                      )}
                      {qr.feedback}
                    </p>
                  )}
                  {qr?.cheatingFlag && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-risk">
                      <AlertTriangle size={13} /> Possible plagiarism
                      {typeof qr.cheatingScore === 'number'
                        ? ` (${Math.round(qr.cheatingScore)}% similarity)`
                        : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Violation timeline */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Integrity timeline {violations.length > 0 && `(${violations.length})`}
          </h3>
          {violations.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-integrity">
              <ShieldCheck size={15} /> No integrity violations were recorded.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {violations.map((v, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-risk" />
                    {vDesc(v.type)}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {formatDate(v.at, { dateStyle: undefined, timeStyle: 'medium' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/30 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}

// ---- export / print helpers ----

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const v = cell ?? '';
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}

function buildReportHtml(opts: {
  row: Row;
  exam: Exam;
  orderedQuestions: Question[];
  answerByQ: Map<string, string>;
  resultByQ: Map<string, QuestionResult>;
  violations: { type: string; at: string }[];
}): string {
  const { row, exam, orderedQuestions, answerByQ, resultByQ, violations } = opts;
  const name = displayName(row);
  const result = row.result;

  const questionsHtml = orderedQuestions
    .map((q, i) => {
      const ans = answerByQ.get(q._id);
      const qr = resultByQ.get(q._id);
      const scoreLine = qr
        ? `<span class="pill">${qr.score}/${qr.maxMarks}${qr.isCorrect ? ' · correct' : ''}</span>`
        : `<span class="pill muted">${q.marks} pts</span>`;
      const feedback = qr?.feedback ? `<p class="fb">${esc(qr.feedback)}</p>` : '';
      const cheat = qr?.cheatingFlag
        ? `<p class="cheat">Possible plagiarism${
            typeof qr.cheatingScore === 'number' ? ` (${Math.round(qr.cheatingScore)}% similarity)` : ''
          }</p>`
        : '';
      return `<div class="q">
        <div class="qhead"><strong>Q${i + 1}.</strong> ${esc(q.questionText)} ${scoreLine}</div>
        <div class="ans"><span class="lbl">Answer:</span> ${ans ? esc(ans) : '<em>No answer</em>'}</div>
        ${feedback}${cheat}
      </div>`;
    })
    .join('');

  const violationsHtml =
    violations.length === 0
      ? '<p class="ok">No integrity violations were recorded.</p>'
      : `<ul class="vlist">${violations
          .map(
            (v) =>
              `<li><span>${esc(vDesc(v.type))}</span><span class="time">${esc(
                formatDate(v.at, { dateStyle: 'medium', timeStyle: 'medium' }),
              )}</span></li>`,
          )
          .join('')}</ul>`;

  return `
  <style>
    *{box-sizing:border-box;} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:32px;}
    h1{font-size:20px;margin:0;} h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#475569;}
    .sub{color:#64748b;margin:4px 0 0;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;}
    .meta div{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;}
    .meta .k{font-size:11px;text-transform:uppercase;color:#64748b;} .meta .v{font-weight:600;}
    .q{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:10px;}
    .qhead{font-size:14px;} .ans{margin-top:6px;background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:13px;}
    .lbl{font-size:11px;text-transform:uppercase;color:#64748b;margin-right:4px;}
    .fb{font-size:12px;color:#475569;margin:6px 0 0;} .cheat{font-size:12px;color:#b91c1c;margin:6px 0 0;}
    .pill{float:right;border:1px solid #cbd5e1;border-radius:999px;padding:1px 8px;font-size:12px;} .pill.muted{color:#64748b;}
    .vlist{list-style:none;padding:0;margin:0;} .vlist li{display:flex;justify-content:space-between;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;margin-bottom:6px;font-size:13px;}
    .time{color:#64748b;font-variant-numeric:tabular-nums;} .ok{color:#047857;} @media print{body{margin:12px;}}
  </style>
  <h1>${esc(name)}</h1>
  <p class="sub">${esc(exam.title || exam.subject)} · ${esc(exam.subject)}</p>
  <div class="meta">
    <div><div class="k">Email</div><div class="v">${esc(row.identity?.email ?? '—')}</div></div>
    <div><div class="k">Roll number</div><div class="v">${esc(row.identity?.rollNo ?? '—')}</div></div>
    <div><div class="k">Submitted</div><div class="v">${esc(
      formatDate(row.submission.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }),
    )}</div></div>
    <div><div class="k">Result</div><div class="v">${
      result
        ? `${result.totalScore} / ${result.totalMarks} (${Math.round(result.percentage)}%)`
        : 'Pending grading'
    }</div></div>
  </div>
  <h2>Answers &amp; grading</h2>
  ${questionsHtml}
  <h2>Integrity timeline</h2>
  ${violationsHtml}
  `;
}

function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=720');
  if (!w) {
    toast.error('Pop-up blocked', 'Allow pop-ups for this site to print the report.');
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before invoking print.
  setTimeout(() => w.print(), 300);
}
