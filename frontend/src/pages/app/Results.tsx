import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Clock3, CheckCircle2, ChevronRight } from 'lucide-react';
import { listStudentExams } from '@/features/exams/api';
import { PageHeader, EmptyState, ErrorState, CardGridSkeleton } from '@/components/app/widgets';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function ResultsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-exams'],
    queryFn: listStudentExams,
  });

  // A result exists once the student has actually submitted — derived from the
  // per-student `submitted` flag, not the exam's global status.
  const completed = (data ?? []).filter((e) => e.submitted || e.status === 'checked');

  return (
    <div>
      <PageHeader title="Results" description="Exams you've completed and their grading status." />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError ? (
        <ErrorState />
      ) : completed.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Once you submit an exam it will appear here, with grades when ready."
          icon={Award}
        />
      ) : (
        <div className="space-y-3">
          {completed.map((exam) => (
            <Link key={exam._id} to={`/app/results/${exam._id}`} className="block">
              <Card className="transition-colors hover:border-brand/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2">
                      {exam.status === 'checked' ? (
                        <CheckCircle2 size={20} className="text-integrity" />
                      ) : (
                        <Clock3 size={20} className="text-proctor" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">{exam.title || exam.subject}</p>
                      <p className="text-sm text-muted">{exam.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right text-sm">
                      <p className="text-muted">View result</p>
                      {exam.submittedAt && (
                        <p className="text-xs text-muted">
                          Submitted {formatDate(exam.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <Badge tone={exam.status === 'checked' ? 'integrity' : 'proctor'}>
                      {exam.status === 'checked' ? 'Graded' : 'Submitted'}
                    </Badge>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
