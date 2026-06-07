import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, PlusCircle } from 'lucide-react';
import { listTeacherExams, listStudentExams } from '@/features/exams/api';
import { PageHeader, EmptyState, ErrorState, CardGridSkeleton } from '@/components/app/widgets';
import { ExamCard } from '@/features/exams/components';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

export default function ExamsListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'teacher';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exams', role],
    queryFn: () => (isTeacher ? listTeacherExams() : listStudentExams()),
  });

  const list = data ?? [];

  return (
    <div>
      <PageHeader
        title={isTeacher ? 'Your exams' : 'My exams'}
        description={isTeacher ? 'Manage authored exams and their lifecycle.' : 'Exams assigned to you.'}
        action={
          isTeacher ? (
            <Link to="/app/exams/new">
              <Button>
                <PlusCircle size={16} /> New exam
              </Button>
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : isError ? (
        <ErrorState />
      ) : list.length === 0 ? (
        <EmptyState
          title={isTeacher ? 'No exams yet' : 'Nothing assigned'}
          description={
            isTeacher
              ? 'Create your first exam to begin.'
              : 'Published exams assigned to you will show up here.'
          }
          icon={FileText}
          action={
            isTeacher ? (
              <Link to="/app/exams/new">
                <Button>
                  <PlusCircle size={16} /> Create exam
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((exam, i) => (
            <ExamCard
              key={exam._id}
              exam={exam}
              to={`/app/exams/${exam._id}`}
              cta={isTeacher ? 'Manage' : 'Open'}
              studentView={!isTeacher}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}
    </div>
  );
}
