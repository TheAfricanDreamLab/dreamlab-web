import { LogoMark } from '@/components/ui/primitives';
import { ParallaxScene } from './motion';

/*
 * The hero's product scene: a laptop showing a learner's space and a phone with their Dream Score,
 * on the brand's green and gold shapes, with people's cursors moving around it. Pure markup (no
 * images), decorative for screen readers: the headline beside it says what matters.
 */

/** A pointer arrow with a name tag, like a collaborator's cursor. */
function Cursor({
  name,
  tone,
  className,
  depth,
  flip = false,
}: {
  name: string;
  tone: 'green' | 'gold' | 'forest';
  className: string;
  depth: string;
  flip?: boolean;
}) {
  const fill = tone === 'green' ? 'bg-primary' : tone === 'gold' ? 'bg-gold' : 'bg-forest';
  const arrow = tone === 'green' ? '#159b62' : tone === 'gold' ? '#b8963a' : '#0a3d29';
  return (
    <div data-depth={depth} className={`absolute ${className}`}>
      <div className="dl-float flex flex-col items-start gap-1" style={{ animationDelay: flip ? '-2s' : '0s' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" className={flip ? '-scale-x-100' : ''}>
          <path d="M3 2l15 7.5-6.5 1.8L8.6 18z" fill={arrow} />
        </svg>
        <span className={`ml-4 rounded-lg px-3 py-1.5 font-display text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(10,61,41,0.25)] ${fill}`}>
          {name}
        </span>
      </div>
    </div>
  );
}

/** A small donut, value 0–1. */
function Donut({ value, size = 64, stroke = 10, label }: { value: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6f4ec" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dl-donut)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
        />
        <defs>
          <linearGradient id="dl-donut" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#159b62" />
            <stop offset="1" stopColor="#b8963a" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-display text-[13px] font-bold text-ink">{label}</span>
    </div>
  );
}

const NAV = ['My programme', 'Dream Residency', 'Live classes', 'Dream Score', 'Credentials'];
const DIMENSIONS: [string, number][] = [
  ['Vision', 9.1],
  ['Execution', 8.4],
  ['Problem solving', 8.0],
  ['Communication', 7.6],
  ['Financial', 6.2],
];

export function HeroScene() {
  return (
    <ParallaxScene className="relative mx-auto h-[360px] w-full max-w-[560px] select-none sm:h-[460px]">
      <div aria-hidden className="absolute inset-0">
        {/* Brand shapes behind the devices. */}
        <div data-depth="1" className="absolute inset-0">
          <div className="dl-float-slow absolute bottom-[6%] left-[-4%] h-[34%] w-[70%] rounded-full bg-[linear-gradient(120deg,#0a3d29,#0f5a3b_60%,#159b62)]" />
          <div
            className="dl-float-slow absolute right-[-6%] top-[30%] h-[32%] w-[34%] rounded-full bg-[linear-gradient(140deg,#d8b65a,#b8963a)]"
            style={{ animationDelay: '-4s' }}
          />
          <div className="absolute left-[38%] top-[6%] h-24 w-24 rounded-full bg-primary/90 sm:h-28 sm:w-28" />
        </div>

        {/* The laptop: a learner's space. */}
        <div data-depth="2" className="absolute left-[2%] top-[16%] w-[86%] sm:left-[4%]">
          <div className="rounded-[14px] bg-white p-2 shadow-[0_30px_70px_rgba(10,61,41,0.22)] ring-1 ring-line">
            <div className="flex overflow-hidden rounded-[10px] bg-surface">
              <div className="hidden w-[34%] shrink-0 space-y-2 bg-white p-3 sm:block">
                <div className="flex items-center gap-1.5">
                  <LogoMark size={18} />
                  <span className="truncate font-display text-[9px] font-bold text-ink">The African Dream Lab</span>
                </div>
                <div className="rounded-lg bg-success-tint p-2">
                  <p className="text-[9px] font-semibold text-ink">Ada Obi</p>
                  <p className="text-[8px] text-link">Learner · Cohort 01</p>
                </div>
                {NAV.map((n, i) => (
                  <p key={n} className={`rounded-md px-2 py-1 text-[8.5px] ${i === 1 ? 'bg-forest text-white' : 'text-body'}`}>
                    {n}
                  </p>
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-2 p-3">
                <p className="text-[8.5px] text-muted">Home / My programme</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    ['Credits', '62', '/100'],
                    ['Programme', '78', '%'],
                    ['Attendance', '92', '%'],
                  ].map(([l, v, u]) => (
                    <div key={l} className="rounded-lg bg-white p-1.5 ring-1 ring-line">
                      <p className="text-[7.5px] text-muted">{l}</p>
                      <p className="font-display text-[15px] font-bold leading-tight text-ink">
                        {v}
                        <span className="text-[8px] font-medium text-link">{u}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 rounded-lg bg-white p-2 ring-1 ring-line">
                  <p className="text-[8.5px] font-semibold text-ink">This week</p>
                  {[
                    ['Solution Design', 'With faculty', 'bg-gold-tint text-gold-ink'],
                    ['Live class · Tue 21:00', 'Join', 'bg-primary text-white'],
                    ['Mentor meeting', 'Thu', 'bg-success-tint text-link'],
                  ].map(([t, b, c]) => (
                    <div key={t} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[8.5px] text-body">{t}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[7.5px] font-semibold ${c}`}>{b}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white p-2 ring-1 ring-line">
                  <Donut value={0.79} size={46} stroke={7} label="7.9" />
                  <div className="space-y-0.5">
                    <p className="text-[8.5px] font-semibold text-ink">Dream Score™</p>
                    <p className="text-[7.5px] text-link">+0.4 this week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto h-2 w-[104%] -translate-x-[2%] rounded-b-[14px] bg-[linear-gradient(#e4e9f2,#c3ccdb)]" />
        </div>

        {/* The phone: the Dream Score. */}
        <div data-depth="3" className="absolute right-[2%] top-[8%] hidden w-[34%] sm:block">
          <div className="dl-float rounded-[26px] bg-white p-1.5 shadow-[0_30px_60px_rgba(10,61,41,0.28)] ring-1 ring-line" style={{ animationDelay: '-1.5s' }}>
            <div className="space-y-2 rounded-[21px] bg-surface p-3">
              <div className="flex items-center justify-between text-[8px] text-muted">
                <span>09:41</span>
                <span>3G · 46%</span>
              </div>
              <p className="text-[9px] font-semibold text-ink">Dream Score™</p>
              <div className="grid place-items-center rounded-xl bg-white p-2">
                <Donut value={0.79} size={70} stroke={10} label="7.9" />
              </div>
              <div className="space-y-1.5 rounded-xl bg-white p-2">
                {DIMENSIONS.map(([d, v]) => (
                  <div key={d}>
                    <div className="flex justify-between text-[7.5px]">
                      <span className="text-body">{d}</span>
                      <span className="font-semibold text-ink">{v}</span>
                    </div>
                    <div className="h-1 rounded-full bg-line">
                      <div className={`h-1 rounded-full ${v < 7 ? 'bg-gold' : 'bg-primary'}`} style={{ width: `${v * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* People at work. */}
        <Cursor name="Ada · Learner" tone="green" depth="4" className="left-[52%] top-[-2%] sm:left-[44%]" />
        <Cursor name="Musa · Mentor" tone="gold" depth="4" className="bottom-[2%] left-[30%]" flip />
        <Cursor name="Kano Studio" tone="forest" depth="3" className="bottom-[22%] right-[0%] hidden sm:block" />
      </div>
    </ParallaxScene>
  );
}
