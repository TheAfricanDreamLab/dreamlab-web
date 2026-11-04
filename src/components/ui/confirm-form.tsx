'use client';

import { type ComponentProps, useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * A form that asks before it submits, for actions that take something away from someone (a role,
 * their place in the organisation). Server components pass the server action and the question.
 * Its buttons stay disabled until the page is interactive, so nothing submits without the question.
 */
export function ConfirmForm({ message, children, ...props }: ComponentProps<'form'> & { message: string }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <form
      {...props}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <fieldset disabled={!ready} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
