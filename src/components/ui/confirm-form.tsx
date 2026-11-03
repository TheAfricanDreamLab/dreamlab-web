'use client';

import type { ComponentProps } from 'react';

/**
 * A form that asks before it submits, for actions that take something away from someone (a role,
 * their place in the organisation). Server components pass the server action and the question.
 */
export function ConfirmForm({ message, ...props }: ComponentProps<'form'> & { message: string }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    />
  );
}
