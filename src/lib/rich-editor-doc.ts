/*
 * Course text ↔ the editor's document (TipTap/ProseMirror JSON). The editor only ever holds what the
 * course markup can express; anything pasted that it can't (images, colours, fonts) is dropped.
 */
import type { JSONContent } from '@tiptap/react';
import { type Inline, type Line, type Mark, parseRich, type RichBlock, richToText, safeHref } from './rich-markdown';

const MARK_TYPES: Mark[] = ['bold', 'italic', 'underline', 'code'];

function lineToNodes(line: Line): JSONContent[] {
  return line.map((seg) => {
    const marks: JSONContent['marks'] = seg.marks.map((m) => ({ type: m }));
    if (seg.href) marks.push({ type: 'link', attrs: { href: seg.href } });
    return { type: 'text', text: seg.text, ...(marks.length && { marks }) };
  });
}

function linesToNodes(lines: Line[]): JSONContent[] {
  return lines.flatMap((l, i) => [...(i > 0 ? [{ type: 'hardBreak' }] : []), ...lineToNodes(l)]);
}

const para = (content: JSONContent[]): JSONContent => ({ type: 'paragraph', ...(content.length && { content }) });

/** Course text → the editor's document. */
export function textToDoc(text: string): JSONContent {
  const content = parseRich(text).map((b): JSONContent => {
    switch (b.type) {
      case 'paragraph':
        return para(linesToNodes(b.lines));
      case 'heading':
        return { type: 'heading', attrs: { level: b.level }, content: lineToNodes(b.content) };
      case 'bullets':
      case 'numbers':
        return { type: b.type === 'bullets' ? 'bulletList' : 'orderedList', content: b.items.map((l) => ({ type: 'listItem', content: [para(lineToNodes(l))] })) };
      case 'quote':
        return { type: 'blockquote', content: [para(linesToNodes(b.lines))] };
      case 'code':
        return { type: 'codeBlock', ...(b.text && { content: [{ type: 'text', text: b.text }] }) };
      case 'table':
        return {
          type: 'table',
          content: b.rows.map((row, ri) => ({
            type: 'tableRow',
            content: row.map((cell) => ({ type: ri === 0 ? 'tableHeader' : 'tableCell', content: [para(lineToNodes(cell))] })),
          })),
        };
    }
  });
  return { type: 'doc', content: content.length ? content : [para([])] };
}

// ---------- editor document → course text ----------

/** Lines of inline content, split at hard breaks; nested blocks are flattened into lines. */
function inlineLines(nodes: JSONContent[] | undefined): Line[] {
  const lines: Line[] = [[]];
  const visit = (n: JSONContent) => {
    if (n.type === 'hardBreak') lines.push([]);
    else if (n.type === 'text' && n.text) {
      const marks = (n.marks ?? []).map((m) => m.type).filter((t): t is Mark => MARK_TYPES.includes(t as Mark));
      const link = n.marks?.find((m) => m.type === 'link');
      const href = link ? safeHref(String(link.attrs?.href ?? '')) : null;
      // One line of text: newlines inside a text node (code) become spaces.
      const seg: Inline = { text: n.text.replace(/\n/g, ' '), marks, ...(href && { href }) };
      lines[lines.length - 1]!.push(seg);
    } else if (n.content) {
      if (lines[lines.length - 1]!.length) lines.push([]);
      n.content.forEach(visit);
    }
  };
  (nodes ?? []).forEach(visit);
  return lines.filter((l) => l.length > 0);
}

const oneLine = (nodes: JSONContent[] | undefined): Line => inlineLines(nodes).flatMap((l, i) => (i > 0 ? [{ text: ' ', marks: [] }, ...l] : l));

function plain(n: JSONContent): string {
  return n.text ?? (n.content ?? []).map(plain).join(n.type === 'paragraph' ? '' : '\n');
}

function blocks(nodes: JSONContent[] | undefined): RichBlock[] {
  const out: RichBlock[] = [];
  for (const n of nodes ?? []) {
    switch (n.type) {
      case 'paragraph': {
        const lines = inlineLines(n.content);
        if (lines.length) out.push({ type: 'paragraph', lines });
        break;
      }
      case 'heading': {
        const level = Number(n.attrs?.level ?? 2) >= 3 ? 3 : 2;
        const content = oneLine(n.content);
        if (content.length) out.push({ type: 'heading', level, content });
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        // Nested lists are flattened: every item becomes one line of the outer list.
        const items: Line[] = [];
        const walk = (list: JSONContent) =>
          (list.content ?? []).forEach((li) => {
            const own = (li.content ?? []).filter((c) => c.type !== 'bulletList' && c.type !== 'orderedList');
            const line = oneLine(own);
            if (line.length) items.push(line);
            (li.content ?? []).filter((c) => c.type === 'bulletList' || c.type === 'orderedList').forEach(walk);
          });
        walk(n);
        if (items.length) out.push({ type: n.type === 'bulletList' ? 'bullets' : 'numbers', items });
        break;
      }
      case 'blockquote': {
        const lines = inlineLines(n.content);
        if (lines.length) out.push({ type: 'quote', lines });
        break;
      }
      case 'codeBlock':
        out.push({ type: 'code', text: plain(n) });
        break;
      case 'table': {
        const rows = (n.content ?? []).map((row) => (row.content ?? []).map((cell) => oneLine(cell.content)));
        const width = Math.max(1, ...rows.map((r) => r.length));
        if (rows.length) out.push({ type: 'table', rows: rows.map((r) => [...r, ...Array.from({ length: width - r.length }, () => [] as Line)]) });
        break;
      }
      default:
        // Anything else that slipped in (a pasted element the schema kept): keep its words.
        out.push(...blocks(n.content));
    }
  }
  return out;
}

/** The editor's document → course text. */
export function docToText(doc: JSONContent): string {
  return richToText(blocks(doc.content));
}
