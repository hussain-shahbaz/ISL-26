import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Award,
  Users,
  ScrollText,
  Workflow,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { logout as apiLogout } from '@/features/auth/api';
import { initialsOf } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const navByRole: Record<Role, NavItem[]> = {
  student: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/exams', label: 'My Exams', icon: FileText },
    { to: '/app/results', label: 'Results', icon: Award },
  ],
  teacher: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/exams', label: 'Exams', icon: FileText },
    { to: '/app/exams/new', label: 'Create exam', icon: PlusCircle },
  ],
  admin: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/users', label: 'Users', icon: Users },
    { to: '/app/audit', label: 'Audit log', icon: ScrollText },
    { to: '/app/risk', label: 'Integrity graph', icon: Workflow },
  ],
};

const roleTone: Record<Role, 'brand' | 'exam' | 'proctor'> = {
  student: 'brand',
  teacher: 'exam',
  admin: 'proctor',
};

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = navByRole[role];
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
              isActive ? 'text-foreground' : 'text-muted hover:text-foreground hover:bg-surface-2',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-border bg-surface-2"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon
                size={18}
                className={cn('relative z-10', isActive && 'text-brand')}
              />
              <span className="relative z-10 font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <NavLink
        to="/app/settings"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'mt-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
            isActive ? 'text-foreground bg-surface-2' : 'text-muted hover:text-foreground hover:bg-surface-2',
          )
        }
      >
        <Settings size={18} />
        <span className="font-medium">Settings</span>
      </NavLink>
    </nav>
  );
}

function UserMenu() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await apiLogout();
    clear();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-surface-3"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--brand),var(--integrity))] text-xs font-semibold text-[#04121a]">
          {initialsOf(user.name || user.email)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-medium leading-tight">{user.name || user.email}</span>
          <span className="block text-[0.65rem] capitalize leading-tight text-muted">{user.role}</span>
        </span>
        <ChevronDown size={15} className="text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="glass-strong absolute right-0 z-50 mt-2 w-60 rounded-xl p-2 shadow-elev"
            >
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium">{user.name || 'Account'}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <Badge tone={roleTone[user.role]} className="mt-2 capitalize">
                  {user.role}
                </Badge>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link
                to="/app/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Settings size={16} /> Settings
              </Link>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-risk transition-colors hover:bg-[color-mix(in_oklab,var(--risk)_12%,transparent)]"
              >
                <LogOut size={16} /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell() {
  const role = useAuthStore((s) => s.user?.role) ?? 'student';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface/40 p-4 lg:flex">
        <Link to="/" className="px-2 py-2">
          <Logo />
        </Link>
        <div className="mt-6 flex-1">
          <SidebarNav role={role} />
        </div>
        <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-xs text-muted">
          <p className="font-medium text-foreground">Secure session</p>
          <p className="mt-1">Identity verified at the gateway on every request.</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface p-4 lg:hidden"
            >
              <div className="flex items-center justify-between px-2 py-2">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="text-muted">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6">
                <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-xl">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
