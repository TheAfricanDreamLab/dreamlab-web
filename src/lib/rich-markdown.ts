/*
 * Course text (CAT-5): a small, safe markup, parsed into a tree that both the learner pages and the
 * editor use. Never HTML. Supported:
 *   blocks:  paragraphs (blank line between), "## " and "### " headings, "- " bullets, "1. " numbers,
 *            "> " quotes, ``` fenced code, and tables ("| a | b |", second row "| --- | --- |")
 *   inline:  **bold**, *italic*, ++underline++, `code`, [text](https://…)
 */

export type Mark = 'bold' | 'italic' | 'underline' | 'code';
export type Inline = { text: string; marks: Mark[]; href?: string };
export type Line = Inline[];
export type RichBlock =
  | { type: 'paragraph'; lines: Line[] }
  | { type: 'heading'; level: 2 | 3; content: Line }
  | { type: 'bullets' | 'numbers'; items: Line[] }
  | { type: 'quote'; lines: Line[] }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: Line[][] };

/** Only https links (and same-site paths) are links; anything else stays plain text. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  // Backslashes and control characters can make a "/path" resolve to another site.
  if (/[\u0000-\u001f\u007f\\]/.test(href)) return null;
  if (href.startsWith('/') && !href.startsWith('//')) {
    try {
      return new URL(href, 'https://same.invalid').origin === 'https://same.invalid' ? href : null;
    } catch {
      return null;
    }
  }
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// ---------- inline ----------

/*
 * A backslash makes the next markup character literal: \* \+ \_ \` \[ \] \( \) \| \# \> \- \. \\
 * While parsing, escaped characters are swapped for private-use stand-ins so they never form markup,
 * then swapped back in the text that comes out.
 */
const ESCAPABLE = '\\*+_`[]()|#>-.';
const STAND_IN = 0xe000;
const encode = (t: string) => t.replace(/\\([\\*+_`[\]()|#>\-.])/g, (_m, c: string) => String.fromCharCode(STAND_IN + ESCAPABLE.indexOf(c)));
const decode = (t: string) => t.replace(/[\ue000-\ue00f]/g, (c) => ESCAPABLE[c.charCodeAt(0) - STAND_IN] ?? c);

// **bold**, ++underline++, `code`, [link](url), *italic* or _italic_ (underscores only at word edges).
const INLINE = /(\*\*(?=\S)[\s\S]*?\S\*\*|\+\+(?=\S)[\s\S]*?\S\+\+|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*(?=[^*\s])[^*\n]*?[^*\s]\*|\*[^*\s]\*|(?<![\p{L}\p{N}_])_(?=[^_\s])[^_\n]*?[^_\s]_(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])_[^_\s]_(?![\p{L}\p{N}_]))/u;

export function parseInline(text: string, marks: Mark[] = [], href?: string): Line {
  return merge(parseEncoded(encode(text), marks, href).map((seg) => ({ ...seg, text: decode(seg.text) })));
}

const sameStyle = (a: Inline, b: Inline) => a.href === b.href && a.marks.length === b.marks.length && a.marks.every((m) => b.marks.includes(m));

/** Neighbouring pieces with the same style become one. */
function merge(line: Line): Line {
  const out: Line = [];
  for (const seg of line) {
    const last = out[out.length - 1];
    if (last && sameStyle(last, seg)) last.text += seg.text;
    else out.push({ ...seg });
  }
  return out;
}

function parseEncoded(text: string, marks: Mark[], href?: string): Line {
  const out: Line = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push({ text: rest, marks, ...(href && { href }) });
      break;
    }
    if (m.index > 0) out.push({ text: rest.slice(0, m.index), marks, ...(href && { href }) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push(...parseEncoded(tok.slice(2, -2), [...marks, 'bold'], href));
    else if (tok.startsWith('++')) out.push(...parseEncoded(tok.slice(2, -2), [...marks, 'underline'], href));
    else if (tok.startsWith('`')) out.push({ text: tok.slice(1, -1), marks: [...marks, 'code'], ...(href && { href }) });
    else if (tok.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const safe = safeHref(decode(link[2]!));
      out.push(...(safe ? parseEncoded(link[1]!, marks, safe) : [{ text: tok, marks, ...(href && { href }) }]));
    } else out.push(...parseEncoded(tok.slice(1, -1), [...marks, 'italic'], href));
    rest = rest.slice(m.index + tok.length);
  }
  return out.filter((i) => i.text.length > 0);
}

// ---------- blocks ----------

const BULLET = /^\s*[-•*]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;
const QUOTE = /^\s*>\s?/;
const HEADING = /^(#{1,3})\s+/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/;

// Escaped pipes (\|) stay inside their cell.
const cells = (row: string) =>
  encode(row)
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => parseInline(decodeToEscapes(c.trim())));
/** Stand-ins back to backslash escapes, for text that is parsed again. */
const decodeToEscapes = (t: string) => t.replace(/[\ue000-\ue00f]/g, (c) => `\\${ESCAPABLE[c.charCodeAt(0) - STAND_IN] ?? ''}`);

export function parseRich(text: string): RichBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: RichBlock[] = [];
  let i = 0;
  let para: Line[] = [];
  const flush = () => {
    if (para.length) out.push({ type: 'paragraph', lines: para });
    para = [];
  };
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    if (/^\s*```/.test(line)) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) body.push(lines[i++]!);
      i++;
      out.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      out.push({ type: 'heading', level: heading[1]!.length >= 3 ? 3 : 2, content: parseInline(line.slice(heading[0].length).trim()) });
      i++;
      continue;
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]!)) {
      flush();
      const rows = [cells(line)];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i]!)) rows.push(cells(lines[i++]!));
      out.push({ type: 'table', rows });
      continue;
    }
    for (const [re, type] of [
      [BULLET, 'bullets'],
      [NUMBER, 'numbers'],
      [QUOTE, 'quote'],
    ] as const) {
      if (!re.test(line)) continue;
      flush();
      const items: Line[] = [];
      while (i < lines.length && re.test(lines[i]!) && lines[i]!.trim()) items.push(parseInline(lines[i++]!.replace(re, '')));
      out.push(type === 'quote' ? { type, lines: items } : { type, items });
      break;
    }
    if (out.length && i > 0 && (BULLET.test(line) || NUMBER.test(line) || QUOTE.test(line))) continue;
    para.push(parseInline(line.trimEnd()));
    i++;
  }
  flush();
  return out;
}

// ---------- tree → text (what the editor saves) ----------

const WRAP: [Mark, string][] = [
  ['bold', '**'],
  ['underline', '++'],
  ['italic', '_'],
];

/** Plain text with its markup characters made literal. */
const escapeText = (t: string) => t.replace(/[\\*+_`[\]|]/g, (c) => `\\${c}`);
/** A line that would otherwise start a list, heading or quote. */
const escapeLineStart = (t: string) => t.replace(/^(\s*)(\d+)([.)])(\s)/, '$1$2\\$3$4').replace(/^(\s*)([-•#>])/, '$1\\$2');

/** Runs that share a mark are wrapped once: "**bold _and italic_**", not "**bold *****and italic***". */
function marked(segs: Inline[], outer: Mark[]): string {
  let out = '';
  for (let k = 0; k < segs.length; ) {
    const seg = segs[k]!;
    const next = WRAP.find(([m]) => seg.marks.includes(m) && !outer.includes(m));
    if (!next) {
      out += seg.marks.includes('code') ? `\`${seg.text.replace(/`/g, "'")}\`` : escapeText(seg.text);
      k++;
      continue;
    }
    const [mark, sym] = next;
    let j = k;
    while (j < segs.length && segs[j]!.marks.includes(mark)) j++;
    // Spaces at the edges of the run stay outside it: "**word** ", not "**word **".
    const inner = marked(segs.slice(k, j), [...outer, mark]);
    const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
    // Underscores mark italics only at word edges; next to a letter, use an asterisk.
    const mk = mark === 'italic' ? (/[\p{L}\p{N}]$/u.test(out + lead) ? '*' : '_') : sym;
    out += core ? `${lead}${mk}${core}${mk}${trail}` : inner;
    k = j;
  }
  return out;
}

export function lineToText(line: Line): string {
  let out = '';
  for (let k = 0; k < line.length; ) {
    const href = line[k]!.href;
    let j = k;
    while (j < line.length && line[j]!.href === href) j++;
    const inner = marked(line.slice(k, j), []);
    out += href ? `[${inner}](${href.replace(/\)/g, '%29').replace(/\s/g, '%20')})` : inner;
    k = j;
  }
  return out;
}

export function richToText(blocks: RichBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'paragraph':
          return b.lines.map((l) => escapeLineStart(lineToText(l))).join('\n');
        case 'heading':
          return `${b.level === 2 ? '##' : '###'} ${lineToText(b.content)}`;
        case 'bullets':
          return b.items.map((l) => `- ${lineToText(l)}`).join('\n');
        case 'numbers':
          return b.items.map((l, n) => `${n + 1}. ${lineToText(l)}`).join('\n');
        case 'quote':
          return b.lines.map((l) => `> ${lineToText(l)}`).join('\n');
        case 'code':
          return '```\n' + b.text + '\n```';
        case 'table': {
          const [head, ...body] = b.rows;
          const row = (r: Line[]) => `| ${r.map((c) => lineToText(c)).join(' | ')} |`;
          return [row(head ?? []), `|${(head ?? []).map(() => ' --- ').join('|')}|`, ...body.map(row)].join('\n');
        }
      }
    })
    .filter((s) => s.trim())
    .join('\n\n');
}

/** Words in a text, for "120 words · 1 min read". */
export function wordCount(text: string): number {
  return (text.replace(/[*_`#>|+[\]()-]/g, ' ').match(/[\p{L}\p{N}’']+/gu) ?? []).length;
}
