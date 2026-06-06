import { useCallback, useEffect, useRef, useState } from 'react';

export type ViolationType =
  | 'tab-hidden'
  | 'focus-lost'
  | 'fullscreen-exit'
  | 'clipboard'
  | 'context-menu'
  | 'devtools-keys';

export interface Violation {
  type: ViolationType;
  label: string;
  at: number;
}

const labels: Record<ViolationType, string> = {
  'tab-hidden': 'Switched away from the exam tab',
  'focus-lost': 'Exam window lost focus',
  'fullscreen-exit': 'Exited fullscreen mode',
  clipboard: 'Copy / paste blocked',
  'context-menu': 'Right-click blocked',
  'devtools-keys': 'Blocked a restricted shortcut',
};

interface Options {
  active: boolean;
  maxViolations?: number;
  onViolation?: (violation: Violation) => void;
  onLimitReached?: () => void;
}

export function useProctoring({ active, maxViolations = 5, onViolation, onLimitReached }: Options) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const countRef = useRef(0);
  const limitFiredRef = useRef(false);
  const onViolationRef = useRef(onViolation);
  const onLimitRef = useRef(onLimitReached);
  onViolationRef.current = onViolation;
  onLimitRef.current = onLimitReached;

  const record = useCallback(
    (type: ViolationType) => {
      const violation: Violation = { type, label: labels[type], at: Date.now() };
      countRef.current += 1;
      setViolations((prev) => [...prev, violation]);
      onViolationRef.current?.(violation);
      if (countRef.current >= maxViolations && !limitFiredRef.current) {
        limitFiredRef.current = true;
        onLimitRef.current?.();
      }
    },
    [maxViolations],
  );

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user gesture required or unsupported */
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden) record('tab-hidden');
    };
    const onBlur = () => record('focus-lost');
    const onFullscreen = () => {
      if (!document.fullscreenElement) record('fullscreen-exit');
    };
    const onClipboard = (e: Event) => {
      e.preventDefault();
      record('clipboard');
    };
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      record('context-menu');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const blocked =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 'p', 's'].includes(e.key.toLowerCase()));
      if (blocked) {
        e.preventDefault();
        record('devtools-keys');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('paste', onClipboard);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('cut', onClipboard);
      document.removeEventListener('paste', onClipboard);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, record]);

  return { violations, count: violations.length, requestFullscreen };
}
