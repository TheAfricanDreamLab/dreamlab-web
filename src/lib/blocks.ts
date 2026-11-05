/**
 * The visual block editor's catalogue (CAT-4): every block an author can add, how it is named and
 * explained in the picker, and a valid starting value for each, so a new block never starts broken.
 * Type-only imports from the contracts.
 */
import type { BlockAuthoring } from '@dreamlab/contracts';

export type BlockType = BlockAuthoring['type'];
/** A block as the editor holds it: possibly half-written, so every field is loose. */
export type BlockDoc = Record<string, unknown> & { id: string; type: BlockType };

export const BLOCK_INFO: Record<BlockType, { label: string; help: string; icon: string }> = {
  text: { label: 'Text', help: 'Paragraphs, lists, bold and italic.', icon: '¶' },
  callout: { label: 'Callout', help: 'A highlighted box: key idea, tip, caution, story or local context.', icon: '◆' },
  example: { label: 'Example', help: 'A worked example with a title.', icon: '✎' },
  quote: { label: 'Quote', help: 'A short quotation and who said it.', icon: '❝' },
  key_terms: { label: 'Key terms', help: 'Words and their meanings.', icon: '≡' },
  reveal: { label: 'Think, then reveal', help: 'A question learners think about before tapping to see the answer.', icon: '?' },
  framework: { label: 'Framework', help: 'Named steps, e.g. Define → Diagnose → Decide.', icon: '→' },
  image: { label: 'Image', help: 'An uploaded picture with a description and credit.', icon: '▣' },
  video: { label: 'Video', help: 'An uploaded video or a YouTube link.', icon: '▶' },
  choice: { label: 'Multiple choice', help: 'One or more right answers, with feedback on each option.', icon: '◉' },
  order: { label: 'Put in order', help: 'Learners arrange steps in the right order.', icon: '⇅' },
  match: { label: 'Match pairs', help: 'Learners match each item on the left with one on the right.', icon: '⇄' },
  poll: { label: 'Poll', help: 'No right answer: learners vote, then see how others voted.', icon: '▤' },
  scale: { label: 'Rating scale', help: 'A 1–5 self-rating, with everyone’s answers shown afterwards.', icon: '★' },
  reflection: { label: 'Reflection', help: 'A written answer saved to the learner’s journal.', icon: '✍' },
  scenario: { label: 'Scenario', help: 'A real situation with choices; each choice reveals what happens.', icon: '⎇' },
};

/** The picker's groups, in order. */
export const BLOCK_GROUPS: { title: string; types: BlockType[] }[] = [
  { title: 'Teach', types: ['text', 'callout', 'example', 'quote', 'key_terms', 'reveal', 'framework'] },
  { title: 'Media', types: ['image', 'video'] },
  { title: 'Check understanding', types: ['choice', 'order', 'match'] },
  { title: 'Engage and reflect', types: ['poll', 'scale', 'reflection', 'scenario'] },
];

/** Quiz questions: the block types with a right answer. */
export const QUESTION_TYPES: BlockType[] = ['choice', 'order', 'match'];

export const CALLOUT_TONE_LABELS = {
  insight: 'Key idea',
  tip: 'Tip',
  caution: 'Watch out',
  story: 'Story',
  context: 'In context (an African setting)',
} as const;

/** Limits from the course schema, so the editor stops at them instead of failing on save. */
export const LIMITS = { blocksPerStep: 12, stepsPerLesson: 20, quizQuestions: 40 } as const;

/** "Carving the wax" → "carving-the-wax"; ids are lowercase letters, digits and hyphens. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** An id not used by any of `taken`, e.g. `choice-3`. */
export function freshId(prefix: string, taken: string[]): string {
  const base = slug(prefix) || 'block';
  for (let n = taken.length + 1; ; n++) {
    const id = `${base}-${n}`;
    if (!taken.includes(id)) return id;
  }
}

/** Option ids inside a block: a, b, c… then o9, o10… */
export function optionId(taken: string[]): string {
  for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!taken.includes(c)) return c;
  return freshId('o', taken);
}

/** A new block of each type, valid as it stands, with wording that tells the author what to write. */
export function newBlock(type: BlockType, taken: string[]): BlockDoc {
  const id = freshId(type.replace('_', '-'), taken);
  switch (type) {
    case 'text':
      return { id, type, body: 'Write here. Leave a blank line between paragraphs.' };
    case 'callout':
      return { id, type, tone: 'insight', title: 'The big idea', body: 'Say it in one or two sentences.' };
    case 'example':
      return { id, type, title: 'A worked example', body: 'Walk through it step by step.' };
    case 'quote':
      return { id, type, text: 'The quotation.', attribution: 'Who said it' };
    case 'key_terms':
      return { id, type, terms: [{ term: 'Term', definition: 'What it means.' }] };
    case 'reveal':
      return { id, type, prompt: 'A question to think about first.', body: 'The answer, shown when the learner taps.' };
    case 'framework':
      return { id, type, title: 'The framework', steps: [{ label: 'First', detail: 'What happens first.' }, { label: 'Then', detail: 'What happens next.' }] };
    case 'image':
      return { id, type, url: '', alt: '', caption: '', credit: '' };
    case 'video':
      return { id, type, provider: 'youtube', videoId: '', title: '', channel: '', caption: '' };
    case 'choice':
      return {
        id,
        type,
        prompt: 'Write the question.',
        multiple: false,
        options: [
          { id: 'a', text: 'The right answer', correct: true, feedback: 'Yes, because…' },
          { id: 'b', text: 'A tempting wrong answer', correct: false, feedback: 'Not quite: …' },
        ],
        explanation: 'Why the right answer is right.',
      };
    case 'order':
      return {
        id,
        type,
        prompt: 'Put these in order.',
        items: [
          { id: 'a', text: 'First' },
          { id: 'b', text: 'Second' },
          { id: 'c', text: 'Third' },
        ],
        explanation: 'Why this order.',
      };
    case 'match':
      return {
        id,
        type,
        prompt: 'Match each one with its pair.',
        pairs: [
          { id: 'a', left: 'Left 1', right: 'Right 1' },
          { id: 'b', left: 'Left 2', right: 'Right 2' },
        ],
        explanation: 'How they go together.',
      };
    case 'poll':
      return { id, type, prompt: 'Ask the group a question.', options: [{ id: 'a', text: 'Option one' }, { id: 'b', text: 'Option two' }] };
    case 'scale':
      return { id, type, prompt: 'How confident are you about…?', minLabel: 'Not at all', maxLabel: 'Very' };
    case 'reflection':
      return { id, type, prompt: 'What will you do differently?', guidance: '', minWords: 20 };
    case 'scenario':
      return {
        id,
        type,
        situation: 'Describe a real situation.',
        prompt: 'What would you do?',
        options: [
          { id: 'a', text: 'One choice', outcome: 'What happens next.', best: true },
          { id: 'b', text: 'Another choice', outcome: 'What happens next.', best: false },
        ],
      };
  }
}

/** The YouTube video id in a link or bare id (watch, youtu.be, shorts, embed), or null. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return /^\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(url.pathname)?.[1] ?? null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      return /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(url.pathname)?.[1] ?? null;
    }
  } catch {
    // not a link
  }
  return null;
}

/** A short line describing a block, for its collapsed card. */
export function blockSummary(b: BlockDoc): string {
  const pick = (...keys: string[]) => keys.map((k) => b[k]).find((v): v is string => typeof v === 'string' && v.trim().length > 0) ?? '';
  const text = pick('title', 'prompt', 'situation', 'text', 'body', 'caption', 'alt');
  const firstLine = text.split('\n').find((l) => l.trim()) ?? '';
  return firstLine.replace(/[*`#>-]+/g, '').trim().slice(0, 90);
}
