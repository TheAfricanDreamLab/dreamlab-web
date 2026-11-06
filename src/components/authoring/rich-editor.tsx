'use client';

import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { docToText, textToDoc } from '@/lib/rich-editor-doc';
import { safeHref, wordCount } from '@/lib/rich-markdown';

/*
 * The course text editor (CAT-5): what you see is what learners get. Headings, bold, italic,
 * underline, links, lists, quotes, code and tables; a "/" menu at the start of an empty line;
 * pasting from Word or Google Docs keeps headings, lists, links and tables. It stores the same safe
 * course markup the learner pages render (lib/rich-markdown), never HTML.
 */

type Command = { label: string; hint: string; keys?: string; run: (e: Editor) => void; active?: (e: Editor) => boolean };

const COMMANDS: Command[] = [
  { label: 'Text', hint: 'A plain paragraph', run: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive('paragraph') },
  { label: 'Heading', hint: 'A section title', keys: '##', run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  { label: 'Subheading', hint: 'A smaller title', keys: '###', run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  { label: 'Bulleted list', hint: 'Points in any order', keys: '-', run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
  { label: 'Numbered list', hint: 'Steps in order', keys: '1.', run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
  { label: 'Quote', hint: 'Words someone said', keys: '>', run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
  { label: 'Code', hint: 'Code or a formula, shown as typed', keys: '```', run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive('codeBlock') },
  { label: 'Table', hint: 'Rows and columns', run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run() },
];

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const ICON = {
  link: svg(
    <>
      <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" />
      <path d="M11.5 8.5a3 3 0 0 0-4.2 0L4.7 11.1a3 3 0 0 0 4.2 4.2l.9-.9" />
    </>,
  ),
  bullets: svg(
    <>
      <circle cx="4" cy="5.5" r="1" fill="currentColor" />
      <circle cx="4" cy="10" r="1" fill="currentColor" />
      <circle cx="4" cy="14.5" r="1" fill="currentColor" />
      <path d="M8 5.5h9M8 10h9M8 14.5h9" />
    </>,
  ),
  numbers: svg(<path d="M3.5 4h1v3M3 7h2.2M3 11.5c0-.8.6-1.2 1.2-1.2s1 .4 1 .9c0 .9-2.2 1.6-2.2 2.6h2.3M8.5 5.5h8.5M8.5 10h8.5M8.5 14.5h8.5" />),
  quote: svg(<path d="M4 6.5h4v4H5.5L4 13M11.5 6.5h4v4H13L11.5 13" />),
  code: svg(<path d="m7 6-4 4 4 4M13 6l4 4-4 4" />),
  inline: svg(<path d="M8 6.5 5.5 10 8 13.5M12 6.5l2.5 3.5-2.5 3.5" />),
  table: svg(
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 8h14M3 12h14M8.5 4v12" />
    </>,
  ),
};

function Tool({ label, onClick, active, children, disabled }: { label: string; onClick: () => void; active?: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        'grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[13px] transition-colors disabled:opacity-40',
        active ? 'bg-forest text-white' : 'text-body hover:bg-surface',
      )}
    >
      {children}
    </button>
  );
}

export function RichEditor({
  label,
  value,
  onChange,
  rows = 4,
  maxLength = 12_000,
  hint,
  onInsertBlock,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  hint?: ReactNode;
  /** Offered in the "/" menu: add a course block (image, video, question…) after this one. */
  onInsertBlock?: () => void;
}) {
  const id = useId();
  const emitted = useRef(value);
  const [slash, setSlash] = useState<{ index: number } | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  // The "/" menu is driven from the editor's keydown, which only sees refs.
  const slashRef = useRef(slash);
  const keysRef = useRef<(e: KeyboardEvent) => boolean>(() => false);
  useEffect(() => {
    slashRef.current = slash;
  }, [slash]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, horizontalRule: false, link: { openOnClick: false, autolink: true, protocols: ['https'], isAllowedUri: (url) => safeHref(url) !== null } }),
      Placeholder.configure({ placeholder: 'Write here, or type / for headings, lists, tables and more' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: textToDoc(value),
    editorProps: {
      handleKeyDown: (_view, event) => keysRef.current(event),
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class: 'dl-rich max-w-none px-3.5 py-3 text-[15px] leading-relaxed text-ink focus:outline-none',
        style: `min-height:${Math.max(3, rows) * 1.6 + 1.5}rem`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const text = docToText(e.getJSON());
      // "/" alone on an empty line opens the menu.
      const { $from } = e.state.selection;
      setSlash($from.parent.type.name === 'paragraph' && $from.parent.textContent === '/' ? { index: 0 } : null);
      if (text.length > maxLength) return setTooLong(true);
      setTooLong(false);
      emitted.current = text;
      change.current(text);
    },
  });

  // Changes from outside (undo, import, restore) replace the content; our own edits don't.
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(textToDoc(value), { emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            code: e.isActive('code'),
            link: e.isActive('link'),
            inTable: e.isActive('table'),
            block: COMMANDS.findIndex((c) => c.active?.(e)),
          }
        : null,
  });

  const menu: Command[] = [...COMMANDS, ...(onInsertBlock ? [{ label: 'Course block…', hint: 'Image, video, question, callout…', run: () => onInsertBlock() }] : [])];
  const runSlash = (cmd: Command) => {
    if (!editor) return;
    // Remove the "/" first.
    editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run();
    setSlash(null);
    cmd.run(editor);
  };

  useEffect(() => {
    keysRef.current = (event) => {
      const open = slashRef.current;
      if (!open) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setSlash({ index: (open.index + step + menu.length) % menu.length });
        return true;
      }
      if (event.key === 'Enter') {
        runSlash(menu[open.index]!);
        return true;
      }
      if (event.key === 'Escape') {
        setSlash(null);
        return true;
      }
      return false;
    };
  });

  const setLink = () => {
    if (!editor) return;
    if (editor.isActive('link')) return void editor.chain().focus().unsetLink().run();
    const url = window.prompt('Link address (https://…)', 'https://');
    if (!url) return;
    const safe = safeHref(url);
    if (!safe) return window.alert('Use a full https:// address.');
    if (editor.state.selection.empty) editor.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: safe } }] }).run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
  };

  const words = wordCount(value);
  return (
    <div className="space-y-1.5">
      <span className="block text-[13px] font-semibold text-ink" id={`${id}-label`}>
        {label}
      </span>
      <div className="relative rounded-[var(--radius-field)] bg-card ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-primary">
        <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
          <select
            aria-label="Paragraph style"
            value={state && state.block >= 0 && state.block <= 2 ? String(state.block) : '0'}
            onChange={(e) => editor && COMMANDS[Number(e.target.value)]!.run(editor)}
            className="h-8 rounded-md bg-transparent px-1.5 text-[13px] text-body hover:bg-surface"
          >
            <option value="0">Text</option>
            <option value="1">Heading</option>
            <option value="2">Subheading</option>
          </select>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <Tool label="Bold (Ctrl+B)" active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <b>B</b>
          </Tool>
          <Tool label="Italic (Ctrl+I)" active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <i>I</i>
          </Tool>
          <Tool label="Underline (Ctrl+U)" active={state?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <u>U</u>
          </Tool>
          <Tool label="Inline code" active={state?.code} onClick={() => editor?.chain().focus().toggleCode().run()}>
            {ICON.inline}
          </Tool>
          <Tool label={state?.link ? 'Remove link' : 'Link'} active={state?.link} onClick={setLink}>
            {ICON.link}
          </Tool>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <Tool label="Bulleted list" active={state?.block === 3} onClick={() => editor && COMMANDS[3]!.run(editor)}>
            {ICON.bullets}
          </Tool>
          <Tool label="Numbered list" active={state?.block === 4} onClick={() => editor && COMMANDS[4]!.run(editor)}>
            {ICON.numbers}
          </Tool>
          <Tool label="Quote" active={state?.block === 5} onClick={() => editor && COMMANDS[5]!.run(editor)}>
            {ICON.quote}
          </Tool>
          <Tool label="Code block" active={state?.block === 6} onClick={() => editor && COMMANDS[6]!.run(editor)}>
            {ICON.code}
          </Tool>
          <Tool label="Insert a table" onClick={() => editor && COMMANDS[7]!.run(editor)}>
            {ICON.table}
          </Tool>
          {state?.inTable && (
            <>
              <span className="mx-1 h-5 w-px bg-line" aria-hidden />
              <Tool label="Add a row" onClick={() => editor?.chain().focus().addRowAfter().run()}>
                +R
              </Tool>
              <Tool label="Add a column" onClick={() => editor?.chain().focus().addColumnAfter().run()}>
                +C
              </Tool>
              <Tool label="Remove the row" onClick={() => editor?.chain().focus().deleteRow().run()}>
                −R
              </Tool>
              <Tool label="Remove the column" onClick={() => editor?.chain().focus().deleteColumn().run()}>
                −C
              </Tool>
              <Tool label="Remove the table" onClick={() => editor?.chain().focus().deleteTable().run()}>
                ✕
              </Tool>
            </>
          )}
        </div>
        <EditorContent editor={editor} aria-labelledby={`${id}-label`} />
        {slash && editor && (
          <div
            role="listbox"
            aria-label="Insert"
            className="absolute left-3 top-12 z-20 w-72 overflow-hidden rounded-[var(--radius-field)] bg-card py-1 shadow-[var(--shadow-panel)] ring-1 ring-line"
            onKeyDown={(e) => e.key === 'Escape' && setSlash(null)}
          >
            {menu.map((cmd, i) => (
              <button
                key={cmd.label}
                type="button"
                role="option"
                aria-selected={i === slash.index}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runSlash(cmd)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-success-tint"
              >
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{cmd.label}</span>
                  <span className="block text-[12px] text-muted">{cmd.hint}</span>
                </span>
                {cmd.keys && <span className="font-mono text-[11px] text-faint">{cmd.keys}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>{tooLong ? <span className="text-danger-ink">Too long: the last change wasn’t kept (at most {maxLength.toLocaleString()} characters).</span> : (hint ?? 'Type / for headings, lists and tables. Paste from Word or Google Docs keeps the formatting.')}</span>
        <span>
          {words} {words === 1 ? 'word' : 'words'} · {Math.max(1, Math.round(words / 200))} min read
        </span>
      </p>
    </div>
  );
}
