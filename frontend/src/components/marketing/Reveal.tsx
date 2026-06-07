import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

// Honors `prefers-reduced-motion`: when reduced motion is requested we only
// fade in (no movement/blur), which is the WCAG-friendly behavior.
const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={prefersReduced ? reducedVariants : variants}
      transition={{ duration: prefersReduced ? 0.2 : 0.6, delay: prefersReduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
