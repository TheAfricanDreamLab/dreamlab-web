/**
 * Course authoring in the browser (CAT-3): wording and document helpers for the draft editor.
 * Type-only imports from the contracts, so client components can use this without pulling in zod.
 */
import type { AuthoringOverview, Draft, DraftIssue, DraftStatus, DraftSummary } from '@dreamlab/contracts';

export type { AuthoringOverview, Draft, DraftIssue, DraftStatus, DraftSummary };

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  published: 'Published',
};

export const DRAFT_STATUS_TONES: Record<DraftStatus, 'neutral' | 'green' | 'gold' | 'danger'> = {
  draft: 'neutral',
  in_review: 'gold',
  changes_requested: 'danger',
  published: 'green',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public catalogue',
  org_private: 'Organisation only',
  unlisted: 'Unlisted (link only)',
};

export const ITEM_TYPES = ['lesson', 'quiz', 'assignment', 'discussion'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** The parts of the authored course the editor works with; anything else in the document is kept as it is. */
export type Doc = Record<string, unknown> & {
  title?: string;
  modules?: ModuleDoc[];
};
export type ModuleDoc = { key: string; title: string; summary: string; weekNo: number | null; items: ItemDoc[] };
export type ItemDoc = Record<string, unknown> & { key: string; type: ItemType; title: string; minutes: number; required?: boolean; gradeWeight?: number; payload: Record<string, unknown> };

/** "Carving the wax" → "carving-the-wax" (block ids: lowercase letters, digits and hyphens, up to 48). */
export function slugify(text: string, fallback = 'item'): string {
  const s = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return /^[a-z0-9]/.test(s) ? s : fallback;
}

/** A key not yet used among `taken`, based on `wanted`. */
export function uniqueKey(wanted: string, taken: string[]): string {
  if (!taken.includes(wanted)) return wanted;
  for (let n = 2; ; n++) {
    const k = `${wanted.slice(0, 44)}-${n}`;
    if (!taken.includes(k)) return k;
  }
}

/** A new item of each type, already valid, for the author to fill in. */
export function newItem(type: ItemType, title: string, key: string): ItemDoc {
  const base = { key, type, title, minutes: 10, required: true };
  switch (type) {
    case 'lesson':
      return { ...base, payload: { steps: [{ id: 'step-1', title: 'First step', blocks: [{ id: 'text-1', type: 'text', body: 'Write the first step here.' }] }] } };
    case 'quiz':
      return {
        ...base,
        gradeWeight: 0,
        payload: {
          intro: 'Check what you have learned.',
          passPct: 70,
          maxAttempts: null,
          questions: [
            {
              id: 'q1',
              type: 'choice',
              prompt: 'Write the question here.',
              options: [
                { id: 'a', text: 'The right answer', correct: true, feedback: 'Yes.' },
                { id: 'b', text: 'A tempting wrong answer', correct: false, feedback: 'Not quite.' },
              ],
              explanation: 'Why the right answer is right.',
            },
          ],
        },
      };
    case 'assignment':
      return {
        ...base,
        minutes: 60,
        gradeWeight: 0,
        payload: {
          brief: 'What the learner makes, and why.',
          practicalOutput: null,
          steps: ['The first thing to do'],
          rubric: [{ id: 'clarity', criterion: 'Clarity', description: 'What meeting the standard looks like.' }],
          minWords: 150,
        },
      };
    case 'discussion':
      return { ...base, payload: { prompt: 'The question learners discuss.', minWords: 40 } };
  }
}

/** Where an issue points, for "jump to it" links: "modules.0.items.2.title" → module 0, item 2. */
export function issueTarget(path: string): { tab: 'details' | 'outline'; module?: number; item?: number } {
  const m = /^modules\.(\d+)(?:\.items\.(\d+))?/.exec(path);
  if (m) return { tab: 'outline', module: Number(m[1]), ...(m[2] !== undefined && { item: Number(m[2]) }) };
  return path === 'modules' ? { tab: 'outline' } : { tab: 'details' };
}
