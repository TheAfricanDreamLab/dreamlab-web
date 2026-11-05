'use client';

import type { CircleMeetup } from '@dreamlab/contracts';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { cancelCircleMeetup, scheduleCircleMeetup } from '@/app/actions/circles';
import { SubmitButton } from '@/components/auth/forms';
import { LocalTime, TimeZoneField } from '@/components/community/community-forms';
import { TextInput } from '@/components/ui/fields';
import { Badge, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { NoticeToast } from '@/components/ui/toast';

const selectClass = 'h-12 w-full rounded-[var(--radius-field)] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'text-[13px] font-semibold text-ink';
const chip =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] bg-card px-3 py-2 text-[14px] text-ink ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary';

/** The circle's coming meetups (COMM-3), soonest first. */
export function MeetupList({ circleId, meetups }: { circleId: string; meetups: CircleMeetup[] }) {
  if (meetups.length === 0) return <p className="text-[14px] text-muted">No meetups planned. Set one up below; everyone is told and reminded an hour before.</p>;
  return (
    <ul className="space-y-3" aria-label="Coming meetups">
      {meetups.map((m) => (
        <li key={m.id} className="space-y-2 rounded-lg bg-surface p-3 ring-1 ring-line">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{m.title}</p>
              <p className="text-[13.5px] text-muted">
                <LocalTime iso={m.startsAt} /> · {m.durationMin} min · set up by {m.createdBy.name}
              </p>
            </div>
            <Badge tone={m.mode === 'virtual' ? 'green' : 'neutral'}>{m.mode === 'virtual' ? 'Online' : 'In person'}</Badge>
          </div>
          <p className="text-[14px] text-body">
            {m.mode === 'virtual' ? (
              <>
                In the circle call.{' '}
                <Link href={`/app/circles/${circleId}/call`} prefetch={false} className="font-semibold text-link hover:underline">
                  Open the call
                </Link>
              </>
            ) : (
              <>At {m.location}</>
            )}
          </p>
          {m.details && <p className="whitespace-pre-line text-[14px] text-body">{m.details}</p>}
          {m.can.cancel && <CancelMeetup meetup={m} />}
        </li>
      ))}
    </ul>
  );
}

function CancelMeetup({ meetup }: { meetup: CircleMeetup }) {
  const [state, action] = useActionState(cancelCircleMeetup, {} as FormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Cancel “${meetup.title}”? Everyone in the circle will be told.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="meetupId" value={meetup.id} />
      <button type="submit" className="min-h-9 text-[13.5px] font-semibold text-danger-ink hover:underline">
        Cancel meetup<span className="sr-only"> {meetup.title}</span>
      </button>
      {state.error && (
        <p role="alert" className="text-[12.5px] text-danger-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Set up a meetup: online in the circle call, or somewhere in person. */
export function MeetupForm({ circleId }: { circleId: string }) {
  const [state, action] = useActionState(scheduleCircleMeetup, {} as FormState);
  const v = state.values;
  const [mode, setMode] = useState(v?.mode ?? 'virtual');
  return (
    <details className="group rounded-[var(--radius-card)] bg-surface ring-1 ring-line" open={Boolean(state.error)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14.5px] font-semibold text-link">
        Set up a meetup
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <form action={action} className="space-y-4 border-t border-line p-4">
        <input type="hidden" name="circleId" value={circleId} />
        <TimeZoneField />
        <TextInput label="What" name="title" required maxLength={120} placeholder="Pitch practice" defaultValue={v?.title} error={state.fields?.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="When (your time)" name="startsAt" type="datetime-local" required defaultValue={v?.startsAt} error={state.fields?.startsAt} />
          <div className="space-y-1.5">
            <label htmlFor={`meetup-length-${circleId}`} className={label}>
              How long
            </label>
            <select id={`meetup-length-${circleId}`} name="durationMin" defaultValue={v?.durationMin ?? '60'} className={selectClass}>
              {[30, 45, 60, 90, 120, 180].map((n) => (
                <option key={n} value={n}>
                  {n < 60 ? `${n} minutes` : `${n / 60} hour${n === 60 ? '' : 's'}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className={label}>Where</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={chip}>
              <input type="radio" name="mode" value="virtual" checked={mode === 'virtual'} onChange={() => setMode('virtual')} className="accent-[var(--color-primary)]" />
              Online, in the circle call
            </label>
            <label className={chip}>
              <input type="radio" name="mode" value="physical" checked={mode === 'physical'} onChange={() => setMode('physical')} className="accent-[var(--color-primary)]" />
              In person
            </label>
          </div>
        </fieldset>
        {mode === 'physical' && (
          <TextInput label="Place" name="location" required maxLength={200} placeholder="Yaba hub, 3rd floor" defaultValue={v?.location} error={state.fields?.location} />
        )}
        <TextInput label="Notes (optional)" name="details" maxLength={1000} placeholder="Bring your one-page pitch" defaultValue={v?.details} error={state.fields?.details} />
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <NoticeToast state={state} />
        <div className="sm:max-w-xs">
          <SubmitButton pending="Scheduling…">Schedule meetup</SubmitButton>
        </div>
      </form>
    </details>
  );
}
