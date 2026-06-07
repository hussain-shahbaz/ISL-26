import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ScanFace,
  Fingerprint,
  Activity,
  BrainCircuit,
  Database,
  Network,
  GraduationCap,
  Timer,
  Eye,
  FileCheck2,
  ArrowRight,
  Lock,
  Layers,
  KeyRound,
  Gauge,
  RefreshCw,
  Server,
  EyeOff,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Reveal } from '@/components/marketing/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_30%,transparent),transparent_62%)] blur-3xl animate-aurora" />
      <div className="absolute -right-20 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--integrity)_26%,transparent),transparent_62%)] blur-3xl animate-aurora [animation-delay:-6s]" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--exam)_24%,transparent),transparent_62%)] blur-3xl animate-aurora [animation-delay:-11s]" />
    </div>
  );
}

const stats = [
  { value: '6', label: 'Independent microservices' },
  { value: '5', label: 'Distributed databases' },
  { value: 'SHA-256', label: 'Tamper-evident audit chain' },
  { value: '<150ms', label: 'Gateway auth overhead' },
];

const platform = [
  {
    icon: ScanFace,
    tone: 'brand' as const,
    title: 'Verified identity',
    body: 'OTP-backed onboarding, device fingerprinting and a single edge-verified JWT mean every request is provably the right person.',
  },
  {
    icon: Eye,
    tone: 'proctor' as const,
    title: 'Live proctoring signals',
    body: 'Tab-switch, window-blur, fullscreen-exit and clipboard events are captured the instant they happen during an exam.',
  },
  {
    icon: BrainCircuit,
    tone: 'integrity' as const,
    title: 'AI grading & plagiarism',
    body: 'LLM-assisted scoring with semantic similarity over a vector store flags collusion the eye would miss.',
  },
  {
    icon: FileCheck2,
    tone: 'exam' as const,
    title: 'Authoring that enforces rules',
    body: 'A strict exam state machine guarantees marks reconcile and a paper can never publish half-formed.',
  },
];

const databases = [
  { icon: Database, name: 'PostgreSQL', role: 'Relational source of truth', tone: 'exam' as const },
  { icon: Layers, name: 'MongoDB', role: 'Audit logs & submissions', tone: 'integrity' as const },
  { icon: Activity, name: 'Redis', role: 'Sessions, OTP & rate limits', tone: 'risk' as const },
  { icon: BrainCircuit, name: 'ChromaDB', role: 'Semantic plagiarism vectors', tone: 'brand' as const },
  { icon: Network, name: 'Neo4j', role: 'Collusion graph analytics', tone: 'proctor' as const },
];

const security = [
  {
    icon: Lock,
    title: 'Edge authentication',
    body: 'The gateway verifies the JWT once, strips any inbound identity headers, and re-injects a trusted identity so services never trust the client directly.',
  },
  {
    icon: KeyRound,
    title: 'Role-based access control',
    body: 'Student, teacher and admin scopes are enforced at the gateway and again inside each service. Privileged routes simply cannot be reached out of role.',
  },
  {
    icon: Gauge,
    title: 'Brute-force defense',
    body: 'Per-route rate limiting and login lockout return HTTP 429, while OTP attempts are capped and temporarily blocked after repeated failures.',
  },
  {
    icon: RefreshCw,
    title: 'Session hygiene',
    body: 'Short-lived access tokens, device-bound sessions and refresh rotation. Changing a password revokes every active session instantly.',
  },
  {
    icon: Server,
    title: 'Zero-trust between services',
    body: 'Service-to-service calls carry a shared secret, and registration-style operations are restricted to internal-only routes.',
  },
  {
    icon: EyeOff,
    title: 'Data minimization',
    body: 'Passwords and tokens are bcrypt-hashed, and sensitive fields are redacted before anything is ever written to the audit log.',
  },
];

const flow = [
  { icon: Fingerprint, title: 'Authenticate', body: 'Register, verify by OTP, and receive a short-lived signed token.' },
  { icon: GraduationCap, title: 'Enter the exam', body: 'Fullscreen lockdown engages and the secure timer starts server-side.' },
  { icon: Eye, title: 'Stay monitored', body: 'Integrity signals stream to a tamper-evident log as you answer.' },
  { icon: FileCheck2, title: 'Submit & grade', body: 'Answers are graded and screened for plagiarism, results sealed.' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <section className="relative grain px-5 pb-24 pt-36 md:pt-44">
        <Aurora />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge tone="brand" className="mb-5 animate-pulse-ring">
              <ShieldCheck size={13} /> Security-first examination platform
            </Badge>
            <h1 className="text-balance text-5xl font-bold leading-[1.05] md:text-7xl">
              Exams you can <span className="text-gradient">actually trust</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted">
              ExamPro pairs verified identity, real-time proctoring and a tamper-evident
              audit trail with AI grading, on a distributed, production-grade backend.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="group">
                  Launch a secure exam
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#architecture">
                <Button variant="outline" size="lg">
                  Explore the architecture
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Floating integrity console */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-16 max-w-4xl [perspective:1200px]"
          >
            <div className="glass-strong overflow-hidden rounded-3xl p-1.5 shadow-glow">
              <div className="rounded-[1.35rem] bg-surface/80 p-5 md:p-7">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-risk" />
                    <span className="h-2.5 w-2.5 rounded-full bg-proctor" />
                    <span className="h-2.5 w-2.5 rounded-full bg-integrity" />
                    <span className="ml-2 font-mono text-xs">integrity-monitor · live</span>
                  </div>
                  <Badge tone="integrity">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-integrity" /> secure
                  </Badge>
                </div>
                <div className="grid gap-3 pt-5 md:grid-cols-3">
                  {[
                    { icon: ScanFace, label: 'Identity verified', value: 'OTP + device hash', tone: 'text-brand' },
                    { icon: Timer, label: 'Server timer', value: '00:42:17 remaining', tone: 'text-exam' },
                    { icon: Lock, label: 'Audit chain', value: '1,204 links intact', tone: 'text-integrity' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl border border-border bg-surface-2/50 p-4 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <row.icon size={18} className={row.tone} />
                      <p className="mt-3 text-xs uppercase tracking-wide text-muted">{row.label}</p>
                      <p className="mt-1 font-mono text-sm">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Stats band ---------------- */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08} className="px-6 py-8 text-center">
              <p className="font-display text-3xl font-bold text-gradient md:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-sm text-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Platform / bento ---------------- */}
      <section id="platform" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge tone="exam" className="mb-4">The platform</Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Everything an exam needs to stay honest</h2>
            <p className="mt-4 text-muted">
              Four pillars working together, each backed by its own service and data store.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {platform.map((feat, i) => (
              <Reveal key={feat.title} delay={i * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-elev">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-2">
                    <feat.icon size={22} className="text-brand" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold">{feat.title}</h3>
                  <p className="mt-2 text-pretty text-muted">{feat.body}</p>
                  <Badge tone={feat.tone} className="mt-5 capitalize">
                    {feat.tone}
                  </Badge>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Integrity ---------------- */}
      <section id="integrity" className="relative overflow-hidden px-5 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--integrity)_14%,transparent),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Badge tone="integrity" className="mb-4">Provable integrity</Badge>
            <h2 className="text-4xl font-bold md:text-5xl">
              A log that <span className="text-integrity">cannot be quietly rewritten</span>
            </h2>
            <p className="mt-4 text-muted">
              Every security event is sanitized and chained with a SHA-256 hash of the one before
              it. Alter a single record and the chain breaks, visibly and verifiably.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Hash-chained, append-only audit trail',
                'Sensitive fields redacted before storage',
                'One-command chain verification endpoint',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <ShieldCheck size={18} className="shrink-0 text-integrity" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="glass rounded-2xl p-5 font-mono text-xs">
              {[
                { id: 'log_001', hash: '9f2a…c1', ok: true },
                { id: 'log_002', hash: 'a73b…4e', ok: true },
                { id: 'log_003', hash: 'e0d9…7a', ok: true },
                { id: 'log_004', hash: '— altered —', ok: false },
              ].map((node, i) => (
                <div key={node.id} className="flex flex-col">
                  <div
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                      node.ok
                        ? 'border-border bg-surface-2/60'
                        : 'border-risk/50 bg-[color-mix(in_oklab,var(--risk)_12%,transparent)]'
                    }`}
                  >
                    <span className="text-muted">{node.id}</span>
                    <span className={node.ok ? 'text-integrity' : 'text-risk'}>{node.hash}</span>
                  </div>
                  {i < 3 && <span className="ml-4 h-4 w-px bg-border" />}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Security / defense in depth ---------------- */}
      <section id="security" className="border-y border-border bg-surface/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge tone="risk" className="mb-4">Defense in depth</Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Security at every layer</h2>
            <p className="mt-4 text-muted">
              Not a single gate, but overlapping controls from the browser to the database, so no
              one mistake becomes a breach.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {security.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface">
                    <item.icon size={20} className="text-brand" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-sm text-muted">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Architecture / databases ---------------- */}
      <section id="architecture" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge tone="brand" className="mb-4">Distributed by design</Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Polyglot persistence, on purpose</h2>
            <p className="mt-4 text-muted">
              Each workload runs on the database that fits it best, orchestrated behind a single
              gateway and shipped with Docker Compose.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {databases.map((db, i) => (
              <Reveal key={db.name} delay={i * 0.06}>
                <div className="group h-full rounded-2xl border border-border bg-surface p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elev">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface-2 transition-transform duration-300 group-hover:scale-110">
                    <db.icon size={24} className="text-foreground" />
                  </span>
                  <h3 className="mt-4 font-semibold">{db.name}</h3>
                  <p className="mt-1 text-xs text-muted">{db.role}</p>
                  <Badge tone={db.tone} className="mt-4">live</Badge>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Flow ---------------- */}
      <section id="flow" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge tone="proctor" className="mb-4">The exam journey</Badge>
            <h2 className="text-4xl font-bold md:text-5xl">From login to sealed result</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {flow.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-border bg-surface p-6">
                  <span className="font-mono text-sm text-muted">0{i + 1}</span>
                  <span className="mt-4 grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2">
                    <step.icon size={20} className="text-brand" />
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="px-5 pb-24">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_60%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl font-bold md:text-5xl">
                Run your next exam with confidence
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted">
                Spin up the full stack with one command, or jump straight in and create an account.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register">
                  <Button size="lg">Create your account</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-border px-5 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm text-muted">
                A security-first online examination system: verified identity, live proctoring,
                tamper-evident auditing and AI grading.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
                <ShieldCheck size={14} className="text-integrity" /> Built for IS & ADBMS
              </p>
            </div>

            {[
              {
                title: 'Platform',
                links: [
                  { label: 'Capabilities', href: '#platform' },
                  { label: 'Integrity', href: '#integrity' },
                  { label: 'Security', href: '#security' },
                  { label: 'Architecture', href: '#architecture' },
                ],
              },
              {
                title: 'Get started',
                links: [
                  { label: 'Create account', href: '/register' },
                  { label: 'Sign in', href: '/login' },
                  { label: 'Exam journey', href: '#flow' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-sm font-semibold">Built with</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['React', 'Node.js', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis', 'ChromaDB', 'Neo4j'].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="rounded-md border border-border bg-surface-2/50 px-2 py-1 text-xs text-muted"
                    >
                      {tech}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted md:flex-row">
            <p>Secure Online Examination System</p>
            <p className="font-mono text-xs">© {new Date().getFullYear()} ExamPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
