import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Moon, Sun, ShieldCheck, KeyRound, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Field, PasswordInput } from '@/components/form/fields';
import { useTheme } from '@/lib/theme';
import { useAuthStore } from '@/store/auth';
import { initialsOf, cn } from '@/lib/utils';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { changePassword, logout as apiLogout } from '@/features/auth/api';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { preference, setPreference } = useTheme();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, security, and appearance." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold">Profile</h3>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--integrity))] text-xl font-semibold text-[#04121a]">
                {user ? initialsOf(user.name || user.email) : '?'}
              </span>
              <div>
                <p className="font-medium">{user?.name || 'Account'}</p>
                <p className="text-sm text-muted">{user?.email}</p>
                <Badge tone="brand" className="mt-2 capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-muted">User ID</span>
                <span className="font-mono text-xs">{user?.userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Identity</span>
                <span className="inline-flex items-center gap-1.5 text-integrity">
                  <ShieldCheck size={15} /> Verified
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold">Appearance</h3>
            <p className="mt-1 text-sm text-muted">Choose how ExamPro looks to you.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreference(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                    preference === opt.value
                      ? 'border-brand bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] shadow-glow'
                      : 'border-border hover:bg-surface-2',
                  )}
                >
                  <opt.icon size={20} className={preference === opt.value ? 'text-brand' : 'text-muted'} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      toast.error('Passwords do not match', 'Re-enter the new password.');
      return;
    }
    if (next === current) {
      toast.error('Choose a new password', 'It must differ from your current one.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success('Password changed', 'Sign in again with your new password.');
      // Backend revokes all sessions; force a clean re-authentication.
      await apiLogout();
      clear();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Could not change password', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-brand" />
          <h3 className="font-semibold">Security</h3>
        </div>
        <p className="mt-1 text-sm text-muted">
          Change your password. For your safety, all active sessions are signed out afterward.
        </p>
        <form onSubmit={onSubmit} className="mt-5 grid max-w-md gap-4">
          <Field label="Current password" htmlFor="current-password">
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password">
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <KeyRound size={16} />} Update password
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <LogOut size={13} /> You will be signed out
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
