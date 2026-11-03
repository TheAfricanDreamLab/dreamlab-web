'use client';

import { type ComponentProps, useRef } from 'react';
import { Button } from '@/components/ui/primitives';
import { useFormChanged } from '@/components/ui/use-form-changed';

/** A submit button that is inactive until something in its form changes ("Save draft", "Add"). */
export function ChangedButton({ disabled, ...props }: ComponentProps<typeof Button>) {
  const ref = useRef<HTMLButtonElement>(null);
  const changed = useFormChanged(ref);
  return <Button {...props} ref={ref} type="submit" disabled={disabled || !changed} />;
}
