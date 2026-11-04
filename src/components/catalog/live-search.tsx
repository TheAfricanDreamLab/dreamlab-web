'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ComponentProps, useEffect, useRef, useTransition } from 'react';

/**
 * The catalogue's search box: results follow what is typed, a moment after typing stops (UAT
 * VIS-010). The query stays in the address, and the form's Search button still works without JS.
 */
export function LiveSearchInput({ defaultValue, ...props }: Omit<ComponentProps<'input'>, 'onChange' | 'name' | 'defaultValue'> & { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Follow the address when it changes some other way (Clear, Back), unless the person is typing.
  useEffect(() => {
    const el = input.current;
    if (el && document.activeElement !== el) el.value = defaultValue ?? '';
  }, [defaultValue]);
  return (
    <input
      {...props}
      ref={input}
      name="q"
      defaultValue={defaultValue}
      onChange={(e) => {
        const q = e.target.value.trim();
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          // The address as it is now: a level picked meanwhile is kept.
          const next = new URLSearchParams(window.location.search);
          if (q) next.set('q', q);
          else next.delete('q');
          const query = next.toString();
          startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
        }, 300);
      }}
    />
  );
}
