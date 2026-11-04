'use client';

import { type RefObject, useEffect, useState } from 'react';

/** A form's current values, comparable as a string (files by name and size). */
function snapshot(form: HTMLFormElement): string {
  return JSON.stringify([...new FormData(form)].map(([k, v]) => [k, typeof v === 'string' ? v : `${v.name}:${v.size}`]));
}

const EDITABLE = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea, select';

/**
 * Whether the form around `button` differs from how it was loaded, so its submit button can stay
 * inactive until there is something to save (UAT ORG-021). Forms with nothing to fill in (Remove,
 * Approve, Graduate) count as changed: the button is the action. After React resets the form
 * following a save, the saved values become the new starting point, unless the form shows an error
 * (role="alert"), in which case it stays submittable so the person can try again.
 */
export function useFormChanged(button: RefObject<HTMLButtonElement | null>, enabled = true): boolean {
  const [changed, setChanged] = useState(!enabled);
  useEffect(() => {
    const form = button.current?.form ?? null;
    const tracked = enabled && form !== null && form.querySelector(EDITABLE) !== null;
    let initial = tracked ? snapshot(form) : '';
    const check = () => setChanged(!tracked || snapshot(form) !== initial);
    if (!tracked) {
      check();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      clearTimeout(timer);
      // After React has re-rendered the form with its new defaults.
      timer = setTimeout(() => {
        if (form.querySelector('[role="alert"]')) return setChanged(true);
        initial = snapshot(form);
        check();
      }, 50);
    };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
    form.addEventListener('reset', reset);
    // Values set from code (an uploaded photo's path, a picked date) change without input events.
    const observer = new MutationObserver(check);
    observer.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ['value', 'checked'] });
    check();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      form.removeEventListener('input', check);
      form.removeEventListener('change', check);
      form.removeEventListener('reset', reset);
    };
  }, [button, enabled]);
  return changed;
}
