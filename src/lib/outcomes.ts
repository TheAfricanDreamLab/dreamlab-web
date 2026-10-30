/**
 * Shared wording and helpers for outcomes (Slice 3): the Dream Residency, the 12-month action plan,
 * the Dream Score™, graduation, the Dream Portfolio and credentials. Type-only imports from the
 * contracts, so client components can use this without pulling in zod.
 */
import type {
  ActionPlan,
  ActionPlanBody,
  Credential,
  DREAM_SCORE_DIMENSIONS as CONTRACT_DIMENSIONS,
  DreamScore,
  DreamScoreDimension,
  Graduation,
  GraduationBoardSchema,
  PORTFOLIO_SECTIONS as CONTRACT_SECTIONS,
  Portfolio,
  Residency,
  ResidencyBoardSchema,
  ResidencyStage,
  ResidencyStatus,
} from '@dreamlab/contracts';
import type { z } from 'zod';

export type { ActionPlan, ActionPlanBody, Credential, DreamScore, DreamScoreDimension, Graduation, Portfolio, Residency, ResidencyStage, ResidencyStatus };
export type ResidencyBoard = z.infer<typeof ResidencyBoardSchema>;
export type GraduationBoard = z.infer<typeof GraduationBoardSchema>;
export type ActionPlanStatus = ActionPlan['status'];

/** Same order as the contracts; `satisfies` fails the typecheck if they drift. */
export const DREAM_SCORE_DIMENSIONS = [
  'vision',
  'problem_solving',
  'character',
  'communication',
  'negotiation',
  'financial',
  'collaboration',
  'execution',
  'resilience',
  'digital',
] as const satisfies typeof CONTRACT_DIMENSIONS;

export const PORTFOLIO_SECTIONS = [
  'my_dream',
  'life_architecture',
  'course_artifacts',
  'competencies',
  'dream_residency',
  'final_demonstration',
  'dream_score',
  'action_plan',
] as const satisfies typeof CONTRACT_SECTIONS;

export const RESIDENCY_STATUS_LABELS: Record<ResidencyStatus, string> = {
  not_started: 'Not started',
  draft: 'Draft',
  submitted: 'With faculty',
  changes_requested: 'Changes asked',
  approved: 'Approved',
};

export const RESIDENCY_STATUS_TONES: Record<ResidencyStatus, 'neutral' | 'green' | 'gold' | 'danger'> = {
  not_started: 'neutral',
  draft: 'neutral',
  submitted: 'gold',
  changes_requested: 'danger',
  approved: 'green',
};

export const ACTION_PLAN_STATUS_LABELS: Record<ActionPlanStatus, string> = {
  draft: 'Draft',
  submitted: 'With faculty',
  changes_requested: 'Changes asked',
  approved: 'Approved',
};

export const ACTION_PLAN_STATUS_TONES: Record<ActionPlanStatus, 'neutral' | 'green' | 'gold' | 'danger'> = {
  draft: 'neutral',
  submitted: 'gold',
  changes_requested: 'danger',
  approved: 'green',
};

export const CREDENTIAL_KIND_LABELS: Record<Credential['kind'], string> = {
  programme_graduation: 'Programme graduation',
  course_completion: 'Course certificate',
};

/** Short dimension names for the radar's axes. */
export const DIMENSION_SHORT: Record<DreamScoreDimension, string> = {
  vision: 'Vision',
  problem_solving: 'Problems',
  character: 'Character',
  communication: 'Comms',
  negotiation: 'Negotiation',
  financial: 'Financial',
  collaboration: 'Collab',
  execution: 'Execution',
  resilience: 'Resilience',
  digital: 'Digital',
};

/** Minimum characters for a residency stage document before it can be submitted (the API checks too). */
export const STAGE_MIN_CHARS = 200;

/** Where each outcome page lives for a programme enrolment. */
export const outcomeHref = (enrollmentId: string, page: 'residency' | 'action-plan' | 'dream-score' | 'portfolio' | 'graduation') => `/app/programme/${enrollmentId}/${page}`;

/** "7.9", "—". */
export const tenth = (n: number | null | undefined) => (n === null || n === undefined ? '—' : (Math.round(n * 10) / 10).toFixed(1));

/** "86%", "—". */
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${Math.round(n * 10) / 10}%`);

/** A credential's public check page. */
export const verifyHref = (code: string) => `/verify/${encodeURIComponent(code)}`;

export const CREDENTIAL_CODE = /^[A-Z0-9-]{8,32}$/;
export const SHARE_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
