import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ListChecks, AlignLeft, Save } from 'lucide-react';
import { createExam, type CreateExamPayload } from '@/features/exams/api';
import { PageHeader } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/form/fields';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DraftQuestion {
  id: string;
  type: 'mcq' | 'text';
  marks: number;
  questionText: string;
  options: string[];
  referenceAnswer: string;
}

function emptyQuestion(): DraftQuestion {
  return { id: crypto.randomUUID(), type: 'mcq', marks: 5, questionText: '', options: ['', ''], referenceAnswer: '' };
}

export default function CreateExamPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timeAllowed, setTimeAllowed] = useState(60);
  const [studentsRaw, setStudentsRaw] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);

  const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0), [questions]);

  const mutation = useMutation({
    mutationFn: (payload: CreateExamPayload) => createExam(payload),
    onSuccess: (exam) => {
      qc.invalidateQueries({ queryKey: ['teacher-exams'] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam created', 'Saved as a draft. Publish it when ready.');
      navigate(exam?._id ? `/app/exams/${exam._id}` : '/app/exams');
    },
    onError: (err) => toast.error('Could not create exam', apiErrorMessage(err)),
  });

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const students = studentsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!subject.trim()) return toast.error('Subject required');
    if (questions.some((q) => !q.questionText.trim())) return toast.error('Every question needs text');

    mutation.mutate({
      subject: subject.trim(),
      title: title.trim() || subject.trim(),
      scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      timeAllowed: Number(timeAllowed),
      totalMarks,
      students,
      questions: questions.map((q) => ({
        type: q.type,
        marks: Number(q.marks),
        questionText: q.questionText.trim(),
        options: q.type === 'mcq' ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
        referenceAnswer: q.referenceAnswer.trim() || undefined,
      })),
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title="Create an exam"
        description="Build the paper, assign students, and save it as a draft."
        action={
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Save size={16} />} Save draft
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="font-semibold">Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Subject" htmlFor="subject">
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" required />
                </Field>
                <Field label="Title" htmlFor="title">
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midterm 2026" />
                </Field>
                <Field label="Scheduled start" htmlFor="time">
                  <Input id="time" type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </Field>
                <Field label="Time allowed (minutes)" htmlFor="dur">
                  <Input id="dur" type="number" min={1} value={timeAllowed} onChange={(e) => setTimeAllowed(Number(e.target.value))} />
                </Field>
              </div>
              <Field label="Assigned students" hint="One user ID per line or comma-separated">
                <Textarea
                  value={studentsRaw}
                  onChange={(e) => setStudentsRaw(e.target.value)}
                  placeholder={'student-user-id-1\nstudent-user-id-2'}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions</h3>
                <Button type="button" variant="subtle" size="sm" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
                  <Plus size={15} /> Add question
                </Button>
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">Q{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-border p-0.5">
                        {(['mcq', 'text'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateQuestion(q.id, { type: t })}
                            className={cn(
                              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                              q.type === t ? 'bg-surface-3 text-foreground' : 'text-muted',
                            )}
                          >
                            {t === 'mcq' ? <ListChecks size={13} /> : <AlignLeft size={13} />}
                            {t === 'mcq' ? 'MCQ' : 'Text'}
                          </button>
                        ))}
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                          className="text-muted transition-colors hover:text-risk"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    className="mt-3 min-h-[72px]"
                    value={q.questionText}
                    onChange={(e) => updateQuestion(q.id, { questionText: e.target.value })}
                    placeholder="Write the question..."
                  />

                  {q.type === 'mcq' ? (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const options = [...q.options];
                              options[oi] = e.target.value;
                              updateQuestion(q.id, { options });
                            }}
                            placeholder={`Option ${oi + 1}`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => updateQuestion(q.id, { options: q.options.filter((_, i) => i !== oi) })}
                              className="text-muted hover:text-risk"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateQuestion(q.id, { options: [...q.options, ''] })}>
                        <Plus size={14} /> Option
                      </Button>
                    </div>
                  ) : (
                    <Input
                      className="mt-3"
                      value={q.referenceAnswer}
                      onChange={(e) => updateQuestion(q.id, { referenceAnswer: e.target.value })}
                      placeholder="Reference answer (used for AI grading)"
                    />
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted">Marks</span>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 w-24"
                      value={q.marks}
                      onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary rail */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-semibold">Summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Questions</dt>
                  <dd className="font-medium">{questions.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Total marks</dt>
                  <dd className="font-medium">{totalMarks}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-medium">{timeAllowed} min</dd>
                </div>
              </dl>
              <Badge tone="proctor" className="mt-5">Saved as draft</Badge>
              <p className="mt-3 text-xs text-muted">
                Publishing requires marks to reconcile and at least one assigned student.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
