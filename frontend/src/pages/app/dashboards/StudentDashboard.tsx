import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle2, Trophy, CalendarClock, Play } from 'lucide-react';
import { listStudentExams } from '@/features/exams/api';
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  CardGridSkeleton,
  DistributionBar,
} from '@/components/app/widgets';
import { ExamCard } from '@/features/exams/components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';

export default function StudentDashboard() {
  const name = useAuthStore((s) => s.user?.name || s.user?.email?.split('@')[0]);
  const { data: exams, isLoading, isError } = useQuery({
    queryKey: ['student-exams'],
    queryFn: listStudentExams,
  });

  const list = exams ?? [];
  const upcoming = list.filter((e) => e.status === 'published');
  const submitted = list.filter((e) => e.status === 'submitted');
  const graded = list.filter((e) => e.status === 'checked');
  const completed = [...submitted, ...graded];
  const nextUp = [...upcoming].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
  )[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back${name ? `, ${name}` : ''}`}
        description="Your assigned exams and progress at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned" value={list.length} icon={FileText} accent="brand" />
        <StatCard label="Open now" value={upcoming.length} icon={Clock} accent="exam" delay={0.05} />
        <StatCard label="Submitted" value={completed.length} icon={CheckCircle2} accent="proctor" delay={0.1} />
        <StatCard label="Graded" value={graded.length} icon={Trophy} accent="integrity" delay={0.15} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <DistributionBar
          title="Your progress"
          segments={[
            { label: 'Open', value: upcoming.length, tone: 'exam' },
            { label: 'Submitted', value: submitted.length, tone: 'proctor' },
            { label: 'Graded', value: graded.length, tone: 'integrity' },
          ]}
        />
        <Card className={nextUp ? 'border-brand/30' : undefined}>
          <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock size={16} className="text-brand" /> Next up
            </div>
            {nextUp ? (
              <>
                <div>
                  <p className="font-medium">{nextUp.title || nextUp.subject}</p>
                  <p className="text-sm text-muted">
                    {nextUp.subject} · {formatDate(nextUp.scheduledTime)} · {nextUp.timeAllowed} min
                  </p>
                </div>
                <Link to={`/app/exams/${nextUp._id}`}>
                  <Button size="sm">
                    <Play size={15} /> Open exam
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">No open exams right now. You are all caught up.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Available exams</h2>
        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No open exams"
            description="When a teacher publishes an exam assigned to you, it will appear here."
            icon={FileText}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((exam, i) => (
              <ExamCard key={exam._id} exam={exam} to={`/app/exams/${exam._id}`} cta="Start" delay={i * 0.05} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
