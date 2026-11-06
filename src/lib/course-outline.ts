/**
 * The course workspace (CAT-5): what is selected, where a problem is in words an author recognises,
 * and the quality tips that don't block publishing.
 */
import type { DraftIssue } from '@dreamlab/contracts';
import { isRecord, type ItemDoc, ITEM_TYPES, type ModuleDoc, records } from './authoring';
import { BLOCK_INFO, type BlockDoc } from './blocks';

export type Selection = { kind: 'details' } | { kind: 'checklist' } | { kind: 'json' } | { kind: 'module'; m: number } | { kind: 'item'; m: number; i: number };

export const ITEM_NAMES: Record<(typeof ITEM_TYPES)[number], string> = { lesson: 'Lesson', quiz: 'Quiz', assignment: 'Assignment', discussion: 'Discussion' };

const FIELD: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  outcomes: 'What learners will be able to do',
  skills: 'Skills',
  audience: 'Who it is for',
  prerequisites: 'What they need first',
  provider: 'Provider',
  level: 'Level',
  creditHours: 'Credit hours',
  practicalOutput: 'Practical output',
  cover: 'Cover',
  imageAlt: 'Photo description',
  imageCredit: 'Photo credit',
  trailer: 'Trailer',
  instructors: 'Instructors',
  modules: 'Modules',
  summary: 'Summary',
  key: 'Key',
  minutes: 'Minutes',
  items: 'Items',
  steps: 'Steps',
  blocks: 'Blocks',
  questions: 'Questions',
  intro: 'Introduction',
  passPct: 'Pass mark',
  brief: 'Brief',
  rubric: 'Rubric',
  criterion: 'Criterion',
  prompt: 'Question',
  options: 'Answers',
  pairs: 'Pairs',
  terms: 'Terms',
  explanation: 'Explanation',
  body: 'Text',
  url: 'Image',
  alt: 'Description',
  credit: 'Credit',
  videoId: 'Video',
  channel: 'Made by',
  situation: 'Situation',
  outcome: 'What happens next',
  attribution: 'Who said it',
  minLabel: 'Label for 1',
  maxLabel: 'Label for 5',
  minWords: 'Minimum words',
};

/** Validation messages in plain words. */
export function plainMessage(raw: string): string {
  if (raw === 'Required' || /at least 1 character/.test(raw)) return 'needs filling in';
  const atLeast = /Array must contain at least (\d+) element/.exec(raw);
  if (atLeast) return atLeast[1] === '1' ? 'add at least one' : `add at least ${atLeast[1]}`;
  const atMost = /Array must contain at most (\d+) element/.exec(raw);
  if (atMost) return `at most ${atMost[1]} allowed`;
  const chars = /String must contain at most (\d+) character/.exec(raw);
  if (chars) return `too long (at most ${chars[1]} characters)`;
  if (/Invalid enum value/.test(raw)) return 'choose one of the options';
  if (/Expected number/.test(raw)) return 'enter a number';
  const gte = /greater than or equal to (\d+)/.exec(raw);
  if (gte) return `at least ${gte[1]}`;
  const lte = /less than or equal to (\d+)/.exec(raw);
  if (lte) return `at most ${lte[1]}`;
  if (/Invalid url/i.test(raw)) return 'enter a full https:// address';
  return raw;
}

const quoted = (s: unknown) => (typeof s === 'string' && s.trim() ? `“${s.trim().slice(0, 40)}”` : '(untitled)');

/**
 * Where entry `raw` of a saved list is in the outline, which skips entries that aren't objects
 * (an imported course can contain nulls). -1 when it isn't shown.
 */
function outlineIndex(list: unknown, raw: number): number {
  if (!Array.isArray(list)) return raw;
  if (!isRecord(list[raw])) return -1;
  return list.slice(0, raw).filter(isRecord).length;
}

/** Where an issue is, as a selection and a readable trail: "Module 1 › Lesson “Why” › Step 2 › Multiple choice › Explanation". */
export function describeIssue(modules: ModuleDoc[], issue: DraftIssue, rawModules?: unknown): { sel: Selection; where: string; message: string } {
  const parts = issue.path.split('.').filter(Boolean);
  const message = plainMessage(issue.message);
  if (parts[0] !== 'modules' || parts.length < 2) {
    const field = parts.map((p) => FIELD[p] ?? (Number.isInteger(Number(p)) ? `#${Number(p) + 1}` : p)).join(' › ');
    return { sel: { kind: 'details' }, where: field || 'Course', message };
  }
  // The API counts entries in the saved lists; the outline leaves out the ones that aren't objects.
  const rawM = Number(parts[1]);
  const m = rawModules === undefined ? rawM : outlineIndex(rawModules, rawM);
  const mod = m >= 0 ? modules[m] : undefined;
  if (!mod) return { sel: { kind: 'json' }, where: `Module ${rawM + 1}`, message: `${message} (fix it in Advanced: JSON)` };
  const trail = [`Module ${m + 1}`];
  if (parts[2] !== 'items' || parts.length < 4) {
    const rest = parts.slice(2).map((p) => FIELD[p] ?? p);
    return { sel: { kind: 'module', m }, where: [...trail, ...rest].join(' › '), message };
  }
  const rawI = Number(parts[3]);
  const rawItems = Array.isArray(rawModules) && isRecord(rawModules[rawM]) ? rawModules[rawM].items : undefined;
  const i = rawModules === undefined ? rawI : outlineIndex(rawItems, rawI);
  const item = i >= 0 ? mod.items[i] : undefined;
  if (!item) return { sel: { kind: 'module', m }, where: [...trail, `Item ${rawI + 1}`].join(' › '), message: `${message} (fix it in Advanced: JSON)` };
  trail.push(`${ITEM_NAMES[item.type]} ${quoted(item.title)}`);
  let k = 4;
  if (parts[k] === 'payload') k++;
  if (parts[k] === 'steps' && parts[k + 1] !== undefined) {
    trail.push(`Step ${Number(parts[k + 1]) + 1}`);
    k += 2;
  }
  const list = parts[k] === 'blocks' || parts[k] === 'questions' ? parts[k] : null;
  if (list && parts[k + 1] !== undefined) {
    const n = Number(parts[k + 1]);
    const payload = item?.payload as Record<string, unknown> | undefined;
    const steps = payload?.steps as { blocks?: BlockDoc[] }[] | undefined;
    const block = list === 'questions' ? (payload?.questions as BlockDoc[] | undefined)?.[n] : steps?.[Number(parts[k - 1])]?.blocks?.[n];
    trail.push(`${block ? (BLOCK_INFO[block.type]?.label ?? 'Block') : 'Block'} ${n + 1}`);
    k += 2;
  }
  const rest = parts.slice(k).map((p) => FIELD[p] ?? (Number.isInteger(Number(p)) ? `#${Number(p) + 1}` : p));
  return { sel: { kind: 'item', m, i }, where: [...trail, ...rest].join(' › '), message };
}

export type Tip = { sel: Selection; where: string; message: string };

const words = (s: unknown) => (typeof s === 'string' ? (s.match(/[\p{L}\p{N}’']+/gu) ?? []).length : 0);

/** Suggestions that make a course better but don't stop it being published. */
export function qualityTips(doc: Record<string, unknown>, modules: ModuleDoc[]): Tip[] {
  const tips: Tip[] = [];
  const details: Selection = { kind: 'details' };
  if (words(doc.description) < 40) tips.push({ sel: details, where: 'Description', message: 'Say more about the course: aim for at least 40 words.' });
  if (!Array.isArray(doc.outcomes) || doc.outcomes.length < 3) tips.push({ sel: details, where: 'What learners will be able to do', message: 'List at least three outcomes.' });
  const cover = doc.cover as { imageUrl?: string } | undefined;
  if (!cover?.imageUrl) tips.push({ sel: details, where: 'Cover', message: 'Add a cover photo: courses with one get opened more often.' });
  if (!doc.trailer) tips.push({ sel: details, where: 'Trailer', message: 'A short introduction video helps people decide to enrol.' });
  modules.forEach((mod, m) => {
    if (!mod.summary?.trim()) tips.push({ sel: { kind: 'module', m }, where: `Module ${m + 1}`, message: 'Add a one-line summary of the module.' });
    mod.items.forEach((item: ItemDoc, i) => {
      const where = `Module ${m + 1} › ${ITEM_NAMES[item.type]} ${quoted(item.title)}`;
      const sel: Selection = { kind: 'item', m, i };
      const p = item.payload as Record<string, unknown>;
      if (item.type === 'lesson') {
        const steps = records<{ blocks?: unknown }>(p.steps).map((s) => records<BlockDoc>(s.blocks));
        const blocks = steps.flat();
        if (item.minutes > 30) tips.push({ sel, where, message: `${item.minutes} minutes is long for one lesson: consider splitting it.` });
        if (blocks.length > 2 && !blocks.some((b) => ['choice', 'order', 'match', 'poll', 'scale', 'reflection', 'scenario'].includes(b.type))) {
          tips.push({ sel, where, message: 'Add a question or reflection so learners practise what they read.' });
        }
        if (blocks.some((b) => b.type === 'video' && !b.caption)) tips.push({ sel, where, message: 'Tell learners what to watch for in each video (“What to watch for”).' });
        if (steps.some((s) => s.length > 8)) tips.push({ sel, where, message: 'A step with more than 8 blocks is a lot on one screen: split it into steps.' });
      }
      if (item.type === 'quiz' && Array.isArray(p.questions) && p.questions.length < 3) tips.push({ sel, where, message: 'Quizzes work best with at least three questions.' });
      if (item.type === 'assignment' && Array.isArray(p.rubric) && p.rubric.length < 2) tips.push({ sel, where, message: 'Give the rubric at least two criteria so feedback is specific.' });
    });
  });
  return tips;
}

export const selKey = (s: Selection) => (s.kind === 'item' ? `item:${s.m}:${s.i}` : s.kind === 'module' ? `module:${s.m}` : s.kind);
export const sameSel = (a: Selection, b: Selection) => selKey(a) === selKey(b);
