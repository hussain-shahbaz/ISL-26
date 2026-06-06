import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, OtpInput, PasswordInput } from '@/components/form/fields';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { forgotPassword, verifyResetOtp, resetPassword } from '@/features/auth/api';

type Step = 'email' | 'otp' | 'password';

const steps: Step[] = ['email', 'otp', 'password'];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      toast.success('Reset code sent', 'Check your inbox for a 6-digit code.');
      setStep('otp');
    } catch (err) {
      toast.error('Request failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Incomplete code', 'Enter all 6 digits.');
    setLoading(true);
    try {
      await verifyResetOtp(email.trim(), otp);
      toast.success('Code verified', 'Now choose a new password.');
      setStep('password');
    } catch (err) {
      toast.error('Verification failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Weak password', 'Use at least 8 characters.');
    setLoading(true);
    try {
      await resetPassword(email.trim(), password);
      toast.success('Password updated', 'Sign in with your new password.');
      navigate('/login', { state: { email: email.trim() } });
    } catch (err) {
      toast.error('Reset failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = steps.indexOf(step);

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll verify it's you, then let you set a new password."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {/* Step indicator */}
      <div className="mb-7 flex items-center gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? 'bg-brand' : 'bg-surface-3'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 'email' && (
            <form onSubmit={submitEmail} className="space-y-5">
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : 'Send reset code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={submitOtp} className="space-y-6">
              <p className="text-sm text-muted">
                Enter the code sent to <span className="text-foreground">{email}</span>.
              </p>
              <OtpInput value={otp} onChange={setOtp} />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : 'Verify code'}
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={submitPassword} className="space-y-5">
              <Field label="New password" htmlFor="password" hint="Min 8 characters">
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  required
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : 'Update password'}
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}
