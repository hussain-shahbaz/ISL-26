import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  Fingerprint,
  Lock,
  Activity,
  CircleHelp,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { logout as apiLogout } from '@/features/auth/api';
import { initialsOf, cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}
interface NavGroup {
  section: string;
  items: NavItem[];
}

const navByRole: Record<Role, NavGroup[]> = {
  student: [
    { section: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Examinations',
      items: [
        { to: '/app/exams', label: 'My exams', icon: FileText },
        { to: '/app/results', label: 'Results', icon: Award },
      ],
    },
  ],
  teacher: [
    { section: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Teaching',
      items: [
        { to: '/app/exams', label: 'Exams', icon: FileText },
        { to: '/app/exams/new', label: 'Create exam', icon: PlusCircle },
      ],
    },
  ],
  admin: [
    { section: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Administration',
      items: [
        { to: '/app/users', label: 'Users', icon: Users },
        { to: '/app/audit', label: 'Audit log', icon: ScrollText },
        { to: '/app/risk', label: 'Integrity graph', icon: Workflow },
      ],
    },
  ],
};

const roleTone: Record<Role, 'brand' | 'exam' | 'proctor'> = {
  student: 'brand',
  teacher: 'exam',
  admin: 'proctor',
};

// Used for the header's contextual page title.
const TITLES: { match: RegExp; title: string; group: string }[] = [
  { match: /^\/app$/, title: 'Dashboard', group: 'Overview' },
  { match: /^\/app\/exams\/new$/, title: 'Create exam', group: 'Teaching' },
  { match: /^\/app\/exams\/[^/]+$/, title: 'Exam detail', group: 'Examinations' },
  { match: /^\/app\/exams$/, title: 'Exams', group: 'Examinations' },
  { match: /^\/app\/results$/, title: 'Results', group: 'Examinations' },
  { match: /^\/app\/users$/, title: 'Users', group: 'Administration' },
  { match: /^\/app\/audit$/, title: 'Audit log', group: 'Administration' },
  { match: /^\/app\/risk$/, title: 'Integrity graph', group: 'Administration' },
  { match: /^\/app\/settings$/, title: 'Settings', group: 'Account' },
];

function usePageMeta() {
  const { pathname } = useLocation();
  return TITLES.find((t) => t.match.test(pathname)) ?? { title: 'ExamPro', group: 'Workspace' };
}

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const groups = navByRole[role];
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
      isActive ? 'text-foreground' : 'text-muted hover:bg-surface-2 hover:text-foreground',
    );

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.section}>
          <p className="px-3.5 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted/70">
            {group.section}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl border border-border bg-surface-2"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <item.icon size={18} className={cn('relative z-10', isActive && 'text-brand')} />
                    <span className="relative z-10 font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="px-3.5 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted/70">
          Account
        </p>
        <NavLink to="/app/settings" onClick={onNavigate} className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-border bg-surface-2"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Settings size={18} className="relative z-10" />
              <span className="relative z-10 font-medium">Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

function SidebarFooter({ role }: { role: Role }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-3.5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-integrity/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-integrity" />
        </span>
        <p className="text-xs font-medium text-foreground">Secure session</p>
        <Badge tone={roleTone[role]} className="ml-auto capitalize">
          {role}
        </Badge>
      </div>
      <ul className="mt-3 space-y-1.5 text-[0.7rem] text-muted">
        <li className="flex items-center gap-1.5">
          <Fingerprint size={12} className="text-brand" /> Identity verified at the gateway
        </li>
        <li className="flex items-center gap-1.5">
          <ScrollText size={12} className="text-brand" /> Actions written to a tamper-evident log
        </li>
      </ul>
    </div>
  );
}

function SecurityPopover() {
  const [open, setOpen] = useState(false);
  const facts = [
    { icon: Fingerprint, label: 'Device-bound session', value: 'Active' },
    { icon: Lock, label: 'Token verification', value: 'At the edge' },
    { icon: Activity, label: 'Audit logging', value: 'Tamper-evident' },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        aria-label="Session security"
      >
        <ShieldCheck size={18} className="text-integrity" />
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
              className="glass-strong absolute right-0 z-50 mt-2 w-72 rounded-xl p-3 shadow-elev"
            >
              <p className="px-1 text-sm font-medium">Session security</p>
              <p className="px-1 text-xs text-muted">This session is protected end to end.</p>
              <div className="mt-3 space-y-1">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                    <f.icon size={15} className="text-brand" />
                    <span className="flex-1 text-sm">{f.label}</span>
                    <span className="text-xs font-medium text-integrity">{f.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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
  const meta = usePageMeta();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface/40 p-4 lg:flex">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <Logo />
        </Link>
        <div className="mt-6 flex-1 overflow-y-auto">
          <SidebarNav role={role} />
        </div>
        <SidebarFooter role={role} />
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
              <div className="mt-6 flex-1 overflow-y-auto">
                <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter role={role} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">{meta.group}</p>
              <h1 className="text-sm font-semibold leading-tight">{meta.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/#architecture"
              className="hidden h-10 w-10 place-items-center rounded-xl border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:grid"
              aria-label="Help & architecture"
            >
              <CircleHelp size={18} />
            </a>
            <SecurityPopover />
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
