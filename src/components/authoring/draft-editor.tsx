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
import { toastSuccess } from '@/components/ui/toast';

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
  const [message, setMessage] = useState<{ tone: 'error'; text: string; reload?: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [jsonVersion, setJsonVersion] = useState(0);
  const editable = draft.can.edit;
  // The document as it is now, for saves that finish after more edits were made.
  const latest = useRef(doc);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);

  // Undo and redo across the whole course. Quick edits in a row (typing) count as one step.
  const saved = useRef<Doc>(initial.doc as Doc);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const lastEdit = useRef(0);
  const [history, setHistory] = useState({ past: 0, future: 0 });
  const setDoc = useCallback((next: Doc) => {
    // Typing in a field merges into one undo step; anything else (adding, moving, removing) is its own.
    const now = Date.now();
    const typing = document.activeElement instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (!typing || now - lastEdit.current > 800) {
      past.current = [...past.current.slice(-99), latest.current];
      future.current = [];
    }
    lastEdit.current = typing ? now : 0;
    setDocState(next);
    setDirty(true);
    setHistory({ past: past.current.length, future: future.current.length });
  }, []);
  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [latest.current, ...future.current];
    lastEdit.current = 0;
    setDocState(prev);
    setDirty(prev !== saved.current);
    setJsonVersion((v) => v + 1);
    setHistory({ past: past.current.length, future: future.current.length });
  }, []);
  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, latest.current];
    lastEdit.current = 0;
    setDocState(next);
    setDirty(next !== saved.current);
    setJsonVersion((v) => v + 1);
    setHistory({ past: past.current.length, future: future.current.length });
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
    saved.current = sent;
    // Edits made while the save was on its way are still unsaved.
    setDirty(latest.current !== sent);
    setMessage(null);
    toastSuccess(res.data.issues.length ? `Saved. ${res.data.issues.length} thing(s) to fix before review.` : 'Saved. Ready to send for review.');
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
    setMessage(null);
    toastSuccess(done[name]);
  };

  // Ctrl/Cmd+S saves; Ctrl/Cmd+Z and Shift+Z (or Y) undo and redo, except while typing in a field,
  // where the field's own undo applies.
  const saveRef = useRef(save);
  useEffect(() => {
    // One save at a time, and only when there is something to save.
    saveRef.current = async () => (busy === null && dirty ? save() : null);
  });
  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        void saveRef.current();
        return;
      }
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, undo, redo]);

  const download = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${draft.slug}-draft-r${draft.revision}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The file is not a course (expected a JSON object).');
      if (!window.confirm(`Replace this whole draft with “${file.name}”? You can undo it, and nothing is saved until you click Save.`)) return;
      // The web address belongs to the draft and can't change.
      setDoc({ ...(parsed as Doc), slug: draft.slug });
      setJsonVersion((v) => v + 1);
      toastSuccess(`Imported ${file.name}. Check it, then save.`);
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? `Couldn’t import ${file.name}: ${err.message}` : `Couldn’t import ${file.name}.` });
    }
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
        {editable && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={history.past === 0}
              title="Undo (Ctrl+Z)"
              className="min-h-11 rounded-full px-4 text-[14px] font-semibold text-link ring-1 ring-line hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={history.future === 0}
              title="Redo (Ctrl+Shift+Z)"
              className="min-h-11 rounded-full px-4 text-[14px] font-semibold text-link ring-1 ring-line hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↷ Redo
            </button>
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
            ['json', 'Advanced: JSON'],
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
            <div className="space-y-4">
              <Card className="space-y-3 p-4">
                <p className="text-[14px] text-body">
                  For power users and for moving a course between environments: download the whole course as a file, or replace this draft with one. The web address stays{' '}
                  <span className="font-mono text-[13px]">/courses/{draft.slug}</span>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={download} className="min-h-11 rounded-full px-4 text-[14px] font-semibold text-link ring-1 ring-line-strong hover:bg-surface">
                    Download as JSON
                  </button>
                  <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[14px] font-semibold text-link ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-primary hover:bg-surface">
                    Import a JSON file
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="sr-only"
                      onChange={(e) => {
                        void importFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </Card>
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
            </div>
          )}
        </fieldset>
      </DraftIdContext.Provider>
    </div>
  );
}
