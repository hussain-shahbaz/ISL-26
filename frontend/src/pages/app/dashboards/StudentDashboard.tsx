import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle2, Trophy } from 'lucide-react';
import { listStudentExams } from '@/features/exams/api';
import { PageHeader, StatCard, EmptyState, ErrorState, CardGridSkeleton } from '@/components/app/widgets';
import { ExamCard } from '@/features/exams/components';
import { useAuthStore } from '@/store/auth';

export default function StudentDashboard() {
  const name = useAuthStore((s) => s.user?.name || s.user?.email?.split('@')[0]);
  const { data: exams, isLoading, isError } = useQuery({
    queryKey: ['student-exams'],
    queryFn: listStudentExams,
  });

  const list = exams ?? [];
  const upcoming = list.filter((e) => e.status === 'published');
  const completed = list.filter((e) => e.status === 'submitted' || e.status === 'checked');

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
        <StatCard
          label="Graded"
          value={list.filter((e) => e.status === 'checked').length}
          icon={Trophy}
          accent="integrity"
          delay={0.15}
        />
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
