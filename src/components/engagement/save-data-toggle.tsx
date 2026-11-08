'use client';

import { useId } from 'react';
import { cx } from '@/components/ui/primitives';
import { useSaveData } from '@/lib/save-data';

/** An on/off switch, keyboard friendly (Space or Enter), read out as a switch. */
export function Switch({ on, onChange, labelledBy, describedBy, disabled }: { on: boolean; onChange: (on: boolean) => void; labelledBy: string; describedBy?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60',
        on ? 'bg-primary' : 'bg-line-heavy',
      )}
    >
      <span aria-hidden className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

/**
 * Save data (LRN-9), for this device: on the account page in full, and as a quick switch in the lesson
 * player. The choice is kept in this browser only.
 */
export function SaveDataToggle({ compact = false }: { compact?: boolean }) {
  const [on, setOn] = useSaveData();
  const id = useId();
  return (
    <div className={cx('flex items-start justify-between gap-4', compact && 'items-center rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line')}>
      <div className="min-w-0 space-y-0.5">
        <p id={`${id}-label`} className={cx('font-semibold text-ink', compact ? 'text-[13.5px]' : 'text-[14.5px]')}>
          Save data{compact ? '' : ' on this device'}
        </p>
        <p id={`${id}-desc`} className={cx('text-muted', compact ? 'text-[12px]' : 'text-[13.5px] leading-relaxed')}>
          {compact
            ? on
              ? 'Videos start at the lowest quality, with the transcript first.'
              : 'Use less mobile data on videos.'
            : 'Videos start at the lowest quality and load nothing until you press play. You can listen instead of watching, and the transcript opens first. Only this browser remembers it.'}
        </p>
      </div>
      <Switch on={on} onChange={setOn} labelledBy={`${id}-label`} describedBy={`${id}-desc`} />
    </div>
  );
}
