'use client';

import type { Doc } from '@/lib/authoring';
import { safeImageUrl } from '@/lib/media';
import { MediaUploadButton } from './media-upload';
import { AreaField, LinesField, NumberField, SelectField, TextField } from './fields';

type Cover = { from?: string; to?: string; symbol?: string; imageUrl?: string; imageAlt?: string; imageCredit?: string };
type Trailer = { provider?: 'youtube' | 'file'; videoId?: string; title?: string; channel?: string; durationS?: number };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

/** The course's own details: what learners see on its page before they enrol. */
export function DetailsEditor({ draftId, doc, set }: { draftId: string; doc: Doc; set: (key: string, value: unknown) => void }) {
  const cover = (doc.cover ?? {}) as Cover;
  const setCover = (patch: Partial<Cover>) => {
    const next: Cover = { ...cover, ...patch };
    // Empty optional photo fields are left out, not saved as "".
    for (const k of ['imageUrl', 'imageAlt', 'imageCredit'] as const) if (!next[k]) delete next[k];
    set('cover', next);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <TextField label="Title" value={str(doc.title)} maxLength={160} onChange={(v) => set('title', v)} />
        <TextField label="Subtitle" value={str(doc.subtitle)} maxLength={240} onChange={(v) => set('subtitle', v)} />
        <TextField label="Provider" value={str(doc.provider)} maxLength={120} onChange={(v) => set('provider', v)} hint="Who teaches it" />
        <TextField label="Practical Output" value={str(doc.practicalOutput)} maxLength={160} onChange={(v) => set('practicalOutput', v || null)} hint="What learners make (optional)" />
      </section>

      <AreaField label="Description" rows={6} value={str(doc.description)} onChange={(v) => set('description', v)} hint="Paragraphs, **bold**, lists with “- ”" />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Level"
          value={(str(doc.level) || 'beginner') as 'beginner' | 'intermediate' | 'advanced'}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
          onChange={(v) => set('level', v)}
        />
        <SelectField
          label="Who can see it"
          value={(str(doc.visibility) || 'public') as 'public' | 'org_private' | 'unlisted'}
          options={[
            { value: 'org_private', label: 'Organisation only' },
            { value: 'public', label: 'Public catalogue' },
            { value: 'unlisted', label: 'Unlisted (link only)' },
          ]}
          onChange={(v) => set('visibility', v)}
        />
        <NumberField label="Credit hours" min={0} max={60} step={0.5} value={typeof doc.creditHours === 'number' ? doc.creditHours : 0} onChange={(v) => set('creditHours', v ?? 0)} />
        <TextField label="Language" value={str(doc.language) || 'en'} maxLength={12} onChange={(v) => set('language', v)} hint="e.g. en, fr, yo" />
      </section>
      {doc.visibility === 'public' && <p className="text-[13px] text-muted">Public courses join the platform catalogue, so the platform team reviews them before they are published.</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <LinesField label="What learners will be able to do" value={arr(doc.outcomes)} onChange={(v) => set('outcomes', v)} hint="One per line, 1 to 10" />
        <LinesField label="Skills" value={arr(doc.skills)} onChange={(v) => set('skills', v)} hint="One per line, up to 12" />
        <AreaField label="Who it is for" value={str(doc.audience)} maxLength={600} onChange={(v) => set('audience', v)} />
        <AreaField label="Before you start" value={str(doc.prerequisites)} maxLength={600} onChange={(v) => set('prerequisites', v)} />
      </section>

      <section className="space-y-3" aria-labelledby="cover-heading">
        <h3 id="cover-heading" className="text-[16px] font-bold">
          Cover
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <ColourField label="From" value={cover.from ?? '#0A3D29'} onChange={(v) => setCover({ from: v })} />
          <ColourField label="To" value={cover.to ?? '#12805C'} onChange={(v) => setCover({ to: v })} />
          <div className="w-28">
            <TextField label="Symbol" value={cover.symbol ?? ''} maxLength={4} onChange={(v) => setCover({ symbol: v })} />
          </div>
          <div
            aria-hidden
            className="grid h-20 w-36 place-items-center rounded-[var(--radius-field)] font-display text-[28px] font-extrabold text-white"
            style={{ background: `linear-gradient(135deg, ${cover.from ?? '#0A3D29'}, ${cover.to ?? '#12805C'})` }}
          >
            {cover.symbol}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Photo (optional)" value={cover.imageUrl ?? ''} onChange={(v) => setCover({ imageUrl: v })} placeholder="https://upload.wikimedia.org/…" hint="Upload one, or Unsplash or Wikimedia" />
          <TextField label="Photo description" value={cover.imageAlt ?? ''} maxLength={300} onChange={(v) => setCover({ imageAlt: v })} />
          <TextField label="Photo credit" value={cover.imageCredit ?? ''} maxLength={200} onChange={(v) => setCover({ imageCredit: v })} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <MediaUploadButton draftId={draftId} kind="image" onUploaded={(path) => setCover({ imageUrl: `/media/${path}` })} />
          {safeImageUrl(cover.imageUrl) && (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of the chosen photo
            <img src={safeImageUrl(cover.imageUrl)!} alt="" className="h-20 w-36 rounded-[var(--radius-field)] object-cover ring-1 ring-line" />
          )}
        </div>
      </section>

      <TrailerEditor draftId={draftId} trailer={(doc.trailer ?? null) as Trailer | null} onChange={(t) => set('trailer', t ?? undefined)} />
    </div>
  );
}

/** A short video on the course page: on YouTube, or uploaded. */
function TrailerEditor({ draftId, trailer, onChange }: { draftId: string; trailer: Trailer | null; onChange: (t: Trailer | null) => void }) {
  const t = trailer ?? {};
  const patch = (p: Partial<Trailer>) => onChange({ provider: 'youtube', title: '', channel: '', ...t, ...p });
  return (
    <section className="space-y-3" aria-labelledby="trailer-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="trailer-heading" className="text-[16px] font-bold">
          Trailer (optional)
        </h3>
        {trailer && (
          <button type="button" onClick={() => onChange(null)} className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-danger-ink hover:bg-danger-tint">
            Remove the trailer
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Where it plays from"
          value={t.provider ?? 'youtube'}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'file', label: 'Uploaded video' },
          ]}
          onChange={(v) => patch({ provider: v, videoId: '' })}
        />
        <TextField label="Title" value={t.title ?? ''} maxLength={200} onChange={(v) => patch({ title: v })} />
        <TextField label="Made by" value={t.channel ?? ''} maxLength={120} onChange={(v) => patch({ channel: v })} hint="Shown as the credit" />
      </div>
      {(t.provider ?? 'youtube') === 'youtube' ? (
        <TextField label="YouTube video id" value={t.videoId ?? ''} maxLength={11} onChange={(v) => patch({ videoId: v.trim() })} placeholder="dQw4w9WgXcQ" hint="The 11 characters after watch?v=" />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <MediaUploadButton draftId={draftId} kind="video" label={t.videoId ? 'Replace the video' : 'Upload a video'} onUploaded={(path) => patch({ provider: 'file', videoId: path })} />
          {t.videoId && <span className="min-w-0 truncate text-[13px] text-muted">{t.videoId.split('/').pop()}</span>}
        </div>
      )}
    </section>
  );
}

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
      {label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-20 cursor-pointer rounded-lg bg-card ring-1 ring-line-strong" />
    </label>
  );
}
