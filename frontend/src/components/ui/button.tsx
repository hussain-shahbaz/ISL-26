import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-[#04121a] font-semibold shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--brand)_70%,transparent)] hover:shadow-[0_14px_40px_-10px_color-mix(in_oklab,var(--brand)_85%,transparent)] hover:-translate-y-0.5',
        solid:
          'bg-foreground text-background hover:opacity-90 hover:-translate-y-0.5',
        outline:
          'border border-border bg-transparent hover:bg-surface-2 hover:border-[color-mix(in_oklab,var(--brand)_45%,var(--border))]',
        ghost: 'bg-transparent hover:bg-surface-2',
        subtle: 'bg-surface-2 hover:bg-surface-3',
        danger: 'bg-risk text-white hover:opacity-90 hover:-translate-y-0.5',
      },
      size: {
        sm: 'h-9 px-3.5 text-[0.8rem]',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
