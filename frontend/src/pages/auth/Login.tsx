import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

  const from = (location.state as { from?: string } | null)?.from || '/app';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
      toast.error('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  }

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
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Sign in securely'}
        </Button>
      </form>
    </AuthLayout>
  );
}
