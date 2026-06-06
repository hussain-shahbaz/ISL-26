import { Monitor, Moon, Sun, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/lib/theme';
import { useAuthStore } from '@/store/auth';
import { initialsOf } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
      <PageHeader title="Settings" description="Manage your profile and appearance." />

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
    </div>
  );
}
