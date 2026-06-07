import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Send, FileEdit, CheckCircle2, PlusCircle, ArrowRight } from 'lucide-react';
import { listTeacherExams } from '@/features/exams/api';
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

export default function TeacherDashboard() {
  const name = useAuthStore((s) => s.user?.name || s.user?.email?.split('@')[0]);
  const { data: exams, isLoading, isError } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => listTeacherExams(),
  });

  const list = exams ?? [];
  const drafts = list.filter((e) => e.status === 'draft');
  const published = list.filter((e) => e.status === 'published');
  const graded = list.filter((e) => e.status === 'checked');

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
        <StatCard label="Drafts" value={drafts.length} icon={FileEdit} accent="brand" delay={0.05} />
        <StatCard label="Published" value={published.length} icon={Send} accent="proctor" delay={0.1} />
        <StatCard label="Graded" value={graded.length} icon={CheckCircle2} accent="integrity" delay={0.15} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <DistributionBar
          title="Exam lifecycle"
          segments={[
            { label: 'Drafts', value: drafts.length, tone: 'brand' },
            { label: 'Published', value: published.length, tone: 'proctor' },
            { label: 'Graded', value: graded.length, tone: 'integrity' },
          ]}
        />
        <Card>
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <p className="text-sm font-medium">Needs attention</p>
              <p className="mt-1 text-sm text-muted">
                {drafts.length > 0
                  ? `${drafts.length} draft${drafts.length > 1 ? 's' : ''} not yet published to students.`
                  : 'All your exams are published. Nothing waiting.'}
              </p>
            </div>
            <Link to="/app/exams" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              Review exams <ArrowRight size={15} />
            </Link>
          </CardContent>
        </Card>
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
