import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Countdown timer component for exam taking.
 * @param {number} durationMinutes — total exam duration in minutes
 * @param {function} onTimeUp — callback when timer reaches 0
 */
export default function ExamTimer({ durationMinutes, onTimeUp }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const totalSeconds = durationMinutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  // Urgency levels
  let urgency = 'normal';
  if (secondsLeft <= 60) urgency = 'critical';
  else if (secondsLeft <= 300) urgency = 'warning';

  // Urgency classes
  let timerClasses = 'bg-primary/8 border border-primary/20 text-primary';
  let barBgClasses = 'bg-primary/15';
  let barFillClasses = 'bg-primary';

  if (urgency === 'warning') {
    timerClasses = 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400';
    barBgClasses = 'bg-amber-500/15';
    barFillClasses = 'bg-amber-500';
  } else if (urgency === 'critical') {
    timerClasses = 'bg-red-500/10 border border-red-500/35 text-red-600 dark:text-red-400 animate-timer-pulse';
    barBgClasses = 'bg-red-500/15';
    barFillClasses = 'bg-red-500';
  }

  return (
    <div className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl tabular-nums transition-all duration-400 ${timerClasses}`} id="exam-timer">
      <div className="flex items-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div className="flex items-center text-xl font-bold font-mono shrink-0">
        {hours > 0 && <span className="w-[30px] text-center">{pad(hours)}</span>}
        {hours > 0 && <span className="opacity-50 animate-blink">:</span>}
        <span className="w-[30px] text-center">{pad(minutes)}</span>
        <span className="opacity-50 animate-blink">:</span>
        <span className="w-[30px] text-center">{pad(seconds)}</span>
      </div>
      <div className={`flex-1 min-w-[60px] h-1 rounded overflow-hidden ${barBgClasses}`}>
        <div
          className={`h-full rounded transition-all duration-1000 ease-linear ${barFillClasses}`}
          style={{ width: `${100 - progress}%` }}
        />
      </div>
    </div>
  );
}
