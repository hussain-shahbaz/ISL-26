import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Send, FileEdit, CheckCircle2, PlusCircle } from 'lucide-react';
import { listTeacherExams } from '@/features/exams/api';
import { PageHeader, StatCard, EmptyState, ErrorState, CardGridSkeleton } from '@/components/app/widgets';
import { ExamCard } from '@/features/exams/components';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

export default function TeacherDashboard() {
  const name = useAuthStore((s) => s.user?.name || s.user?.email?.split('@')[0]);
  const { data: exams, isLoading, isError } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => listTeacherExams(),
  });

  const list = exams ?? [];

  return (
    <div>
      <PageHeader
        title={`Hello${name ? `, ${name}` : ''}`}
        description="Author exams, publish to students, and review submissions."
        action={
          <Link to="/app/exams/new">
            <Button>
              <PlusCircle size={16} /> New exam
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total exams" value={list.length} icon={FileText} accent="exam" />
        <StatCard label="Drafts" value={list.filter((e) => e.status === 'draft').length} icon={FileEdit} accent="brand" delay={0.05} />
        <StatCard label="Published" value={list.filter((e) => e.status === 'published').length} icon={Send} accent="proctor" delay={0.1} />
        <StatCard label="Graded" value={list.filter((e) => e.status === 'checked').length} icon={CheckCircle2} accent="integrity" delay={0.15} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your exams</h2>
          {list.length > 0 && (
            <Link to="/app/exams" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )}
        </div>
        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState />
        ) : list.length === 0 ? (
          <EmptyState
            title="No exams yet"
            description="Create your first exam to start assessing students securely."
            icon={FileText}
            action={
              <Link to="/app/exams/new">
                <Button>
                  <PlusCircle size={16} /> Create exam
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, 6).map((exam, i) => (
              <ExamCard key={exam._id} exam={exam} to={`/app/exams/${exam._id}`} cta="Manage" delay={i * 0.05} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
