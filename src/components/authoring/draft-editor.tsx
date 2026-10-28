'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { discardDraft, draftStep, saveDraft } from '@/app/actions/authoring';
import { Badge, Button, Card, cx, Notice } from '@/components/ui/primitives';
import { type Doc, type Draft, DRAFT_STATUS_LABELS, DRAFT_STATUS_TONES, issueTarget, normaliseModules, VISIBILITY_LABELS } from '@/lib/authoring';
import { DetailsEditor } from './details-editor';
import { DraftIdContext } from './media-upload';
import { JsonField } from './fields';
import { OutlineEditor } from './outline-editor';

type Tab = 'details' | 'outline' | 'json';
type Open = { module: number; item?: number } | null;

/**
 * The whole course, held here while the author works on it. Saving sends the complete document with
 * the revision it started from; the API refuses it if someone else saved in between.
 */
export function DraftEditor({ initial }: { initial: Draft }) {
  const [draft, setDraft] = useState(initial);
  const [doc, setDocState] = useState<Doc>(initial.doc as Doc);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string; reload?: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [jsonVersion, setJsonVersion] = useState(0);
  const editable = draft.can.edit;
  // The document as it is now, for saves that finish after more edits were made.
  const latest = useRef(doc);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);

  const setDoc = useCallback((next: Doc) => {
    setDocState(next);
    setDirty(true);
  }, []);
  const set = (key: string, value: unknown) => setDoc({ ...doc, [key]: value });
  const modules = normaliseModules(doc.modules);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async (): Promise<Draft | null> => {
    setBusy('save');
    const sent = doc;
    const res = await saveDraft(draft.id, draft.revision, sent);
    setBusy(null);
    if (!res.ok) {
      setMessage({ tone: 'error', text: res.error, reload: res.code === 'draft_changed' });
      return null;
    }
    setDraft(res.data);
    // Edits made while the save was on its way are still unsaved.
    setDirty(latest.current !== sent);
    setMessage({ tone: 'success', text: res.data.issues.length ? `Saved. ${res.data.issues.length} thing(s) to fix before review.` : 'Saved. Ready to send for review.' });
    return res.data;
  };

  const step = async (name: 'submit' | 'withdraw' | 'publish' | 'request-changes') => {
    if (name === 'submit' && dirty && !(await save())) return;
    setBusy(name);
    const res = await draftStep(draft.id, name, note);
    setBusy(null);
    if (!res.ok) return setMessage({ tone: 'error', text: res.error });
    setDraft(res.data);
    setNote('');
    const done = { submit: 'Sent for review.', withdraw: 'Back with you: keep editing.', publish: `Published as version ${res.data.publishedVersionNo ?? ''}.`, 'request-changes': 'Returned to the authors with your note.' };
    setMessage({ tone: 'success', text: done[name] });
  };

  const jump = (path: string) => {
    const t = issueTarget(path);
    setTab(t.tab);
    if (t.module !== undefined) setOpen({ module: t.module, ...(t.item !== undefined && { item: t.item }) });
    requestAnimationFrame(() => document.getElementById(t.item !== undefined ? `module-${t.module}-item-${t.item}` : t.module !== undefined ? `module-${t.module}` : 'editor-tabs')?.scrollIntoView({ block: 'center' }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">
            {draft.ownerName} · /courses/{draft.slug}
          </p>
          <h1 className="text-[28px] font-extrabold">{String(doc.title || draft.title)}</h1>
          <p className="text-[13.5px] text-muted">
            {VISIBILITY_LABELS[draft.visibility] ?? draft.visibility}
            {draft.baseVersionNo ? ` · from version ${draft.baseVersionNo}` : ' · new course'} · revision {draft.revision}
            {draft.updatedBy && ` · last saved by ${draft.updatedBy.name}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/app/authoring/${draft.id}/preview`}
              className="inline-flex min-h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-link ring-1 ring-line hover:bg-surface"
              title={dirty ? 'Save first: the preview shows the last saved version' : undefined}
            >
              Preview
            </Link>
            <Badge tone={DRAFT_STATUS_TONES[draft.status]}>{DRAFT_STATUS_LABELS[draft.status]}</Badge>
          </div>
          <span className="text-[12.5px] text-muted" aria-live="polite">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>
      </header>

      {draft.status === 'changes_requested' && draft.reviewNote && (
        <Notice tone="info">
          <strong>{draft.reviewedBy?.name ?? 'The reviewer'} asked for changes:</strong> {draft.reviewNote}
        </Notice>
      )}
      {draft.status === 'in_review' && !draft.can.review && <Notice tone="neutral">Waiting for review. Take it back to keep editing.</Notice>}
      {draft.status === 'published' && (
        <Notice tone="success">
          Published as version {draft.publishedVersionNo}.{' '}
          <Link href={`/courses/${draft.slug}`} className="font-semibold underline">
            Open the course page
          </Link>
        </Notice>
      )}
      {message && (
        <Notice tone={message.tone}>
          {message.text}{' '}
          {message.reload && (
            <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
              Reload
            </button>
          )}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2">
        {editable && (
          <div className="sm:w-40">
            <Button type="button" onClick={save} disabled={!dirty || busy !== null}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
        {draft.can.submit && (
          <div className="sm:w-52">
            <Button type="button" variant="secondary" onClick={() => step('submit')} disabled={busy !== null || (!dirty && draft.issues.length > 0)}>
              {busy === 'submit' ? 'Sending…' : 'Send for review'}
            </Button>
          </div>
        )}
        {draft.can.withdraw && (
          <div className="sm:w-52">
            <Button type="button" variant="secondary" onClick={() => step('withdraw')} disabled={busy !== null}>
              Take back to edit
            </Button>
          </div>
        )}
        {draft.can.delete && (
          <div className="sm:w-40">
            <Button
              type="button"
              variant="danger"
              disabled={busy !== null}
              onClick={async () => {
                if (!window.confirm('Discard this draft? Published versions are not affected.')) return;
                const wasDirty = dirty;
                setDirty(false);
                const res = await discardDraft(draft.id);
                if (res && !res.ok) {
                  setDirty(wasDirty);
                  setMessage({ tone: 'error', text: res.error });
                }
              }}
            >
              Discard
            </Button>
          </div>
        )}
      </div>

      {draft.can.review && (
        <Card className="space-y-3 p-5">
          <h2 className="text-[17px] font-bold">Review</h2>
          <p className="text-[13.5px] text-muted">
            Publishing makes this the course’s next version{draft.visibility === 'public' ? ' in the public catalogue' : ''}. Learners already enrolled stay on theirs.
          </p>
          <label htmlFor="review-note" className="text-[13px] font-semibold text-ink">
            Note to the authors
          </label>
          <textarea
            id="review-note"
            rows={3}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-[var(--radius-field)] bg-card px-3 py-2.5 text-[15px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => step('publish')} disabled={busy !== null || draft.issues.length > 0}>
              {busy === 'publish' ? 'Publishing…' : 'Publish'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => step('request-changes')} disabled={busy !== null || !note.trim()}>
              Ask for changes
            </Button>
          </div>
        </Card>
      )}

      {draft.issues.length > 0 && draft.status !== 'published' && (
        <Card className="space-y-2 p-4">
          <h2 className="text-[15px] font-bold">
            To fix before review <span className="font-normal text-muted">({draft.issues.length}, as of the last save)</span>
          </h2>
          <ul className="space-y-1 text-[13.5px]">
            {draft.issues.slice(0, 20).map((i, k) => (
              <li key={k}>
                <button type="button" onClick={() => jump(i.path)} className="text-left hover:underline">
                  <span className="font-mono text-[12px] text-muted">{i.path || 'course'}</span> · {i.message}
                </button>
              </li>
            ))}
          </ul>
          {draft.issues.length > 20 && <p className="text-[12.5px] text-muted">…and {draft.issues.length - 20} more.</p>}
        </Card>
      )}

      <nav id="editor-tabs" aria-label="Editor" className="flex flex-wrap gap-1.5">
        {(
          [
            ['details', 'Details'],
            ['outline', `Outline & content (${modules.length})`],
            ['json', 'JSON'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              if (key === 'json') setJsonVersion((v) => v + 1);
            }}
            className={cx('min-h-10 rounded-full px-4 text-[14px] font-semibold ring-1', tab === key ? 'bg-forest text-white ring-forest' : 'text-body ring-line hover:bg-surface')}
          >
            {label}
          </button>
        ))}
      </nav>

      <DraftIdContext.Provider value={draft.id}>
        <fieldset disabled={!editable} className="min-w-0">
          <legend className="sr-only">Course content{editable ? '' : ' (read only)'}</legend>
          {tab === 'details' && <DetailsEditor draftId={draft.id} doc={doc} set={set} />}
          {tab === 'outline' && <OutlineEditor modules={modules} setModules={(m) => set('modules', m)} open={open} setOpen={setOpen} />}
          {tab === 'json' && (
            <JsonField
              key={jsonVersion}
              label="The whole course"
              rows={28}
              value={doc}
              onChange={(v) => {
                if (v && typeof v === 'object' && !Array.isArray(v)) setDoc(v as Doc);
              }}
              hint="Everything the forms cover and more (trailer, instructors). The slug can't change."
            />
          )}
        </fieldset>
      </DraftIdContext.Provider>
    </div>
  );
}
