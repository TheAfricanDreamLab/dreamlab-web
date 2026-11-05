'use client';

import type { CircleContact, CircleSpace } from '@dreamlab/contracts';
import { useActionState } from 'react';
import { saveCircleContact } from '@/app/actions/circles';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Badge, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { initials } from '@/lib/labels';
import { NoticeToast } from '@/components/ui/toast';

const ROLE = { mentor: 'Mentor', staff: 'Cohort team', member: null } as const;
const link = 'inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold text-link ring-1 ring-line hover:bg-success-tint';

/** wa.me wants the number's digits only, country code first. */
const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

/**
 * Who is in the circle (COMM-3), as cards with whatever each person chose to share. Nothing is
 * shared unless they fill in their own details.
 */
export function MemberCards({ members }: { members: CircleSpace['members'] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="People in this circle">
      {members.map((m) => (
        <li key={m.userId} className="flex gap-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success-tint font-display text-sm font-bold text-link">
            {initials(m.name)}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
              {m.name}
              {ROLE[m.role] && <Badge tone="gold">{ROLE[m.role]}</Badge>}
            </p>
            <ContactLinks name={m.name} contact={m.contact} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ContactLinks({ name, contact }: { name: string; contact: CircleContact | null }) {
  if (!contact) return <p className="text-[13px] text-muted">No contact details shared.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {contact.email && (
        <a href={`mailto:${contact.email}`} className={link} aria-label={`Email ${name}`}>
          Email
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className={link} aria-label={`Call ${name}`}>
          Call
        </a>
      )}
      {contact.phone && contact.whatsapp && (
        <a href={whatsappLink(contact.phone)} target="_blank" rel="noopener noreferrer" className={link} aria-label={`WhatsApp ${name}`}>
          WhatsApp
        </a>
      )}
      {contact.linkedin && (
        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className={link} aria-label={`${name} on LinkedIn`}>
          LinkedIn
        </a>
      )}
    </div>
  );
}

/** What I share with this circle: nothing until I fill it in, and clearing it stops sharing. */
export function ContactForm({ circleId, contact }: { circleId: string; contact: CircleContact | null }) {
  const [state, action] = useActionState(saveCircleContact, {} as FormState);
  const v = state.values;
  const sharing = [contact?.email && 'email', contact?.phone && 'phone', contact?.phone && contact.whatsapp && 'WhatsApp', contact?.linkedin && 'LinkedIn'].filter(Boolean).join(', ');
  return (
    <details className="group rounded-[var(--radius-card)] bg-card ring-1 ring-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14.5px] font-semibold text-ink">
        <span>
          Your contact details
          <span className="block text-[13px] font-normal text-muted">{sharing ? `You share your ${sharing}.` : 'You aren’t sharing any. Nothing is shared unless you add it.'}</span>
        </span>
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <form action={action} className="space-y-4 border-t border-line p-4">
        <input type="hidden" name="circleId" value={circleId} />
        <p className="text-[13.5px] text-muted">Only the people in this circle see these: its members and their mentors. Leave a field empty to keep it private.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Email" name="email" type="email" autoComplete="email" maxLength={320} defaultValue={v?.email ?? contact?.email ?? ''} error={state.fields?.email} />
          <TextInput
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder="+234 801 234 5678"
            hint="With the country code"
            defaultValue={v?.phone ?? contact?.phone ?? ''}
            error={state.fields?.phone}
          />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14.5px] text-body">
          <input type="checkbox" name="whatsapp" defaultChecked={v ? v.whatsapp === 'on' : (contact?.whatsapp ?? false)} className="h-5 w-5 accent-[var(--color-forest)]" />
          This number is on WhatsApp
        </label>
        <TextInput
          label="LinkedIn profile"
          name="linkedin"
          type="url"
          maxLength={300}
          placeholder="https://www.linkedin.com/in/your-name"
          defaultValue={v?.linkedin ?? contact?.linkedin ?? ''}
          error={state.fields?.linkedin}
        />
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <NoticeToast state={state} />
        <div className="sm:max-w-xs">
          <SubmitButton pending="Saving…">Save contact details</SubmitButton>
        </div>
      </form>
    </details>
  );
}
