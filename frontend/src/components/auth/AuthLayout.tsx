import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ScanFace, Activity } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const highlights = [
  { icon: ScanFace, text: 'Identity verified with OTP and device binding' },
  { icon: Activity, text: 'Every action streamed to a tamper-evident log' },
  { icon: Lock, text: 'Short-lived tokens, verified at the edge' },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#05080f] text-white lg:block">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(11,187,228,0.35),transparent_60%)] blur-3xl animate-aurora" />
          <div className="absolute -right-16 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(18,184,134,0.3),transparent_60%)] blur-3xl animate-aurora [animation-delay:-7s]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/">
            <Logo className="[&_span]:text-white" />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
              <ShieldCheck size={13} /> Secure Online Examination
            </span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-tight">
              Integrity you can <span className="text-gradient">verify</span>, not just trust.
            </h2>
            <ul className="mt-8 space-y-4">
              {highlights.map((h, i) => (
                <motion.li
                  key={h.text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
                  className="flex items-center gap-3 text-sm text-white/75"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5">
                    <h.icon size={16} className="text-[var(--brand)]" />
                  </span>
                  {h.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <p className="font-mono text-xs text-white/40">© {new Date().getFullYear()} ExamPro</p>
        </div>
      </aside>

      {/* Form panel — locked to light mode for the signature split look. */}
      <main className="auth-light relative flex flex-col bg-background text-foreground">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <span className="hidden lg:block" />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
