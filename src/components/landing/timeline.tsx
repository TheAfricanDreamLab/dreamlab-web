'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { useScrubbed } from './motion';

export type Milestone = {
  when: string;
  title: string;
  credits: string;
  text: string;
};

const PATH = 'M200 10 C 300 140, 100 260, 200 390 S 300 640, 200 770 S 120 900, 200 990';

/**
 * The programme's fifteen weeks on a curved line that draws itself as you scroll (from forest green
 * to gold). Milestones sit on the curve, alternating sides; on phones it becomes a straight line.
 */
export function Timeline({ milestones }: { milestones: Milestone[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useScrubbed(ref, setProgress);
  const path = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number; at: number }[]>([]);

  useEffect(() => {
    const p = path.current;
    if (!p) return;
    const total = p.getTotalLength();
    setPoints(
      milestones.map((_, i) => {
        const at = (i + 0.5) / milestones.length;
        const pt = p.getPointAtLength(total * at);
        return { x: pt.x / 400, y: pt.y / 1000, at };
      }),
    );
  }, [milestones]);

  return (
    <div ref={ref}>
      {/* Phones and small tablets: a straight line. */}
      <ol className="mx-auto max-w-md text-center md:hidden">
        {milestones.map((m) => (
          <li
            key={m.title}
            className="flex flex-col items-center not-last:after:my-3 not-last:after:block not-last:after:h-8 not-last:after:w-[2px] not-last:after:bg-success-line"
          >
            <span aria-hidden className="mb-2 h-4 w-4 rounded-full border-[3px] border-primary bg-white" />
            <p className="inline-block rounded-md bg-forest px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-white">{m.when}</p>
            <h3 className="mt-2 text-[18px] font-bold text-ink">
              {m.title} <span className="text-[13px] font-semibold text-gold-ink">· {m.credits}</span>
            </h3>
            <p className="text-[14px] leading-relaxed text-body">{m.text}</p>
          </li>
        ))}
      </ol>

      {/* Larger screens: the curve. */}
      <div className="relative mx-auto hidden h-[900px] max-w-4xl md:block">
        <svg viewBox="0 0 400 1000" preserveAspectRatio="none" className="absolute left-1/2 top-0 h-full w-[400px] -translate-x-1/2" aria-hidden>
          <defs>
            <linearGradient id="dl-timeline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a3d29" />
              <stop offset="0.55" stopColor="#159b62" />
              <stop offset="1" stopColor="#b8963a" />
            </linearGradient>
          </defs>
          <path d={PATH} fill="none" stroke="#e4e9f2" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path
            ref={path}
            d={PATH}
            fill="none"
            stroke="url(#dl-timeline)"
            strokeWidth="5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - progress}
          />
        </svg>
        <ol>
          {milestones.map((m, i) => {
            const pt = points[i];
            if (!pt) return null;
            const reached = progress >= pt.at - 0.04;
            const left = i % 2 === 0;
            return (
              <li
                key={m.title}
                className="absolute"
                style={{
                  top: `${pt.y * 100}%`,
                  left: `calc(50% + ${(pt.x - 0.5) * 400}px)`,
                }}
              >
                <span
                  aria-hidden
                  className={cx(
                    'absolute -left-[11px] -top-[11px] h-[22px] w-[22px] rounded-full border-[5px] bg-white transition-all duration-500',
                    reached ? 'scale-100 border-primary' : 'scale-50 border-line-heavy',
                  )}
                />
                <div
                  className={cx(
                    'absolute top-1/2 flex w-[300px] -translate-y-1/2 items-center gap-4 transition-all duration-700',
                    left ? 'right-6 flex-row-reverse text-right' : 'left-6',
                    reached ? 'opacity-100' : 'opacity-0 ' + (left ? '-translate-x-4' : 'translate-x-4'),
                  )}
                >
                  <span className="shrink-0 rounded-md bg-forest px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white shadow-[var(--shadow-soft)]">
                    {m.when}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[19px] font-bold text-ink">{m.title}</span>
                    <span className="block text-[12.5px] font-semibold text-gold-ink">{m.credits}</span>
                    <span className="block text-[13.5px] leading-relaxed text-body">{m.text}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
