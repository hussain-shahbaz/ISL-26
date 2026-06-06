import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OtpInput } from '@/components/form/fields';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { verifyEmail, resendEmailOtp } from '@/features/auth/api';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Incomplete code', 'Enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email.trim(), otp);
      toast.success('Email verified', 'You can now sign in.');
      navigate('/login', { state: { email: email.trim() } });
    } catch (err) {
      toast.error('Verification failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    try {
      await resendEmailOtp(email.trim());
      toast.success('Code sent', 'A new verification code is on its way.');
      setCooldown(30);
    } catch (err) {
      toast.error('Could not resend', apiErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your inbox."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-3.5 text-sm">
          <MailCheck size={18} className="text-integrity" />
          <span className="text-muted">Codes expire in 10 minutes.</span>
        </div>

        {!initialEmail && (
          <Input
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}

        <OtpInput value={otp} onChange={setOtp} />

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Verify and continue'}
        </Button>

        <div className="text-center text-sm text-muted">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0}
            className="font-medium text-brand hover:underline disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
