import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, PasswordInput } from '@/components/form/fields';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { loginUser, fetchMe } from '@/features/auth/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const from = (location.state as { from?: string } | null)?.from || '/app';

  // Count down the rate-limit lockout so the button re-enables on its own.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const token = await loginUser(email.trim(), password);
      useAuthStore.getState().setAccessToken(token);
      const user = await fetchMe();
      setSession(token, user);
      toast.success('Welcome back', `Signed in as ${user.email}`);
      navigate(from, { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err, 'Unable to sign in');
      if (/verify your email/i.test(message)) {
        toast.warning('Email not verified', 'Check your inbox for the verification code.');
        navigate('/verify-otp', { state: { email: email.trim() } });
        return;
      }
      // Too many attempts: surface a clear lockout with a live countdown.
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        const retryAfter = Number(err.response.headers?.['retry-after']);
        const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 600;
        setCooldown(seconds);
        setError(
          `Too many failed attempts. For your security, sign in is locked for about ${Math.ceil(
            seconds / 60,
          )} minute(s).`,
        );
        toast.error('Account temporarily locked', 'Too many login attempts.');
        return;
      }
      setError(message);
      toast.error('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  }

  const locked = cooldown > 0;

  return (
    <AuthLayout
      title="Sign in to ExamPro"
      subtitle="Verify your identity to continue to the platform."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-risk/40 bg-[color-mix(in_oklab,var(--risk)_10%,transparent)] p-3 text-sm text-foreground"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-risk" />
            <span>
              {error}
              {locked && (
                <span className="mt-0.5 block font-mono text-xs text-muted">
                  Try again in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}
                </span>
              )}
            </span>
          </div>
        )}
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
        <Field
          label="Password"
          htmlFor="password"
          hint=""
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-muted hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading || locked}>
          {loading ? <Spinner /> : locked ? `Locked (${cooldown}s)` : 'Sign in securely'}
        </Button>
      </form>
    </AuthLayout>
  );
}
