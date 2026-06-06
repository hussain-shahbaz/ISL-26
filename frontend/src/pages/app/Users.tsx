import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, UserCheck, Users as UsersIcon, GraduationCap } from 'lucide-react';
import {
  getPendingInstructors,
  getInstructors,
  getStudents,
  updateApproval,
  type ManagedUser,
} from '@/features/admin/api';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { initialsOf, cn } from '@/lib/utils';

type Tab = 'pending' | 'instructors' | 'students';

const tabs: { id: Tab; label: string; icon: typeof UserCheck }[] = [
  { id: 'pending', label: 'Pending', icon: UserCheck },
  { id: 'instructors', label: 'Instructors', icon: UsersIcon },
  { id: 'students', label: 'Students', icon: GraduationCap },
];

const fetchers: Record<Tab, () => Promise<ManagedUser[]>> = {
  pending: getPendingInstructors,
  instructors: getInstructors,
  students: getStudents,
};

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', tab],
    queryFn: fetchers[tab],
  });

  const approval = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      updateApproval(id, status),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['pending-instructors'] });
      toast.success(vars.status === 'APPROVED' ? 'User approved' : 'User rejected');
    },
    onError: (err) => toast.error('Action failed', apiErrorMessage(err)),
  });

  const users = data ?? [];

  return (
    <div>
      <PageHeader title="Users" description="Approve instructors and review platform accounts." />

      <div className="mb-6 inline-flex rounded-xl border border-border bg-surface-2/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-surface text-foreground shadow-elev' : 'text-muted hover:text-foreground',
            )}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="User service unreachable. Is the backend running?" />
      ) : users.length === 0 ? (
        <EmptyState title="Nothing here" description={`No ${tab} to show right now.`} icon={UsersIcon} />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--integrity))] text-sm font-semibold text-[#04121a]">
                    {initialsOf(u.name || u.email)}
                  </span>
                  <div>
                    <p className="font-medium">{u.name || 'Unnamed'}</p>
                    <p className="text-sm text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.approvalStatus && (
                    <Badge
                      tone={
                        u.approvalStatus === 'APPROVED'
                          ? 'integrity'
                          : u.approvalStatus === 'REJECTED'
                            ? 'risk'
                            : 'proctor'
                      }
                    >
                      {u.approvalStatus.toLowerCase()}
                    </Badge>
                  )}
                  {tab === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approval.mutate({ id: u.id, status: 'APPROVED' })}
                        disabled={approval.isPending}
                      >
                        <Check size={15} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approval.mutate({ id: u.id, status: 'REJECTED' })}
                        disabled={approval.isPending}
                      >
                        <X size={15} /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
