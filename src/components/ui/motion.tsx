'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value when it first appears (UX-2). Short (about 0.6 s), eased, and
 * shown at once for people who ask for less motion or when JavaScript is late: the final value is always
 * what's in the HTML, so screen readers and copy-paste never see the in-between numbers. A later change
 * of value shows at once.
 *
 * Plain props only (server pages render it): `decimals` shows up to that many decimal places (82, 82.5),
 * `suffix` follows the number ("%").
 */
export function CountUp({ value, duration = 600, decimals = 0, suffix = '' }: { value: number; duration?: number; decimals?: number; suffix?: string }) {
  // The in-between number while counting, tied to the value it counts towards.
  const [step, setStep] = useState<{ to: number; n: number } | null>(null);
  const started = useRef(false);
  const format = (n: number) => `${n.toLocaleString('en-GB', { maximumFractionDigits: decimals })}${suffix}`;

  useEffect(() => {
    if (started.current || !Number.isFinite(value) || value <= 0) return;
    started.current = true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const scale = 10 ** decimals;
    const target = value;
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setStep(p < 1 ? { to: target, n: Math.round(target * eased * scale) / scale } : null);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, decimals]);

  // Counting only towards the current value; a new value (or the end) shows the value itself.
  if (!step || step.to !== value || step.n === value) return <>{format(value)}</>;
  return (
    <>
      <span aria-hidden>{format(step.n)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
