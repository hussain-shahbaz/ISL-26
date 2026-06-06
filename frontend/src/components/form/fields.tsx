import { forwardRef, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-risk">{error}</p>}
    </div>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length).split('').slice(0, length);

  const setAt = (index: number, char: string) => {
    const next = value.split('');
    next[index] = char;
    onChange(next.join('').replace(/\s/g, '').slice(0, length));
  };

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ''}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, char);
            if (char && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          className="h-14 w-full rounded-xl border border-border bg-surface-2/60 py-3 text-center font-mono text-lg font-semibold text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        />
      ))}
    </div>
  );
}
