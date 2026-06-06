import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';

export default function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_22%,transparent),transparent_60%)] blur-2xl" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center"
      >
        <Logo className="mb-8 justify-center" />
        <p className="font-display text-[7rem] font-bold leading-none text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page slipped past proctoring</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          The route you requested does not exist or has been moved.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button size="lg">Back to safety</Button>
        </Link>
      </motion.div>
    </main>
  );
}
