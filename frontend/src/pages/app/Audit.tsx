import { useEffect, useState } from 'react';
import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldX,
  Search,
  RefreshCw,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Timer,
  User,
  Hash,
} from 'lucide-react';
import { queryLogs, verifyChain, type LogEntry } from '@/features/audit/api';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

type EventFilter = '' | 'REQUEST' | 'RESPONSE';
const PAGE_SIZES = [25, 50, 100];

export default function AuditPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventFilter>('');
  const [errorOnly, setErrorOnly] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  // Debounce free-text search so we don't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', { search, eventType, errorOnly, pageSize, page }],
    queryFn: () =>
      queryLogs({
        eventType: eventType || undefined,
        errorOnly,
        search: search || undefined,
        limit: pageSize,
        skip: page * pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const verify = useMutation({
    mutationFn: () => verifyChain('main-server'),
    onSuccess: (res) =>
      res.isValid
        ? toast.success('Chain verified', `${res.totalLogs} entries are tamper-free.`)
        : toast.error('Chain broken', res.message),
    onError: (err) => toast.error('Verify failed', apiErrorMessage(err)),
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, page * pageSize + logs.length);
  const hasNext = (page + 1) * pageSize < total;

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Tamper-evident, hash-chained record of every request through the gateway."
        action={
          <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
            {verify.isPending ? <Spinner /> : <ShieldCheck size={16} />} Verify chain
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[16rem] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search path, method, request ID, or user ID…"
              className="pl-9"
            />
          </div>

          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value as EventFilter);
              setPage(0);
            }}
            className="h-10 rounded-lg border border-border bg-surface-2/50 px-3 text-sm outline-none focus:border-brand"
          >
            <option value="">All events</option>
            <option value="REQUEST">Requests</option>
            <option value="RESPONSE">Responses</option>
          </select>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={errorOnly}
              onChange={(e) => {
                setErrorOnly(e.target.checked);
                setPage(0);
              }}
              className="h-4 w-4 rounded border-border accent-[var(--brand)]"
            />
            Errors only
          </label>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="h-10 rounded-lg border border-border bg-surface-2/50 px-3 text-sm outline-none focus:border-brand"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>

          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
            <RefreshCw size={15} className={cn(isFetching && 'animate-spin')} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Log service unreachable. Is the backend running?" />
      ) : logs.length === 0 ? (
        <EmptyState title="No log entries" description="Nothing matches the current filters." icon={FileSearch} />
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <LogRow key={log._id} log={log} />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              Showing <span className="text-foreground">{start}</span>–
              <span className="text-foreground">{end}</span> of{' '}
              <span className="text-foreground">{total.toLocaleString()}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
              >
                <ChevronLeft size={15} /> Prev
              </Button>
              <span className="px-1 font-mono text-xs">Page {page + 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || isFetching}
              >
                Next <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const [open, setOpen] = useState(false);
  const status = log.response?.statusCode ?? log.request?.statusCode;
  const isError = (status ?? 0) >= 400 || Boolean(log.error);
  const latency = log.response?.responseTime;

  return (
    <Card className="transition-colors hover:border-[color-mix(in_oklab,var(--brand)_30%,var(--border))]">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
        >
          <span className={cn(isError ? 'text-risk' : 'text-integrity')}>
            {isError ? <ShieldX size={16} /> : <ShieldCheck size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={log.eventType === 'RESPONSE' ? 'exam' : 'brand'}>{log.eventType}</Badge>
              {log.request?.method && (
                <span className="font-mono text-xs text-foreground">
                  {log.request.method} {log.request.path}
                </span>
              )}
              {log.request?.userId && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                  <User size={11} /> {log.request.userId.slice(0, 12)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted">
              <span>{formatDate(log.timestamp)}</span>
              {latency != null && (
                <span className="inline-flex items-center gap-1">
                  <Timer size={11} /> {latency} ms
                </span>
              )}
              {log.currentHash && (
                <span className="inline-flex items-center gap-1 font-mono" title={log.currentHash}>
                  <Hash size={11} /> {log.currentHash.slice(0, 16)}…
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status != null && (
              <span className={cn('font-mono text-sm', isError ? 'text-risk' : 'text-foreground')}>
                {status}
              </span>
            )}
            <ChevronDown size={16} className={cn('text-muted transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open && (
          <div className="border-t border-border bg-surface-2/40 p-4">
            <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <Detail label="Request ID" value={log.requestId} mono />
              <Detail label="Service" value={log.service} />
              <Detail label="Environment" value={log.environment} />
              <Detail label="User ID" value={log.request?.userId} mono />
              <Detail label="IP address" value={log.request?.ip} mono />
              <Detail label="Latency" value={latency != null ? `${latency} ms` : undefined} />
              <Detail label="URL" value={log.request?.url} mono />
              <Detail label="User agent" value={log.request?.userAgent} />
              {log.error?.message && <Detail label="Error" value={log.error.message} />}
            </dl>
            <div className="mt-3 space-y-1 border-t border-border pt-3 font-mono text-[11px] text-muted">
              <p className="truncate" title={log.previousHash}>
                prev: {log.previousHash || '—'}
              </p>
              <p className="truncate" title={log.currentHash}>
                hash: {log.currentHash || '—'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right text-foreground', mono && 'font-mono')} title={value}>
        {value}
      </dd>
    </div>
  );
}
