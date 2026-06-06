import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-2 text-muted',
        brand: 'border-transparent bg-[color-mix(in_oklab,var(--brand)_16%,transparent)] text-brand',
        integrity:
          'border-transparent bg-[color-mix(in_oklab,var(--integrity)_16%,transparent)] text-integrity',
        exam: 'border-transparent bg-[color-mix(in_oklab,var(--exam)_16%,transparent)] text-exam',
        proctor:
          'border-transparent bg-[color-mix(in_oklab,var(--proctor)_18%,transparent)] text-proctor',
        risk: 'border-transparent bg-[color-mix(in_oklab,var(--risk)_16%,transparent)] text-risk',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
