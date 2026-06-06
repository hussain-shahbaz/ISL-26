const STATUS_CONFIG = {
  published: {
    label: 'Available',
    containerClass: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
  },
  pending_grading: {
    label: 'Pending',
    containerClass: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
  },
  graded: {
    label: 'Graded',
    containerClass: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    dotClass: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]',
  },
  submitted: {
    label: 'Submitted',
    containerClass: 'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]',
  },
  expired: {
    label: 'Expired',
    containerClass: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/30',
    dotClass: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    containerClass: 'bg-zinc-500/12 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    dotClass: 'bg-zinc-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 border ${config.containerClass}`}
      id={`status-badge-${status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${config.dotClass}`} />
      {config.label}
    </span>
  );
}
