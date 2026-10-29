/**
 * Assigned learning (ASSIGN-1) and the Dream Score weights: wording and helpers. Type-only contract
 * imports, so client components can use this without pulling in zod.
 */
import type { AssigneeStatus, DreamScoreDimension, LearningAssignment, LearningAssignmentDetailSchema, MyAssignment } from '@dreamlab/contracts';
import type { z } from 'zod';

export type { AssigneeStatus, LearningAssignment, MyAssignment };
export type LearningAssignmentDetail = z.infer<typeof LearningAssignmentDetailSchema>;

export const ASSIGNEE_STATUSES: readonly AssigneeStatus[] = ['not_started', 'in_progress', 'completed', 'overdue'];

export const ASSIGNEE_STATUS_LABELS: Record<AssigneeStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

export const ASSIGNEE_STATUS_TONES: Record<AssigneeStatus, 'neutral' | 'green' | 'gold' | 'danger'> = {
  not_started: 'neutral',
  in_progress: 'gold',
  completed: 'green',
  overdue: 'danger',
};

/** "31 Jan 2027" for a due date (YYYY-MM-DD). */
export const dueDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Same list and labels as the contracts (DREAM_SCORE_DIMENSIONS, DREAM_SCORE_DIMENSION_LABELS). */
export const DIMENSIONS: readonly { key: DreamScoreDimension; label: string }[] = [
  { key: 'vision', label: 'Vision' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'character', label: 'Character and Ethics' },
  { key: 'communication', label: 'Communication' },
  { key: 'negotiation', label: 'Negotiation and Influence' },
  { key: 'financial', label: 'Financial Intelligence' },
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'execution', label: 'Execution' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'digital', label: 'Digital Fluency' },
];

export type Weights = Record<DreamScoreDimension, number>;
