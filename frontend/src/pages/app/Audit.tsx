import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, Search, RefreshCw, FileSearch } from 'lucide-react';
import { queryLogs, verifyChain, type LogEntry } from '@/features/logs/api';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const services = ['gateway', 'auth-service', 'exam-service', 'student-exam', 'user-service'];

export default function AuditPage() {
  const [service, setService] = useState('');
  const [errorOnly, setErrorOnly] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', service, errorOnly],
    queryFn: () => queryLogs({ service: service || undefined, errorOnly }),
  });

  const verify = useMutation({
    mutationFn: () => verifyChain(service || 'gateway'),
    onSuccess: (res) =>
      res.isValid
        ? toast.success('Chain verified', `${res.totalLogs} entries are tamper-free.`)
        : toast.error('Chain broken', res.message),
    onError: (err) => toast.error('Verify failed', apiErrorMessage(err)),
  });

  const logs = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Tamper-evident, hash-chained record of every privileged action."
        action={
          <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
            {verify.isPending ? <Spinner /> : <ShieldCheck size={16} />} Verify chain
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2/50 pl-9 pr-8 text-sm outline-none focus:border-brand"
            >
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={errorOnly}
              onChange={(e) => setErrorOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--brand)]"
            />
            Errors only
          </label>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
            <RefreshCw size={15} className={cn(isFetching && 'animate-spin')} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Log service unreachable. Is the backend running?" />
      ) : logs.length === 0 ? (
        <EmptyState title="No log entries" description="Nothing matches the current filters." icon={FileSearch} />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogRow key={log._id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const status = log.response?.statusCode ?? log.request?.statusCode;
  const isError = (status ?? 0) >= 400 || Boolean(log.error);
  return (
    <Card className="transition-colors hover:border-[color-mix(in_oklab,var(--brand)_30%,var(--border))]">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className={cn('mt-0.5', isError ? 'text-risk' : 'text-integrity')}>
          {isError ? <ShieldX size={16} /> : <ShieldCheck size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{log.service}</Badge>
            <span className="font-mono text-xs text-muted">{log.eventType}</span>
            {log.request?.method && (
              <span className="font-mono text-xs text-foreground">
                {log.request.method} {log.request.path}
              </span>
            )}
          </div>
          {log.currentHash && (
            <p className="mt-1 truncate font-mono text-[11px] text-muted" title={log.currentHash}>
              hash {log.currentHash.slice(0, 24)}…
            </p>
          )}
        </div>
        <div className="text-right">
          {status != null && (
            <span className={cn('font-mono text-sm', isError ? 'text-risk' : 'text-foreground')}>
              {status}
            </span>
          )}
          <p className="text-xs text-muted">{formatDate(log.timestamp)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
