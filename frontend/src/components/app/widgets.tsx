import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Inbox, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </motion.h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const accentMap = {
  brand: 'text-brand',
  integrity: 'text-integrity',
  exam: 'text-exam',
  proctor: 'text-proctor',
  risk: 'text-risk',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'brand',
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: typeof Inbox;
  accent?: keyof typeof accentMap;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-elev"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2">
          <Icon size={18} className={accentMap[accent]} />
        </span>
      </div>
    </motion.div>
  );
}

const toneVar = {
  brand: 'var(--brand)',
  integrity: 'var(--integrity)',
  exam: 'var(--exam)',
  proctor: 'var(--proctor)',
  risk: 'var(--risk)',
} as const;

export interface Segment {
  label: string;
  value: number;
  tone: keyof typeof toneVar;
}

/** A compact stacked distribution bar with legend, computed from real counts. */
export function DistributionBar({ title, segments }: { title?: string; segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const safe = total || 1;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <span className="text-xs text-muted">{total} total</span>
        </div>
      )}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.label}
              className="h-full transition-all"
              style={{ width: `${(s.value / safe) * 100}%`, background: toneVar[s.tone] }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: toneVar[s.tone] }} />
            <span className="text-muted">{s.label}</span>
            <span className="font-medium tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface-2">
        <Icon size={24} className="text-muted" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-risk/40 bg-[color-mix(in_oklab,var(--risk)_8%,transparent)] px-5 py-4 text-sm">
      <TriangleAlert size={18} className="shrink-0 text-risk" />
      <span className="text-foreground/90">{message || 'Could not load this data. Is the backend running?'}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-36" />
      ))}
    </div>
  );
}
