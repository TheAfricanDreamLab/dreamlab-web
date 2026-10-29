import { cx } from '@/components/ui/primitives';
import { DIMENSION_SHORT, type DreamScore, tenth } from '@/lib/outcomes';

type Dimension = DreamScore['dimensions'][number];

/**
 * The ten dimensions as a radar (0–10 on every axis). Dimensions without evidence sit at the centre
 * and are named in the description, so the shape never pretends to know more than it does.
 */
export function DreamScoreRadar({ dimensions, className }: { dimensions: Dimension[]; className?: string }) {
  const size = 360;
  const c = size / 2;
  const r = 120;
  const n = dimensions.length;
  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(angle) * r * (value / 10), c + Math.sin(angle) * r * (value / 10)] as const;
  };
  const shape = dimensions.map((d, i) => point(i, d.score ?? 0).join(',')).join(' ');
  const missing = dimensions.filter((d) => d.score === null).map((d) => d.label);
  const desc = `${dimensions.map((d) => `${d.label} ${d.score === null ? 'no evidence yet' : tenth(d.score)}`).join('; ')}.${missing.length ? ` No evidence yet for ${missing.join(', ')}.` : ''}`;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby="radar-title radar-desc" className={cx('h-auto w-full max-w-[420px]', className)}>
      <title id="radar-title">Dream Score by dimension</title>
      <desc id="radar-desc">{desc}</desc>
      {[2, 4, 6, 8, 10].map((ring) => (
        <polygon key={ring} points={dimensions.map((_, i) => point(i, ring).join(',')).join(' ')} fill="none" stroke="var(--color-line)" strokeWidth={ring === 10 ? 1.5 : 1} />
      ))}
      {dimensions.map((_, i) => {
        const [x, y] = point(i, 10);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-line)" />;
      })}
      <polygon points={shape} fill="var(--color-primary)" fillOpacity={0.18} stroke="var(--color-primary)" strokeWidth={2} />
      {dimensions.map((d, i) => {
        const [x, y] = point(i, d.score ?? 0);
        return d.score === null ? null : <circle key={d.key} cx={x} cy={y} r={3.5} fill="var(--color-primary)" />;
      })}
      {dimensions.map((d, i) => {
        const [x, y] = point(i, 12.4);
        const anchor = Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end';
        return (
          <text key={d.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={11.5} fill={d.score === null ? 'var(--color-faint)' : 'var(--color-body)'}>
            {DIMENSION_SHORT[d.key]} {d.score === null ? '–' : tenth(d.score)}
          </text>
        );
      })}
    </svg>
  );
}

/** The same ten dimensions as a ranked list (small screens), weakest with evidence highlighted. */
export function DreamScoreBars({ dimensions, className }: { dimensions: Dimension[]; className?: string }) {
  const ranked = [...dimensions].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const scored = ranked.filter((d) => d.score !== null);
  const weakest = scored.at(-1)?.key;
  return (
    <ul className={cx('space-y-2', className)} aria-label="Dream Score by dimension, strongest first">
      {ranked.map((d) => (
        <li key={d.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className={cx('font-semibold', d.key === weakest ? 'text-danger-ink' : 'text-ink')}>
              {d.label}
              {d.key === weakest && scored.length > 1 && <span className="font-normal text-muted"> · weakest</span>}
            </span>
            <span className="font-mono text-muted">{d.score === null ? 'No evidence yet' : `${tenth(d.score)} · ${d.evidence} ${d.evidence === 1 ? 'item' : 'items'}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-line" aria-hidden>
            <div className={cx('h-full rounded-full', d.key === weakest ? 'bg-danger' : 'bg-primary')} style={{ width: `${((d.score ?? 0) / 10) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SERIES = [
  { key: 'learning', label: 'Learning', color: 'var(--color-gold)' },
  { key: 'building', label: 'Building', color: 'var(--color-link)' },
  { key: 'dream', label: 'Dream', color: 'var(--color-primary)' },
] as const;

/** Weekly snapshots as three lines (0–10), with a table for screen readers. */
export function DreamScoreGrowth({ growth }: { growth: DreamScore['growth'] }) {
  if (growth.length === 0) return <p className="text-[14px] text-muted">Your growth line starts with your first week of evidence.</p>;
  const w = 560;
  const h = 200;
  const pad = { l: 28, r: 12, t: 12, b: 26 };
  const weeks = growth.map((g) => g.weekNo);
  const minW = Math.min(...weeks);
  const maxW = Math.max(...weeks);
  const x = (week: number) => pad.l + (maxW === minW ? (w - pad.l - pad.r) / 2 : ((week - minW) / (maxW - minW)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / 10) * (h - pad.t - pad.b);
  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby="growth-title" className="h-auto w-full">
        <title id="growth-title">Dream Score growth by week: Learning, Building and Dream (details in the table below)</title>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" />
            <text x={pad.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted)">
              {v}
            </text>
          </g>
        ))}
        {growth.map((g) => (
          <text key={g.weekNo} x={x(g.weekNo)} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
            W{g.weekNo}
          </text>
        ))}
        {SERIES.map((s) => {
          const pts = growth.filter((g) => g[s.key] !== null).map((g) => `${x(g.weekNo)},${y(g[s.key]!)}`);
          if (pts.length === 0) return null;
          return (
            <g key={s.key}>
              {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />}
              {pts.map((p) => {
                const [px, py] = p.split(',');
                return <circle key={p} cx={px} cy={py} r={3} fill={s.color} />;
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-4 text-[12.5px] text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Dream Score by week</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {growth.map((g) => (
            <tr key={g.weekNo}>
              <th scope="row">{g.weekNo}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{tenth(g[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
