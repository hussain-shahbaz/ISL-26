import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, PasswordInput } from '@/components/form/fields';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { registerUser } from '@/features/auth/api';
import { cn } from '@/lib/utils';

type RoleChoice = 'student' | 'instructor';

const roles: { value: RoleChoice; label: string; icon: typeof GraduationCap; desc: string }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Take secured exams' },
  { value: 'instructor', label: 'Teacher', icon: BookOpen, desc: 'Author and grade' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleChoice>('student');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Weak password', 'Use at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), password, role });
      toast.success('Account created', 'Enter the code we emailed to verify.');
      navigate('/verify-otp', { state: { email: email.trim() } });
    } catch (err) {
      toast.error('Registration failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up identity once. We verify it on every exam."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                'group rounded-xl border p-3.5 text-left transition-all duration-200',
                role === r.value
                  ? 'border-brand bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] shadow-glow'
                  : 'border-border bg-surface-2/40 hover:border-[color-mix(in_oklab,var(--brand)_40%,var(--border))]',
              )}
            >
              <r.icon
                size={20}
                className={role === r.value ? 'text-brand' : 'text-muted'}
              />
              <p className="mt-2 text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted">{r.desc}</p>
            </button>
          ))}
        </div>

        <Field label="Full name" htmlFor="name">
          <Input
            id="name"
            required
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="Min 8 characters">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
