'use client';

import { useContext, useId } from 'react';
import { type BlockDoc, CALLOUT_TONE_LABELS, optionId } from '@/lib/blocks';
import { fileSize } from '@/lib/upload';
import { cx } from '@/components/ui/primitives';
import { AreaField, NumberField, SelectField, TextField } from '../fields';
import { DraftIdContext, MediaUploadButton } from '../media-upload';
import { ListEditor, RichTextField, RowInput } from './controls';
import { VideoForm } from './video-form';

/*
 * One form per block type (CAT-4). Each edits a copy of the block and hands back the whole block;
 * anything the form doesn't show (fields added by hand in JSON) is kept as it is.
 */

type Props = { block: BlockDoc; set: (b: BlockDoc) => void; onInsertBlock?: () => void };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);
/** List rows, skipping anything that isn't an object (a hand-edited or imported list can hold nulls). */
const rows = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : []);
const ids = (v: unknown) => rows<{ id?: string }>(v).map((o) => o.id ?? '');
/** Optional text: empty means "not set", so the schema's optional fields stay absent. */
const opt = (v: string) => (v.trim() ? v : undefined);

export function BlockForm({ block, set, onInsertBlock }: Props) {
  // Radio groups need a name unique on the page; block ids repeat across steps.
  const group = useId();
  const patch = (p: Record<string, unknown>) => set({ ...block, ...p });
  switch (block.type) {
    case 'text':
      return <RichTextField label="Text" rows={6} value={str(block.body)} onChange={(v) => patch({ body: v })} onInsertBlock={onInsertBlock} />;

    case 'callout':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
            <SelectField
              label="Kind"
              value={(str(block.tone) || 'insight') as keyof typeof CALLOUT_TONE_LABELS}
              options={Object.entries(CALLOUT_TONE_LABELS).map(([value, label]) => ({ value: value as keyof typeof CALLOUT_TONE_LABELS, label }))}
              onChange={(v) => patch({ tone: v })}
            />
            <TextField label="Heading (optional)" value={str(block.title)} maxLength={120} onChange={(v) => patch({ title: opt(v) })} />
          </div>
          <RichTextField label="Text" value={str(block.body)} onChange={(v) => patch({ body: v })} />
        </div>
      );

    case 'example':
      return (
        <div className="space-y-3">
          <TextField label="Example title" value={str(block.title)} maxLength={160} onChange={(v) => patch({ title: v })} />
          <RichTextField label="The example" rows={5} value={str(block.body)} onChange={(v) => patch({ body: v })} />
        </div>
      );

    case 'quote':
      return (
        <div className="space-y-3">
          <AreaField label="Quotation" rows={3} maxLength={600} value={str(block.text)} onChange={(v) => patch({ text: v })} hint="Without quotation marks" />
          <TextField label="Who said it" value={str(block.attribution)} maxLength={160} onChange={(v) => patch({ attribution: v })} />
        </div>
      );

    case 'key_terms':
      return (
        <ListEditor
          legend="Terms"
          noun="term"
          min={1}
          max={12}
          items={rows<{ term: string; definition: string }>(block.terms)}
          onChange={(terms) => patch({ terms })}
          create={() => ({ term: '', definition: '' })}
          render={(t, setT) => (
            <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <RowInput label="Term" value={t.term} maxLength={80} onChange={(v) => setT({ ...t, term: v })} />
              <RowInput label="Meaning" value={t.definition} maxLength={400} multiline onChange={(v) => setT({ ...t, definition: v })} />
            </div>
          )}
        />
      );

    case 'reveal':
      return (
        <div className="space-y-3">
          <AreaField label="Question to think about first" rows={2} maxLength={600} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <RichTextField label="Answer shown when tapped" value={str(block.body)} onChange={(v) => patch({ body: v })} />
        </div>
      );

    case 'framework':
      return (
        <div className="space-y-3">
          <TextField label="Framework name" value={str(block.title)} maxLength={120} onChange={(v) => patch({ title: v })} />
          <ListEditor
            legend="Steps"
            noun="step"
            ordered
            min={2}
            max={10}
            items={rows<{ label: string; detail: string }>(block.steps)}
            onChange={(steps) => patch({ steps })}
            create={() => ({ label: '', detail: '' })}
            render={(s, setS) => (
              <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <RowInput label="Step" value={s.label} maxLength={60} onChange={(v) => setS({ ...s, label: v })} />
                <RowInput label="What it means" value={s.detail} maxLength={400} multiline onChange={(v) => setS({ ...s, detail: v })} />
              </div>
            )}
          />
        </div>
      );

    case 'image':
      return <ImageForm block={block} set={set} />;

    case 'video':
      return <VideoForm block={block} set={set} />;

    case 'download':
      return <DownloadForm block={block} set={set} />;

    case 'choice': {
      const options = rows<{ id: string; text: string; correct: boolean; feedback?: string }>(block.options);
      const multiple = block.multiple === true;
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => {
                // Back to one answer: keep only the first one marked right.
                const first = options.findIndex((o) => o.correct);
                patch({ multiple: e.target.checked, ...(!e.target.checked && { options: options.map((o, i) => ({ ...o, correct: i === first })) }) });
              }}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            More than one answer is right (learners must pick all of them)
          </label>
          <ListEditor
            legend="Answers"
            noun="answer"
            min={2}
            max={8}
            hint="Tick the right answer(s); feedback shows when that answer is picked"
            items={options}
            onChange={(o) => patch({ options: o })}
            create={() => ({ id: optionId(ids(block.options)), text: '', correct: false, feedback: '' })}
            render={(o, setO, i) => (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <label className={cx('flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold ring-1', o.correct ? 'bg-success-tint text-link ring-success-line' : 'text-muted ring-line')}>
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`${group}-correct`}
                      checked={o.correct}
                      onChange={(e) =>
                        multiple ? setO({ ...o, correct: e.target.checked }) : patch({ options: options.map((x, j) => ({ ...x, correct: j === i })) })
                      }
                      aria-label={`Answer ${i + 1} is right`}
                      className="accent-[var(--color-primary)]"
                    />
                    Right
                  </label>
                  <div className="min-w-0 flex-1">
                    <RowInput label={`Answer ${i + 1}`} value={o.text} maxLength={400} onChange={(v) => setO({ ...o, text: v })} />
                  </div>
                </div>
                <RowInput label="Feedback when picked (optional)" value={o.feedback ?? ''} maxLength={600} onChange={(v) => setO({ ...o, feedback: opt(v) })} />
              </div>
            )}
          />
          <RichTextField label="Explanation" rows={3} value={str(block.explanation)} onChange={(v) => patch({ explanation: v })} hint="Shown once they get it right or run out of tries" />
        </div>
      );
    }

    case 'order':
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <ListEditor
            legend="Items, in the right order"
            noun="item"
            ordered
            min={3}
            max={8}
            hint="Learners get them shuffled"
            items={rows<{ id: string; text: string }>(block.items)}
            onChange={(items) => patch({ items })}
            create={() => ({ id: optionId(ids(block.items)), text: '' })}
            render={(o, setO, i) => <RowInput label={`Item ${i + 1}`} value={o.text} maxLength={300} onChange={(v) => setO({ ...o, text: v })} />}
          />
          <RichTextField label="Explanation" rows={3} value={str(block.explanation)} onChange={(v) => patch({ explanation: v })} />
        </div>
      );

    case 'match':
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <ListEditor
            legend="Pairs"
            noun="pair"
            min={2}
            max={8}
            hint="The right-hand side is shuffled for learners"
            items={rows<{ id: string; left: string; right: string }>(block.pairs)}
            onChange={(pairs) => patch({ pairs })}
            create={() => ({ id: optionId(ids(block.pairs)), left: '', right: '' })}
            render={(p, setP, i) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <RowInput label={`Left ${i + 1}`} value={p.left} maxLength={200} onChange={(v) => setP({ ...p, left: v })} />
                <RowInput label={`Matches with`} value={p.right} maxLength={300} onChange={(v) => setP({ ...p, right: v })} />
              </div>
            )}
          />
          <RichTextField label="Explanation" rows={3} value={str(block.explanation)} onChange={(v) => patch({ explanation: v })} />
        </div>
      );

    case 'poll':
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <ListEditor
            legend="Choices"
            noun="choice"
            min={2}
            max={8}
            items={rows<{ id: string; text: string }>(block.options)}
            onChange={(options) => patch({ options })}
            create={() => ({ id: optionId(ids(block.options)), text: '' })}
            render={(o, setO, i) => <RowInput label={`Choice ${i + 1}`} value={o.text} maxLength={300} onChange={(v) => setO({ ...o, text: v })} />}
          />
          <RichTextField label="After voting (optional)" rows={2} value={str(block.afterword)} onChange={(v) => patch({ afterword: opt(v) })} hint="Shown with how everyone voted" />
        </div>
      );

    case 'scale':
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Label for 1" value={str(block.minLabel)} maxLength={60} onChange={(v) => patch({ minLabel: v })} />
            <TextField label="Label for 5" value={str(block.maxLabel)} maxLength={60} onChange={(v) => patch({ maxLabel: v })} />
          </div>
          <RichTextField label="After answering (optional)" rows={2} value={str(block.afterword)} onChange={(v) => patch({ afterword: opt(v) })} />
        </div>
      );

    case 'reflection':
      return (
        <div className="space-y-3">
          <AreaField label="Question" rows={2} maxLength={1000} value={str(block.prompt)} onChange={(v) => patch({ prompt: v })} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField label="Guidance (optional)" value={str(block.guidance)} maxLength={600} onChange={(v) => patch({ guidance: opt(v) })} />
            <NumberField label="Minimum words" min={0} max={500} value={num(block.minWords) ?? 20} onChange={(v) => patch({ minWords: v ?? 0 })} />
          </div>
          <p className="text-[12.5px] text-muted">Answers are saved to the learner’s journal.</p>
        </div>
      );

    case 'scenario':
      return (
        <div className="space-y-3">
          <RichTextField label="The situation" rows={4} value={str(block.situation)} onChange={(v) => patch({ situation: v })} />
          <TextField label="Question" value={str(block.prompt)} maxLength={600} onChange={(v) => patch({ prompt: v })} />
          <ListEditor
            legend="Choices and what happens"
            noun="choice"
            min={2}
            max={6}
            hint="Mark the strongest choice as best (optional)"
            items={rows<{ id: string; text: string; outcome: string; best: boolean }>(block.options)}
            onChange={(options) => patch({ options })}
            create={() => ({ id: optionId(ids(block.options)), text: '', outcome: '', best: false })}
            render={(o, setO, i) => (
              <div className="space-y-2">
                <RowInput label={`Choice ${i + 1}`} value={o.text} maxLength={400} onChange={(v) => setO({ ...o, text: v })} />
                <RowInput label="What happens next" value={o.outcome} multiline onChange={(v) => setO({ ...o, outcome: v })} />
                <label className="flex items-center gap-2 text-[13px] text-ink">
                  <input type="checkbox" checked={o.best === true} onChange={(e) => setO({ ...o, best: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary)]" />
                  The best choice
                </label>
              </div>
            )}
          />
        </div>
      );
  }
}

function ImageForm({ block, set }: Props) {
  const draftId = useContext(DraftIdContext);
  const patch = (p: Record<string, unknown>) => set({ ...block, ...p });
  const url = str(block.url);
  const shown = url.startsWith('/media/') ? url : url.startsWith('https://') ? url : '';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- the author's own upload or an allowed host, as learners will see it
          <img src={shown} alt="" className="h-28 w-44 rounded-lg bg-surface object-cover ring-1 ring-line" />
        ) : (
          <span className="grid h-28 w-44 place-items-center rounded-lg bg-surface text-[12.5px] text-muted ring-1 ring-line">No image yet</span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          {draftId && (
            <MediaUploadButton
              draftId={draftId}
              kind="image"
              label={url ? 'Replace the image' : 'Upload an image'}
              onUploaded={(path) => patch({ url: `/media/${path}` })}
            />
          )}
          <TextField
            label="…or an image address"
            value={url.startsWith('/media/') ? '' : url}
            onChange={(v) => patch({ url: v.trim() })}
            placeholder="https://images.unsplash.com/…"
            hint="Unsplash or Wikimedia"
          />
        </div>
      </div>
      <TextField label="Description for people who can’t see it" value={str(block.alt)} maxLength={300} onChange={(v) => patch({ alt: v })} hint="Required" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Caption (optional)" value={str(block.caption)} maxLength={600} onChange={(v) => patch({ caption: opt(v) })} />
        <TextField label="Credit" value={str(block.credit)} maxLength={200} onChange={(v) => patch({ credit: v })} placeholder="Photo: Jane Doe / Unsplash" hint="Required" />
      </div>
    </div>
  );
}

function DownloadForm({ block, set }: Props) {
  const draftId = useContext(DraftIdContext);
  const patch = (p: Record<string, unknown>) => set({ ...block, ...p });
  const path = str(block.path);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {draftId && (
          <MediaUploadButton
            draftId={draftId}
            kind="file"
            label={path ? 'Replace the file' : 'Upload a file'}
            onUploaded={(p, file, contentType) =>
              set({
                ...block,
                path: p,
                fileName: file.name.slice(-160),
                size: file.size,
                contentType,
                title: str(block.title) || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 160),
              })
            }
          />
        )}
        {path && (
          <p className="text-[13px] text-muted">
            {str(block.fileName)} · {fileSize(num(block.size) ?? 0)}
          </p>
        )}
      </div>
      <TextField label="Title" value={str(block.title)} maxLength={160} onChange={(v) => patch({ title: v })} placeholder="e.g. Problem definition worksheet" />
      <TextField label="What it is for (optional)" value={str(block.description)} maxLength={400} onChange={(v) => patch({ description: opt(v) })} />
      <p className="text-[12px] text-muted">PDF, Word, PowerPoint, Excel, ZIP, text, CSV, pictures or MP3, up to 50 MB. Anyone who can open the lesson can download it.</p>
    </div>
  );
}
