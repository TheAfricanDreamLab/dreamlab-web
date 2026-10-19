/**
 * Shared wording and helpers for courses, programmes and the course player.
 * Type-only imports from the contracts, so client components can use this without pulling in zod.
 */
import type {
  AdminCourseSchema,
  BlockResult,
  CourseSummary,
  ImportResultSchema,
  ItemContent,
  ItemType,
  JournalEntrySchema,
  ProgramDetail,
  ProgramSummary,
  ProgressUpdateSchema,
} from '@dreamlab/contracts';
import type { z } from 'zod';

export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export type AdminCourse = z.infer<typeof AdminCourseSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
export type { ProgramDetail, ProgramSummary };

export type LessonContent = Extract<ItemContent, { type: 'lesson' }>;
export type LessonStep = LessonContent['steps'][number];
export type QuizContent = Extract<ItemContent, { type: 'quiz' }>;
export type QuizQuestion = QuizContent['questions'][number];
export type AssignmentContent = Extract<ItemContent, { type: 'assignment' }>;
export type DiscussionContent = Extract<ItemContent, { type: 'discussion' }>;

export const LEVEL_LABELS: Record<CourseSummary['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const ITEM_LABELS: Record<ItemType, string> = {
  lesson: 'Lesson',
  quiz: 'Quiz',
  assignment: 'Assignment',
  discussion: 'Discussion',
};

export const PROGRAM_TYPE_LABELS: Record<ProgramSummary['programType'], string> = {
  specialization: 'Specialisation',
  professional_certificate: 'Professional certificate',
  learning_path: 'Learning path',
  cohort_program: 'Cohort programme',
  degree: 'Degree',
};

export const DELIVERY_LABELS: Record<ProgramSummary['deliveryMode'], string> = {
  self_paced: 'Self-paced',
  cohort: 'With a cohort',
  blended: 'Blended',
};

export const FEATURE_LABELS: Record<ProgramDetail['features'][number], { title: string; text: string }> = {
  admissions: { title: 'Admissions', text: 'Apply, and join a cohort that starts together.' },
  scholarships: { title: 'Scholarships', text: 'Support for learners who need it.' },
  programme_score: { title: 'Programme score', text: 'Every phase counts towards one final score.' },
  competency_score: { title: 'Competency score', text: 'See how your skills grow, not just your marks.' },
  capstone: { title: 'Capstone', text: 'A real project, built in stages with documents to show.' },
  portfolio: { title: 'Portfolio', text: 'Your practical outputs, gathered in one place.' },
  graduation_checklist: { title: 'Graduation checklist', text: 'A clear list of what it takes to graduate.' },
  mentorship: { title: 'Mentorship', text: 'Guidance from people who have done the work.' },
};

/** "45 min", "3 h", "2 h 30 min". */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const hours = (minutes: number | null | undefined) => (minutes ? Math.max(1, Math.round(minutes / 60)) : null);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Done with this block: answered, and (when it has a right answer) right or shown the answer. */
export function isSettled(result: BlockResult | undefined): boolean {
  if (!result) return false;
  return result.correct !== false || result.solution !== null || !result.canRetry;
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
