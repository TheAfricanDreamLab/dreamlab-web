'use client';

import type { VideoChapter, VideoManifest } from '@dreamlab/contracts';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { type Cue, parseCaptions } from '@/lib/captions';
import { formatClock, formatDuration, libraryVideoBase } from '@/lib/media';

/*
 * A video from the organisation's library (CAT-6), streamed from Dream Lab's own servers. Until the
 * learner presses play only the poster loads; then the stream starts at the quality their connection
 * allows (hls.js, or the browser's own HLS on Safari and iPhone). Captions, chapters and a transcript
 * that follows along; questions set during the video pause it and appear right below.
 */

type HlsLike = {
  levels: { height: number }[];
  currentLevel: number;
  nextLevel: number;
  autoLevelEnabled: boolean;
  loadSource(src: string): void;
  attachMedia(el: HTMLVideoElement): void;
  on(event: string, fn: (...args: unknown[]) => void): void;
  destroy(): void;
};

export type VideoQuestion = { atS: number; blockId: string; settled: boolean; node: ReactNode };

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function LibraryVideo({
  videoId,
  title,
  channel,
  caption,
  chapters = [],
  questions = [],
  startS,
  endS,
}: {
  videoId: string;
  title: string;
  channel: string;
  caption?: string;
  chapters?: VideoChapter[];
  questions?: VideoQuestion[];
  startS?: number;
  endS?: number;
}) {
  const base = libraryVideoBase(videoId);
  const [manifest, setManifest] = useState<VideoManifest | null | 'error'>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [level, setLevel] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hls = useRef<HlsLike | null>(null);
  const lastTime = useRef(0);
  const asked = useRef(new Set<string>());
  const questionPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!base) return;
    let live = true;
    fetch(`${base}manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<VideoManifest>) : Promise.reject(new Error(String(r.status)))))
      .then((m) => live && setManifest(m))
      .catch(() => live && setManifest('error'));
    return () => {
      live = false;
    };
  }, [base]);

  // Start the stream once the <video> exists.
  useEffect(() => {
    const el = video.current;
    if (!playing || !el || !base || !manifest || manifest === 'error') return;
    const src = `${base}${manifest.hls}`;
    let cancelled = false;
    void (async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;
      if (Hls.isSupported()) {
        const h = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30, startPosition: startS ?? -1 }) as unknown as HlsLike;
        hls.current = h;
        h.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(h.levels.map((l) => l.height));
          void el.play().catch(() => undefined);
        });
        h.loadSource(src);
        h.attachMedia(el);
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = src;
        if (startS) el.currentTime = startS;
        void el.play().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
      hls.current?.destroy();
      hls.current = null;
    };
  }, [playing, base, manifest, startS]);

  const seek = useCallback((s: number) => {
    const el = video.current;
    if (!el) {
      setPlaying(true);
      return;
    }
    el.currentTime = s;
    lastTime.current = s;
    void el.play().catch(() => undefined);
  }, []);

  const onTime = () => {
    const el = video.current;
    if (!el) return;
    const now = el.currentTime;
    setTime(now);
    if (endS && now >= endS) el.pause();
    // A question comes up when playback runs past its time (not when the learner jumps over it).
    const prev = lastTime.current;
    lastTime.current = now;
    if (now - prev > 0 && now - prev < 1.5) {
      const due = questions.find((q) => !q.settled && !asked.current.has(q.blockId) && prev < q.atS && now >= q.atS);
      if (due) {
        asked.current.add(due.blockId);
        el.pause();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
        setAsking(due.blockId);
        requestAnimationFrame(() => {
          questionPanel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          questionPanel.current?.focus({ preventScroll: true });
        });
      }
    }
  };

  const chooseLevel = (l: number) => {
    setLevel(l);
    if (hls.current) hls.current.currentLevel = l;
  };
  const chooseSpeed = (s: number) => {
    setSpeed(s);
    if (video.current) video.current.playbackRate = s;
  };

  const current = useMemo(() => [...chapters].reverse().find((c) => time >= c.atS) ?? null, [chapters, time]);
  const asking_ = questions.find((q) => q.blockId === asking);

  if (!base) return null;
  if (manifest === 'error') {
    return (
      <figure className="space-y-2" data-media="video">
        <div className="grid aspect-video w-full place-items-center rounded-[var(--radius-card)] bg-forest p-6 text-center text-white/85 ring-1 ring-line">
          <p className="max-w-sm text-[14px]">This video isn’t available right now. Try again in a little while.</p>
        </div>
        <figcaption className="font-display text-[15px] font-bold text-ink">{title}</figcaption>
      </figure>
    );
  }
  const ready = manifest !== null;
  const duration = ready ? formatDuration(endS ? endS - (startS ?? 0) : manifest.durationS) : null;

  return (
    <figure className="space-y-3" data-media="video">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-forest ring-1 ring-line">
        {playing && ready ? (
          <video
            ref={video}
            controls
            playsInline
            preload="none"
            poster={`${base}${manifest.poster}`}
            aria-label={title}
            onTimeUpdate={onTime}
            onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
            className="absolute inset-0 h-full w-full bg-black"
          >
            {manifest.captions.map((c) => (
              <track key={c.lang} kind="captions" src={`${base}${c.src}`} srcLang={c.lang} label={c.label} />
            ))}
          </video>
        ) : (
          <button type="button" onClick={() => setPlaying(true)} disabled={!ready} aria-label={`Play video: ${title}`} className="group absolute inset-0 block h-full w-full text-left disabled:cursor-wait">
            {ready && (
              // eslint-disable-next-line @next/next/no-img-element -- the poster, served from /media as it is
              <img src={`${base}${manifest.poster}`} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <span aria-hidden className="absolute left-1/2 top-[42%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-forest shadow-lg ring-4 ring-white/30 transition-transform group-hover:scale-105 group-focus-visible:ring-primary sm:top-1/2 sm:h-16 sm:w-16">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 sm:h-7 sm:w-7" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            {duration && <span className="absolute right-3 top-3 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[11.5px] text-white">{duration}</span>}
            <span className="absolute inset-x-0 bottom-0 space-y-0.5 p-3 text-white sm:p-4">
              <span className="line-clamp-1 block font-display text-[15px] font-bold leading-snug sm:line-clamp-2 sm:text-[16px]">{title}</span>
              <span className="block text-[13px] text-white/80">
                {channel}
                {ready && manifest.captions.length > 0 ? ' · Captions' : ''}
                {questions.length > 0 ? ` · ${questions.length} ${questions.length === 1 ? 'question' : 'questions'} along the way` : ''}
              </span>
            </span>
          </button>
        )}
      </div>

      {asking_ && (
        <div ref={questionPanel} tabIndex={-1} className="scroll-mt-24 space-y-3 rounded-[var(--radius-card)] bg-gold-tint p-4 ring-1 ring-gold-line focus:outline-none sm:p-5" aria-live="polite">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-gold-ink">Question at {formatClock(asking_.atS)} · the video is paused</p>
          {asking_.node}
          <button
            type="button"
            onClick={() => {
              setAsking(null);
              void video.current?.play().catch(() => undefined);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-forest"
          >
            {asking_.settled ? 'Continue watching' : 'Answer later and keep watching'} <span aria-hidden>▶</span>
          </button>
        </div>
      )}

      {(chapters.length > 0 || (playing && ready)) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {playing && levels.length > 1 && (
            <label className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">
              <span className="text-muted">Quality</span>
              <select value={level} onChange={(e) => chooseLevel(Number(e.target.value))} className="bg-transparent font-semibold text-ink focus:outline-none">
                <option value={-1}>Auto</option>
                {levels.map((h, i) => (
                  <option key={h} value={i}>
                    {h}p{h <= 360 ? ' (saves data)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {playing && (
            <label className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">
              <span className="text-muted">Speed</span>
              <select value={speed} onChange={(e) => chooseSpeed(Number(e.target.value))} className="bg-transparent font-semibold text-ink focus:outline-none">
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
          )}
          {ready && manifest.captions.length > 0 && (
            <button type="button" aria-expanded={transcriptOpen} onClick={() => setTranscriptOpen((o) => !o)} className={cx('rounded-full px-3 py-1.5 font-semibold ring-1', transcriptOpen ? 'bg-forest text-white ring-forest' : 'bg-surface text-ink ring-line hover:bg-card')}>
              Transcript
            </button>
          )}
        </div>
      )}

      {chapters.length > 0 && (
        <nav aria-label={`Chapters of ${title}`}>
          <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-field)] bg-card ring-1 ring-line">
            {chapters.map((c) => (
              <li key={c.atS}>
                <button
                  type="button"
                  onClick={() => seek(c.atS)}
                  aria-current={current === c ? 'true' : undefined}
                  className={cx('flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-surface', current === c && 'bg-success-tint font-semibold')}
                >
                  <span className="w-14 shrink-0 font-mono text-[12px] text-link">{formatClock(c.atS)}</span>
                  <span className="min-w-0 flex-1 text-ink">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {transcriptOpen && ready && <Transcript base={base} tracks={manifest.captions} time={time} onSeek={seek} />}

      <figcaption className="space-y-1">
        {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          Video: {channel}
          {duration ? ` · ${duration}` : ''} · adjusts to your connection
        </p>
      </figcaption>
    </figure>
  );
}

/** The captions as text that follows the video; tap a line to go there. */
function Transcript({ base, tracks, time, onSeek }: { base: string; tracks: VideoManifest['captions']; time: number; onSeek: (s: number) => void }) {
  const [lang, setLang] = useState(tracks[0]?.lang ?? '');
  // The cues loaded, and which language they are: switching language shows "Loading…" until the new ones arrive.
  const [loaded, setLoaded] = useState<{ lang: string; cues: Cue[] | 'error' } | null>(null);
  const cues = loaded && loaded.lang === lang ? loaded.cues : null;
  const [query, setQuery] = useState('');
  const list = useRef<HTMLOListElement>(null);
  const track = tracks.find((t) => t.lang === lang);

  useEffect(() => {
    if (!track) return;
    let live = true;
    fetch(`${base}${track.src}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('missing'))))
      .then((text) => live && setLoaded({ lang: track.lang, cues: parseCaptions(text) }))
      .catch(() => live && setLoaded({ lang: track.lang, cues: 'error' }));
    return () => {
      live = false;
    };
  }, [base, track]);

  const active = Array.isArray(cues) ? cues.findIndex((c) => time >= c.startS && time < c.endS) : -1;
  useEffect(() => {
    if (active < 0 || query) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-cue="${active}"]`);
    // Scroll the transcript box only, never the page.
    if (el && list.current) list.current.scrollTop = el.offsetTop - list.current.offsetTop - list.current.clientHeight / 3;
  }, [active, query]);

  const shown = Array.isArray(cues) ? cues.map((c, i) => ({ c, i })).filter(({ c }) => !query || c.text.toLowerCase().includes(query.toLowerCase())) : [];
  return (
    <section aria-label="Transcript" className="space-y-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the transcript"
          aria-label="Search the transcript"
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] bg-surface px-3 text-[14px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {tracks.length > 1 && (
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Transcript language" className="h-9 rounded-[var(--radius-field)] bg-surface px-2 text-[14px] ring-1 ring-line">
            {tracks.map((t) => (
              <option key={t.lang} value={t.lang}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {cues === null ? (
        <p className="p-2 text-[13.5px] text-muted">Loading…</p>
      ) : cues === 'error' ? (
        <p className="p-2 text-[13.5px] text-muted">The transcript couldn’t be loaded.</p>
      ) : (
        <ol ref={list} className="relative max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {shown.map(({ c, i }) => (
            <li key={i} data-cue={i}>
              <button type="button" onClick={() => onSeek(c.startS)} className={cx('flex w-full gap-3 rounded-md px-2 py-1.5 text-left text-[14px] leading-relaxed hover:bg-surface', i === active && 'bg-success-tint')}>
                <span className="w-12 shrink-0 pt-0.5 font-mono text-[11.5px] text-link">{formatClock(c.startS)}</span>
                <span className="text-body">{c.text}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-2 text-[13.5px] text-muted">Nothing matches “{query}”.</li>}
        </ol>
      )}
    </section>
  );
}
