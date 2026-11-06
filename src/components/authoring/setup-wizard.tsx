'use client';

import { useContext, useState } from 'react';
import { Button, Steps } from '@/components/ui/primitives';
import { type Doc, newItem, slugify } from '@/lib/authoring';
import { safeImageUrl } from '@/lib/media';
import { RichTextField } from './blocks/controls';
import { LinesField, SelectField, TextField } from './fields';
import { DraftIdContext, MediaUploadButton } from './media-upload';

/*
 * Setting up a new course (CAT-5): four short steps (the basics, who it's for, a cover, the first
 * module) before the full workspace. Every step can be skipped and changed later in Course details.
 */

const LABELS = ['The basics', 'Who it’s for', 'Cover', 'First module'];

export function SetupWizard({ doc, onFinish, onSkip }: { doc: Doc; onFinish: (doc: Doc) => void; onSkip: () => void }) {
  const draftId = useContext(DraftIdContext);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Doc>(doc);
  const [moduleTitle, setModuleTitle] = useState('Getting started');
  const [lessonTitle, setLessonTitle] = useState('Welcome');
  const set = (key: string, value: unknown) => setD((x) => ({ ...x, [key]: value }));
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const cover = (d.cover ?? {}) as { imageUrl?: string; imageAlt?: string; imageCredit?: string };

  const finish = () => {
    const key = slugify(moduleTitle, 'module');
    const modules = Array.isArray(d.modules) && d.modules.length ? d.modules : [{ key, title: moduleTitle.trim() || 'Module 1', summary: '', weekNo: null, items: [newItem('lesson', lessonTitle.trim() || 'First lesson', slugify(lessonTitle, 'first-lesson'))] }];
    onFinish({ ...d, modules });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <header className="space-y-3 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">Set up your course</p>
        <h1 className="text-[28px] font-extrabold leading-tight">{str(d.title) || 'Your new course'}</h1>
        <Steps total={LABELS.length} current={step + 1} labels={LABELS} />
      </header>

      <div className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-7">
        {step === 0 && (
          <>
            <h2 className="text-[18px] font-bold">The basics</h2>
            <TextField label="Course title" value={str(d.title)} maxLength={160} onChange={(v) => set('title', v)} />
            <TextField label="Subtitle" value={str(d.subtitle)} maxLength={240} onChange={(v) => set('subtitle', v)} placeholder="One line that sells it" />
            <RichTextField label="Description" rows={5} value={str(d.description)} onChange={(v) => set('description', v)} />
            <SelectField
              label="Level"
              value={(str(d.level) || 'beginner') as 'beginner' | 'intermediate' | 'advanced'}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              onChange={(v) => set('level', v)}
            />
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-[18px] font-bold">Who it’s for</h2>
            <TextField label="Who it is for" value={str(d.audience)} maxLength={600} onChange={(v) => set('audience', v)} placeholder="e.g. Young founders in their first year" />
            <LinesField label="What learners will be able to do" value={Array.isArray(d.outcomes) ? (d.outcomes as string[]) : []} onChange={(v) => set('outcomes', v)} hint="One per line; three or more works best" rows={5} />
            <TextField label="What they need first" value={str(d.prerequisites)} maxLength={600} onChange={(v) => set('prerequisites', v)} placeholder="Nothing, or what to know before starting" />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-[18px] font-bold">A cover photo</h2>
            <p className="text-[14px] text-muted">Shown on the course card and page. You can add or change it later.</p>
            {cover.imageUrl && safeImageUrl(cover.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element -- the author's own upload
              <img src={safeImageUrl(cover.imageUrl)!} alt="" className="aspect-[21/9] w-full rounded-lg object-cover ring-1 ring-line" />
            )}
            {draftId && <MediaUploadButton draftId={draftId} kind="image" label={cover.imageUrl ? 'Replace the photo' : 'Upload a photo'} onUploaded={(path) => set('cover', { ...(d.cover as object), imageUrl: `/media/${path}` })} />}
            {cover.imageUrl && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Photo description" value={cover.imageAlt ?? ''} maxLength={300} onChange={(v) => set('cover', { ...(d.cover as object), imageAlt: v })} />
                <TextField label="Photo credit" value={cover.imageCredit ?? ''} maxLength={200} onChange={(v) => set('cover', { ...(d.cover as object), imageCredit: v })} />
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-[18px] font-bold">Your first module</h2>
            <p className="text-[14px] text-muted">A module groups lessons, quizzes and assignments. Start with one; add more in the outline.</p>
            <TextField label="Module title" value={moduleTitle} maxLength={160} onChange={setModuleTitle} />
            <TextField label="First lesson title" value={lessonTitle} maxLength={160} onChange={setLessonTitle} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onSkip} className="text-[14px] font-semibold text-muted hover:text-ink hover:underline">
          Skip setup
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <div className="w-28">
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            </div>
          )}
          <div className="w-44">
            {step < LABELS.length - 1 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Start writing
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
