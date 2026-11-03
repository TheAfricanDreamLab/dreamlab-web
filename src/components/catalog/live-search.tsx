'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ComponentProps, useEffect, useRef, useTransition } from 'react';

/**
 * The catalogue's search box: results follow what is typed, a moment after typing stops (UAT
 * VIS-010). The query stays in the address, and the form's Search button still works without JS.
 */
export function LiveSearchInput(props: Omit<ComponentProps<'input'>, 'onChange' | 'name'>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <input
      {...props}
      name="q"
      onChange={(e) => {
        const q = e.target.value.trim();
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const next = new URLSearchParams(params.toString());
          if (q) next.set('q', q);
          else next.delete('q');
          const query = next.toString();
          startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
        }, 300);
      }}
    />
  );
}
