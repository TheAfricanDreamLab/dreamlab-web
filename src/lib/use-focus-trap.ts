'use client';

import { type RefObject, useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside a dialog while it is `active`: from the last control back to the first, and in
 * from outside. A dialog opened on top of another sets the lower one inactive.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const box = ref.current;
      if (e.key !== 'Tab' || !box) return;
      const els = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      const first = els[0];
      const last = els.at(-1);
      if (!first || !last) return;
      const inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, active]);
}
