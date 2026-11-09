'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value when it first appears (UX-2). Short (about 0.6 s), eased, and
 * shown at once for people who ask for less motion or when JavaScript is late: the final value is always
 * what's in the HTML, so screen readers and copy-paste never see the in-between numbers.
 */
export function CountUp({ value, duration = 600, format = (n: number) => n.toLocaleString('en-GB') }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !Number.isFinite(value) || value <= 0) return;
    started.current = true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const whole = Number.isInteger(value);
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = value * eased;
      setShown(p < 1 ? (whole ? Math.round(n) : Math.round(n * 10) / 10) : value);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  if (shown === value) return <>{format(value)}</>;
  return (
    <>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
