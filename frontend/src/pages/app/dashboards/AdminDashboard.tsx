import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, GraduationCap, ShieldCheck, ScrollText, Loader2 } from 'lucide-react';
import { getPendingInstructors, getInstructors, getStudents } from '@/features/admin/api';
import { verifyChain } from '@/features/logs/api';
import { PageHeader, StatCard, ErrorState } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';

export default function AdminDashboard() {
  const pending = useQuery({ queryKey: ['pending-instructors'], queryFn: getPendingInstructors });
  const instructors = useQuery({ queryKey: ['instructors'], queryFn: getInstructors });
  const students = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [verifying, setVerifying] = useState(false);
  const [chain, setChain] = useState<{ ok: boolean; message: string; total: number } | null>(null);

  async function runVerify() {
    setVerifying(true);
    try {
      const result = await verifyChain('gateway');
      setChain({ ok: result.isValid, message: result.message, total: result.totalLogs });
      if (result.isValid) toast.success('Audit chain intact', `${result.totalLogs} links verified`);
      else toast.error('Audit chain broken', result.message);
    } catch (err) {
      toast.error('Verification failed', apiErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  const anyError = pending.isError && instructors.isError && students.isError;

  return (
    <div>
      <PageHeader title="Admin control room" description="Approvals, users and system integrity." />

      {anyError && <ErrorState message="User service unreachable. Is the backend running?" />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending approvals" value={pending.data?.length ?? '—'} icon={UserCheck} accent="proctor" />
        <StatCard label="Instructors" value={instructors.data?.length ?? '—'} icon={Users} accent="exam" delay={0.05} />
        <StatCard label="Students" value={students.data?.length ?? '—'} icon={GraduationCap} accent="brand" delay={0.1} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2">
                <ShieldCheck size={20} className="text-integrity" />
              </span>
              <div>
                <h3 className="font-semibold">Audit chain integrity</h3>
                <p className="text-sm text-muted">Recompute the SHA-256 hash chain for the gateway.</p>
              </div>
            </div>

            {chain && (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  chain.ok
                    ? 'border-integrity/40 bg-[color-mix(in_oklab,var(--integrity)_10%,transparent)]'
                    : 'border-risk/40 bg-[color-mix(in_oklab,var(--risk)_10%,transparent)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{chain.ok ? 'Chain valid' : 'Chain broken'}</span>
                  <Badge tone={chain.ok ? 'integrity' : 'risk'}>{chain.total} links</Badge>
                </div>
                <p className="mt-1 text-muted">{chain.message}</p>
              </div>
            )}

            <Button onClick={runVerify} disabled={verifying} className="mt-5">
              {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Verify chain now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2">
                <ScrollText size={20} className="text-brand" />
              </span>
              <div>
                <h3 className="font-semibold">Quick actions</h3>
                <p className="text-sm text-muted">Manage the platform.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Link to="/app/users">
                <Button variant="outline" className="w-full justify-start">
                  <UserCheck size={16} /> Review pending approvals
                </Button>
              </Link>
              <Link to="/app/audit">
                <Button variant="outline" className="w-full justify-start">
                  <ScrollText size={16} /> Open audit log
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
