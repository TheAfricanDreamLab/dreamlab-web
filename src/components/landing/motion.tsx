'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { cx } from '@/components/ui/primitives';

/*
 * Motion for the landing page, with GSAP: content that rises and turns into view as it scrolls in,
 * cards that tilt in 3D under the pointer, a hero whose layers follow the pointer at different
 * depths, and an entrance for the hero. With reduced motion everything sits at rest; pointer effects
 * only run with a mouse or trackpad.
 */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

const MOTION = '(prefers-reduced-motion: no-preference)';
const FINE_POINTER = '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)';

/** Rises (and turns towards the viewer) the first time it scrolls into view. Children marked data-stagger follow one by one. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' | 'section' }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const items = el.querySelectorAll<HTMLElement>('[data-stagger]');
      const targets = items.length > 0 ? [el, ...items] : [el];
      gsap.set(el, { autoAlpha: 1 });
      gsap.fromTo(
        items.length > 0 ? items : el,
        { autoAlpha: 0, y: 36, rotationX: 10, transformPerspective: 900 },
        {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          duration: 0.9,
          delay: delay / 1000,
          ease: 'power3.out',
          stagger: 0.09,
          clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      );
      return () => gsap.set(targets, { clearProps: 'all' });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(el, { autoAlpha: 1 });
    });
    return () => mm.revert();
  }, [delay]);
  return (
    <Tag ref={ref as never} className={cx('dl-reveal', className)}>
      {children}
    </Tag>
  );
}

/** Tilts towards the pointer in 3D, with a soft highlight where the pointer is. */
export function Tilt({ children, className, max = 10, style }: { children: ReactNode; className?: string; max?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(FINE_POINTER, () => {
      gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      const lift = gsap.quickTo(el, 'z', { duration: 0.5, ease: 'power3.out' });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        rx(-y * max);
        ry(x * max);
        lift(24);
        el.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
        el.dataset.tilting = 'true';
      };
      const leave = () => {
        rx(0);
        ry(0);
        lift(0);
        el.dataset.tilting = 'false';
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      return () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      };
    });
    return () => mm.revert();
  }, [max]);
  return (
    <div ref={ref} style={style} className={cx('dl-tilt', className)}>
      {children}
    </div>
  );
}

/** Pointer travel (px) and turn (deg) per depth: deeper layers move more, like objects nearer to you. */
const DEPTH: Record<string, { move: number; turn: number }> = {
  '1': { move: -12, turn: 0 },
  '2': { move: 18, turn: 6 },
  '3': { move: 34, turn: 0 },
  '4': { move: 52, turn: 0 },
};

/**
 * A scene whose children (data-depth="1"–"4") come in one after another on load, then move with
 * the pointer by their depth: the hero's 3D parallax.
 */
export function ParallaxScene({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const layers = [...el.querySelectorAll<HTMLElement>('[data-depth]')];
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      gsap.from(layers, { autoAlpha: 0, y: 40, z: -120, rotationX: 14, transformPerspective: 1200, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.1 });
    });
    mm.add(FINE_POINTER, () => {
      const movers = layers.map((layer) => {
        const d = DEPTH[layer.dataset.depth ?? '1'] ?? DEPTH['1']!;
        return {
          d,
          x: gsap.quickTo(layer, 'x', { duration: 0.8, ease: 'power3.out' }),
          y: gsap.quickTo(layer, 'y', { duration: 0.8, ease: 'power3.out' }),
          ry: gsap.quickTo(layer, 'rotationY', { duration: 0.8, ease: 'power3.out' }),
          rx: gsap.quickTo(layer, 'rotationX', { duration: 0.8, ease: 'power3.out' }),
        };
      });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width - 0.5));
        const py = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height - 0.5));
        for (const m of movers) {
          m.x(px * m.d.move);
          m.y(py * m.d.move * 0.75);
          m.ry(px * m.d.turn);
          m.rx(-py * m.d.turn);
        }
      };
      window.addEventListener('pointermove', move, { passive: true });
      return () => window.removeEventListener('pointermove', move);
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className={cx('dl-scene', className)}>
      {children}
    </div>
  );
}

/**
 * Scroll-linked progress (0 → 1) over an element, scrubbed by GSAP: calls back as the element
 * travels from the lower part of the screen to its middle. At rest (reduced motion) it reports 1.
 */
export function useScrubbed(target: React.RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const st = ScrollTrigger.create({ trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: 0.6, onUpdate: (self) => onProgress(self.progress) });
      onProgress(st.progress);
    });
    mm.add('(prefers-reduced-motion: reduce)', () => onProgress(1));
    return () => mm.revert();
  }, [target, onProgress]);
}
