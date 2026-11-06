'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { discardDraft, draftStep, restoreDraftSave, saveDraft } from '@/app/actions/authoring';
import { Icon } from '@/components/ui/icons';
import { Badge, Button, Card, cx, Notice } from '@/components/ui/primitives';
import { toastSuccess } from '@/components/ui/toast';
import { type Doc, type Draft, DRAFT_STATUS_LABELS, DRAFT_STATUS_TONES, type ItemDoc, type ItemType, type ModuleDoc, newItem, normaliseModules, slugify, uniqueKey, VISIBILITY_LABELS } from '@/lib/authoring';
import { describeIssue, ITEM_NAMES, qualityTips, type Selection, selKey } from '@/lib/course-outline';
import { move } from './blocks/controls';
import { DetailsEditor } from './details-editor';
import { JsonField } from './fields';
import { HistoryPanel } from './history-panel';
import { ItemEditor, ModuleEditor } from './item-editors';
import { ItemPreview } from './item-preview';
import { DraftIdContext } from './media-upload';
import { type OutlineActions, OutlineTree, RowMenu } from './outline-tree';
import { SetupWizard } from './setup-wizard';

/*
 * The course workspace (CAT-5). The outline on the left, the selected part in the middle, a live
 * preview on the right. Changes save themselves a moment after you stop (Ctrl+S saves straight
 * away and keeps a checkpoint); undo and redo cover the whole course; the version history restores
 * earlier checkpoints. The API refuses a save made over someone else's newer one.
 */

type SaveState = { kind: 'saved'; at: number } | { kind: 'saving' } | { kind: 'unsaved' } | { kind: 'error'; text: string; reload?: boolean };
const AUTOSAVE_MS = 2500;

function SaveIndicator({ state, dirty }: { state: SaveState; dirty: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  const view =
    state.kind === 'saving'
      ? { dot: 'bg-gold animate-pulse', text: 'Saving…' }
      : state.kind === 'error'
        ? { dot: 'bg-danger', text: 'Not saved' }
        : dirty
          ? { dot: 'bg-gold', text: 'Unsaved changes' }
          : state.kind === 'saved'
            ? { dot: 'bg-primary', text: Math.max(now, state.at) - state.at < 45_000 ? 'Saved just now' : `Saved ${Math.max(1, Math.round((now - state.at) / 60_000))} min ago` }
            : { dot: 'bg-primary', text: 'All changes saved' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted" aria-live="polite">
      <span aria-hidden className={cx('h-2 w-2 rounded-full', view.dot)} />
      {view.text}
    </span>
  );
}

const pillBase = 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const pill = `${pillBase} text-body ring-line hover:bg-surface hover:text-ink`;
const pillOn = `${pillBase} bg-forest text-white ring-forest`;

export function DraftEditor({ initial }: { initial: Draft }) {
  const [draft, setDraft] = useState(initial);
  const [doc, setDocState] = useState<Doc>(initial.doc as Doc);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'saved', at: Date.parse(initial.updatedAt) || 0 });
  const [sel, setSel] = useState<Selection>(() => (normaliseModules(initial.doc.modules).length ? { kind: 'item', m: 0, i: 0 } : { kind: 'details' }));
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState<'phone' | 'laptop'>('laptop');
  const [history, setHistoryOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [jsonVersion, setJsonVersion] = useState(0);
  const isNew = initial.baseVersionNo === null && normaliseModules(initial.doc.modules).length === 0 && !String(initial.doc.description ?? '').trim();
  const [wizard, setWizard] = useState(isNew && initial.can.edit);
  const editable = draft.can.edit;

  const latest = useRef(doc);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);

  // ---------- undo and redo ----------
  const saved = useRef<Doc>(initial.doc as Doc);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const lastEdit = useRef(0);
  const [hist, setHist] = useState({ past: 0, future: 0 });
  const syncHist = useCallback(() => setHist({ past: past.current.length, future: future.current.length }), []);
  const setDoc = useCallback(
    (next: Doc) => {
      // Typing in a field merges into one undo step; anything else (adding, moving, removing) is its own.
      const now = Date.now();
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (/^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable);
      if (!typing || now - lastEdit.current > 800) {
        past.current = [...past.current.slice(-99), latest.current];
        future.current = [];
      }
      lastEdit.current = typing ? now : 0;
      setDocState(next);
      setDirty(true);
      setSaveState((s) => (s.kind === 'error' ? s : { kind: 'unsaved' }));
      syncHist();
    },
    [syncHist],
  );
  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [latest.current, ...future.current];
    lastEdit.current = 0;
    setDocState(prev);
    setDirty(prev !== saved.current);
    setJsonVersion((v) => v + 1);
    syncHist();
  }, [syncHist]);
  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, latest.current];
    lastEdit.current = 0;
    setDocState(next);
    setDirty(next !== saved.current);
    setJsonVersion((v) => v + 1);
    syncHist();
  }, [syncHist]);

  const set = (key: string, value: unknown) => setDoc({ ...doc, [key]: value });
  const modules = useMemo(() => normaliseModules(doc.modules), [doc.modules]);
  const setModules = (m: ModuleDoc[]) => setDoc({ ...doc, modules: m });

  // ---------- saving ----------
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const save = useCallback(async (checkpoint: boolean): Promise<Draft | null> => {
    const sent = latest.current;
    setBusy('save');
    setSaveState({ kind: 'saving' });
    const res = await saveDraft(draftRef.current.id, draftRef.current.revision, sent, checkpoint);
    setBusy(null);
    if (!res.ok) {
      setSaveState({ kind: 'error', text: res.error, reload: res.code === 'draft_changed' });
      return null;
    }
    setDraft(res.data);
    draftRef.current = res.data;
    saved.current = sent;
    // Edits made while the save was on its way are still unsaved.
    setDirty(latest.current !== sent);
    setSaveState({ kind: 'saved', at: Date.now() });
    if (checkpoint) toastSuccess(res.data.issues.length ? `Saved. ${res.data.issues.length} thing(s) to fix before review.` : 'Saved. Ready to send for review.');
    return res.data;
  }, []);

  // Autosave a moment after the last change.
  useEffect(() => {
    if (!dirty || !editable || busy !== null || saveState.kind === 'error') return;
    const t = setTimeout(() => void save(false), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [doc, dirty, editable, busy, saveState.kind, save]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Ctrl/Cmd+S saves (a checkpoint); Ctrl/Cmd+Z and Shift+Z (or Y) undo and redo outside text fields.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (busyRef.current === null) void save(true);
        return;
      }
      const t = e.target;
      if (t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
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
  }, [editable, undo, redo, save]);

  const step = async (name: 'submit' | 'withdraw' | 'publish' | 'request-changes') => {
    if (name === 'submit' && dirty && !(await save(true))) return;
    setBusy(name);
    const res = await draftStep(draft.id, name, note);
    setBusy(null);
    if (!res.ok) return setSaveState({ kind: 'error', text: res.error });
    setDraft(res.data);
    setNote('');
    const done = { submit: 'Sent for review.', withdraw: 'Back with you: keep editing.', publish: `Published as version ${res.data.publishedVersionNo ?? ''}.`, 'request-changes': 'Returned to the authors with your note.' };
    toastSuccess(done[name]);
  };

  const restore = async (revision: number) => {
    if (dirty && !(await save(true))) return;
    const res = await restoreDraftSave(draft.id, draftRef.current.revision, revision);
    if (!res.ok) return setSaveState({ kind: 'error', text: res.error, reload: res.code === 'draft_changed' });
    setDraft(res.data);
    const restored = res.data.doc as Doc;
    past.current = [...past.current, latest.current];
    future.current = [];
    saved.current = restored;
    setDocState(restored);
    setDirty(false);
    setJsonVersion((v) => v + 1);
    syncHist();
    setSaveState({ kind: 'saved', at: Date.now() });
    toastSuccess(`Restored revision ${revision}. What you had is kept in the history.`);
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    a.download = `${draft.slug}-draft-r${draft.revision}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The file is not a course (expected a JSON object).');
      if (!window.confirm(`Replace this whole draft with “${file.name}”? You can undo it.`)) return;
      setDoc({ ...(parsed as Doc), slug: draft.slug });
      setJsonVersion((v) => v + 1);
      toastSuccess(`Imported ${file.name}. It saves in a moment.`);
    } catch (err) {
      setSaveState({ kind: 'error', text: err instanceof Error ? `Couldn’t import ${file.name}: ${err.message}` : `Couldn’t import ${file.name}.` });
    }
  };

  // ---------- outline actions ----------
  const actions: OutlineActions = {
    addModule: () => {
      const title = `Module ${modules.length + 1}`;
      const key = uniqueKey(slugify(title, 'module'), modules.map((m) => m.key));
      setModules([...modules, { key, title, summary: '', weekNo: null, items: [newItem('lesson', 'First lesson', 'first-lesson')] }]);
      setSel({ kind: 'module', m: modules.length });
    },
    addItem: (m: number, type: ItemType) => {
      const mod = modules[m]!;
      const title = `New ${ITEM_NAMES[type].toLowerCase()}`;
      const key = uniqueKey(slugify(title), mod.items.map((x) => x.key));
      setModules(modules.map((x, j) => (j === m ? { ...x, items: [...x.items, newItem(type, title, key)] } : x)));
      setSel({ kind: 'item', m, i: mod.items.length });
    },
    duplicateModule: (m) => {
      const copy = structuredClone(modules[m]!);
      copy.key = uniqueKey(`${copy.key.slice(0, 38)}-copy`, modules.map((x) => x.key));
      copy.title = `${copy.title} (copy)`;
      const next = [...modules];
      next.splice(m + 1, 0, copy);
      setModules(next);
      setSel({ kind: 'module', m: m + 1 });
    },
    removeModule: (m) => {
      const mod = modules[m]!;
      if (!window.confirm(`Remove “${mod.title || 'this module'}” and its ${mod.items.length} item(s)? You can undo it.`)) return;
      setModules(modules.filter((_, j) => j !== m));
      setSel({ kind: 'details' });
    },
    duplicateItem: (m, i) => {
      const mod = modules[m]!;
      const copy = structuredClone(mod.items[i]!) as ItemDoc;
      copy.key = uniqueKey(`${copy.key.slice(0, 38)}-copy`, mod.items.map((x) => x.key));
      copy.title = `${copy.title} (copy)`;
      const items = [...mod.items];
      items.splice(i + 1, 0, copy);
      setModules(modules.map((x, j) => (j === m ? { ...x, items } : x)));
      setSel({ kind: 'item', m, i: i + 1 });
    },
    removeItem: (m, i) => {
      const item = modules[m]!.items[i]!;
      if (!window.confirm(`Remove “${item.title || 'this item'}”? You can undo it.`)) return;
      setModules(modules.map((x, j) => (j === m ? { ...x, items: x.items.filter((_, k) => k !== i) } : x)));
      setSel({ kind: 'module', m });
    },
    moveItem: (from, to) => {
      const next = modules.map((x) => ({ ...x, items: [...x.items] }));
      const [item] = next[from.m]!.items.splice(from.i, 1);
      if (!item) return;
      const target = next[to.m]!;
      // Keys are unique within a module.
      if (from.m !== to.m) item.key = uniqueKey(item.key, target.items.map((x) => x.key));
      const at = Math.min(to.i, target.items.length);
      target.items.splice(at, 0, item);
      setModules(next);
      setSel({ kind: 'item', m: to.m, i: at });
    },
    moveModule: (from, to) => {
      if (to < 0 || to >= modules.length) return;
      setModules(move(modules, from, to));
      setSel({ kind: 'module', m: to });
    },
  };

  // ---------- problems and tips ----------
  const described = useMemo(() => draft.issues.map((i) => describeIssue(modules, i)), [draft.issues, modules]);
  const problems = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of described) map.set(selKey(d.sel), (map.get(selKey(d.sel)) ?? 0) + 1);
    return map;
  }, [described]);
  const tips = useMemo(() => qualityTips(doc, modules), [doc, modules]);

  const selectedItem = sel.kind === 'item' ? modules[sel.m]?.items[sel.i] : undefined;
  const selectedModule = sel.kind === 'module' || sel.kind === 'item' ? modules[sel.m] : undefined;
  // A selection that no longer exists (after undo or a removal) shows the course details instead.
  const view: Selection = (sel.kind === 'item' && !selectedItem) || (sel.kind === 'module' && !selectedModule) ? { kind: 'details' } : sel;

  const pick = (s: Selection) => {
    setSel(s);
    setOutlineOpen(false);
    requestAnimationFrame(() => document.getElementById('workspace-main')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  if (wizard) {
    return (
      <DraftIdContext.Provider value={draft.id}>
        <SetupWizard
          doc={doc}
          onSkip={() => setWizard(false)}
          onFinish={(next) => {
            setDoc(next);
            setWizard(false);
            setSel({ kind: 'item', m: 0, i: 0 });
          }}
        />
      </DraftIdContext.Provider>
    );
  }

  const outline = <OutlineTree modules={modules} sel={view} setSel={pick} problems={problems} tipCount={tips.length} actions={actions} editable={editable} />;
  const side = preview || history;

  return (
    <DraftIdContext.Provider value={draft.id}>
      <div className="space-y-4">
        {/* The top bar stays in view while you scroll. */}
        <div className="sticky top-[4.25rem] z-10 rounded-[var(--radius-card)] bg-card/95 px-3 py-2.5 shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur lg:top-[4.75rem]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link href="/app/authoring" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted ring-1 ring-line hover:bg-surface hover:text-ink" aria-label="Back to Authoring">
              <span aria-hidden>←</span>
            </Link>
            <button type="button" onClick={() => setOutlineOpen(true)} className={cx(pill, 'lg:hidden')} aria-label="Open the course outline">
              <Icon name="menu" className="h-4 w-4" /> Outline
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-extrabold leading-tight text-ink">{String(doc.title || draft.title)}</h1>
              <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <Badge tone={DRAFT_STATUS_TONES[draft.status]}>{DRAFT_STATUS_LABELS[draft.status]}</Badge>
                <span>{VISIBILITY_LABELS[draft.visibility] ?? draft.visibility}</span>
                <span aria-hidden>·</span>
                <span>{draft.baseVersionNo ? `from version ${draft.baseVersionNo}` : 'new course'}</span>
                <span aria-hidden>·</span>
                <SaveIndicator state={saveState} dirty={dirty} />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {editable && (
                <>
                  <button type="button" onClick={undo} disabled={hist.past === 0} title="Undo (Ctrl+Z)" aria-label="Undo" className={cx(pill, 'max-sm:hidden')}>
                    ↶
                  </button>
                  <button type="button" onClick={redo} disabled={hist.future === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className={cx(pill, 'max-sm:hidden')}>
                    ↷
                  </button>
                  <button type="button" onClick={() => void save(true)} disabled={busy !== null || (!dirty && saveState.kind !== 'error')} title="Save now (Ctrl+S)" className={cx(pill, 'max-sm:hidden')}>
                    {busy === 'save' ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setHistoryOpen((h) => !h);
                  setPreview(false);
                }}
                aria-pressed={history}
                className={history ? pillOn : pill}
              >
                <Icon name="refresh" className="h-4 w-4" /> History
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview((p) => !p);
                  setHistoryOpen(false);
                }}
                aria-pressed={preview}
                className={preview ? pillOn : pill}
              >
                Preview
              </button>
              {draft.can.submit && (
                <button
                  type="button"
                  onClick={() => void step('submit')}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-white hover:bg-forest disabled:opacity-50"
                >
                  {busy === 'submit' ? 'Sending…' : 'Send for review'}
                </button>
              )}
              {draft.can.withdraw && (
                <button type="button" onClick={() => void step('withdraw')} disabled={busy !== null} className={pill}>
                  Take back to edit
                </button>
              )}
              <RowMenu
                label="More actions"
                items={[
                  { label: 'Open the full preview', onSelect: () => window.open(`/app/authoring/${draft.id}/preview`, '_blank', 'noopener') },
                  { label: 'Download as JSON', onSelect: download },
                  { label: 'Advanced: JSON', onSelect: () => pick({ kind: 'json' }) },
                  ...(draft.can.delete
                    ? [
                        'divider' as const,
                        {
                          label: 'Discard draft…',
                          danger: true,
                          onSelect: async () => {
                            if (!window.confirm('Discard this draft? Published versions are not affected.')) return;
                            setDirty(false);
                            const res = await discardDraft(draft.id);
                            if (res && !res.ok) setSaveState({ kind: 'error', text: res.error });
                          },
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>
          {saveState.kind === 'error' && (
            <div className="mt-2">
              <Notice tone="error">
                {saveState.text}{' '}
                {saveState.reload ? (
                  <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
                    Reload
                  </button>
                ) : (
                  <button type="button" onClick={() => void save(true)} className="font-semibold underline">
                    Try again
                  </button>
                )}
              </Notice>
            </div>
          )}
        </div>

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
              <Button type="button" onClick={() => void step('publish')} disabled={busy !== null || draft.issues.length > 0}>
                {busy === 'publish' ? 'Publishing…' : 'Publish'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void step('request-changes')} disabled={busy !== null || !note.trim()}>
                Ask for changes
              </Button>
            </div>
          </Card>
        )}

        <div className={cx('grid items-start gap-5', side ? 'lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_25rem]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]')}>
          {/* The outline: a column on large screens, a drawer on small ones. */}
          <div className="sticky top-[9.5rem] hidden h-[calc(100dvh-11rem)] overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-soft)] ring-1 ring-line lg:block">{outline}</div>
          {outlineOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Course outline">
              <div className="absolute inset-0 bg-forest/35 backdrop-blur-[2px]" onClick={() => setOutlineOpen(false)} aria-hidden />
              <div className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-card shadow-[var(--shadow-panel)]">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <span className="text-[14px] font-bold">Outline</span>
                  <button type="button" onClick={() => setOutlineOpen(false)} aria-label="Close the outline" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">{outline}</div>
              </div>
            </div>
          )}

          <section id="workspace-main" aria-label="Editor" className="min-w-0 scroll-mt-40">
            <fieldset disabled={!editable} className="min-w-0">
              <legend className="sr-only">Course content{editable ? '' : ' (read only)'}</legend>
              <Card className="p-5 sm:p-7">
                {view.kind === 'details' && (
                  <div className="space-y-5">
                    <header className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Course details</p>
                      <h2 className="text-[24px] font-extrabold">How the course is introduced</h2>
                    </header>
                    <DetailsEditor draftId={draft.id} doc={doc} set={set} />
                  </div>
                )}
                {view.kind === 'checklist' && <Checklist described={described} tips={tips} onGo={pick} canSubmit={draft.can.submit} onSubmit={() => void step('submit')} />}
                {view.kind === 'json' && (
                  <div className="space-y-4">
                    <header className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Advanced</p>
                      <h2 className="text-[24px] font-extrabold">The course as JSON</h2>
                      <p className="text-[14px] text-muted">For power users and for moving a course between environments. The web address stays /courses/{draft.slug}.</p>
                    </header>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={download} className={pill}>
                        Download as JSON
                      </button>
                      <label className={cx(pill, 'cursor-pointer focus-within:ring-2 focus-within:ring-primary')}>
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
                    <JsonField
                      key={jsonVersion}
                      label="The whole course"
                      rows={28}
                      value={doc}
                      onChange={(v) => {
                        if (v && typeof v === 'object' && !Array.isArray(v)) setDoc(v as Doc);
                      }}
                      hint="Everything the forms cover and more. The slug can't change."
                    />
                  </div>
                )}
                {view.kind === 'module' && selectedModule && (
                  <ModuleEditor index={view.m} module={selectedModule} onChange={(next) => setModules(modules.map((x, j) => (j === view.m ? next : x)))} />
                )}
                {view.kind === 'item' && selectedItem && (
                  <ItemEditor
                    key={`${view.m}-${view.i}-${jsonVersion}`}
                    moduleIndex={view.m}
                    item={selectedItem}
                    onChange={(next) => setModules(modules.map((x, j) => (j === view.m ? { ...x, items: x.items.map((it, k) => (k === view.i ? next : it)) } : x)))}
                  />
                )}
              </Card>
            </fieldset>
          </section>

          {side && (
            <aside className="fixed inset-0 z-40 bg-card xl:sticky xl:inset-auto xl:top-[9.5rem] xl:z-auto xl:h-[calc(100dvh-11rem)] xl:overflow-hidden xl:rounded-[var(--radius-card)] xl:shadow-[var(--shadow-soft)] xl:ring-1 xl:ring-line">
              {history ? (
                <HistoryPanel draftId={draft.id} slug={draft.slug} currentRevision={draft.revision} editable={editable} onRestore={restore} onClose={() => setHistoryOpen(false)} />
              ) : (
                <div className="flex h-full min-h-0 flex-col" aria-label="Live preview">
                  <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                    <span className="text-[14px] font-bold text-ink">Live preview</span>
                    <span className="flex items-center gap-1">
                      {(['laptop', 'phone'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={device === d}
                          onClick={() => setDevice(d)}
                          className={cx('rounded-full px-2.5 py-1 text-[12px] font-semibold', device === d ? 'bg-forest text-white' : 'text-muted hover:bg-surface')}
                        >
                          {d === 'laptop' ? 'Laptop' : 'Phone'}
                        </button>
                      ))}
                      <button type="button" onClick={() => setPreview(false)} aria-label="Close the preview" className="ml-1 grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink">
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-page p-4">
                    {view.kind === 'item' && selectedItem && selectedModule ? (
                      <ItemPreview module={selectedModule} moduleIndex={view.m} item={selectedItem} device={device} />
                    ) : (
                      <p className="p-4 text-center text-[13.5px] text-muted">Pick a lesson, quiz, assignment or discussion in the outline to preview it here.</p>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </DraftIdContext.Provider>
  );
}

type Found = { sel: Selection; where: string; message: string };

function Checklist({ described, tips, onGo, canSubmit, onSubmit }: { described: Found[]; tips: Found[]; onGo: (s: Selection) => void; canSubmit: boolean; onSubmit: () => void }) {
  const row = (d: Found, k: number, tone: 'danger' | 'gold') => (
    <li key={k}>
      <button type="button" onClick={() => onGo(d.sel)} className="group flex w-full items-start gap-3 rounded-[var(--radius-field)] p-3 text-left ring-1 ring-line hover:bg-surface">
        <span aria-hidden className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', tone === 'danger' ? 'bg-danger' : 'bg-gold')} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-muted">{d.where}</span>
          <span className="block text-[14.5px] text-ink">{d.message}</span>
        </span>
        <span className="shrink-0 self-center text-[13px] font-semibold text-link opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Go to it →</span>
      </button>
    </li>
  );
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Ready to publish</p>
        <h2 className="text-[24px] font-extrabold">{described.length === 0 ? 'Nothing stops this course going for review' : `${described.length} thing${described.length === 1 ? '' : 's'} to fix before review`}</h2>
        <p className="text-[14px] text-muted">Checked every time the course saves. Click one to go straight to it.</p>
      </header>
      {described.length > 0 ? (
        <ul className="space-y-2">{described.slice(0, 60).map((d, k) => row(d, k, 'danger'))}</ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-success-tint p-4 ring-1 ring-success-line">
          <p className="text-[14.5px] text-forest">Everything required is in place.</p>
          {canSubmit && (
            <button type="button" onClick={onSubmit} className="rounded-full bg-primary px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-forest">
              Send for review
            </button>
          )}
        </div>
      )}
      {tips.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[16px] font-bold">Suggestions ({tips.length})</h3>
          <p className="text-[13.5px] text-muted">Not required, but they make the course better for learners.</p>
          <ul className="space-y-2">{tips.map((t, k) => row(t, k, 'gold'))}</ul>
        </section>
      )}
    </div>
  );
}
