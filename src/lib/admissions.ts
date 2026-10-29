/**
 * Shared wording and helpers for admissions (ADM-1): cycles, applications and the ten-stage pipeline.
 * Type-only imports from the contracts, so client components can use this without pulling in zod;
 * the `satisfies` checks keep these labels in step with the contract's stages and statuses.
 */
import type { AdmissionCycle, AdmissionStage, AiEvaluation, Application, ApplicationReview, ApplicationStatus, ApplicationSummary, DimensionScores } from '@dreamlab/contracts';

export type { AdmissionCycle, AdmissionStage, AiEvaluation, Application, ApplicationReview, ApplicationStatus, ApplicationSummary, DimensionScores };
export type ApplicantStage = 'eligibility' | 'application' | 'dream_application' | 'evidence' | 'assessment' | 'video';
export type ScoringDimension = keyof DimensionScores;
export type Pipeline = { cycle: AdmissionCycle; counts: Record<AdmissionStage, number>; statusCounts: Partial<Record<ApplicationStatus, number>>; items: ApplicationSummary[] };

export const STAGES = ['eligibility', 'application', 'dream_application', 'evidence', 'assessment', 'video', 'interview', 'scholarship', 'committee', 'decision'] as const satisfies readonly AdmissionStage[];
export const APPLICANT_STAGES = ['eligibility', 'application', 'dream_application', 'evidence', 'assessment', 'video'] as const satisfies readonly ApplicantStage[];
export const isApplicantStage = (s: string): s is ApplicantStage => (APPLICANT_STAGES as readonly string[]).includes(s);

export const STAGE_LABELS = {
  eligibility: 'Eligibility',
  application: 'Application',
  dream_application: 'Dream Application',
  evidence: 'Evidence of Action',
  assessment: 'Builder Assessment',
  video: 'Video',
  interview: 'Interview',
  scholarship: 'Scholarship Review',
  committee: 'Committee',
  decision: 'Decision',
} satisfies Record<AdmissionStage, string>;

/** What each applicant stage asks for, in a sentence. */
export const STAGE_INTROS = {
  eligibility: 'A few questions to check the programme is right for you.',
  application: 'About you, and why you are applying.',
  dream_application: 'The dream you are building and the problem it solves.',
  evidence: 'Things you have already done: one to five pieces of evidence.',
  assessment: 'Five short written questions about how you build.',
  video: 'A link to a short video of you introducing your dream (two minutes is plenty).',
} satisfies Record<ApplicantStage, string>;

export const STATUS_LABELS = {
  in_progress: 'In progress',
  under_review: 'Under review',
  admitted: 'Admitted',
  waitlisted: 'Waitlisted',
  declined: 'Not admitted',
  withdrawn: 'Withdrawn',
} satisfies Record<ApplicationStatus, string>;

export const STATUS_TONES = {
  in_progress: 'neutral',
  under_review: 'gold',
  admitted: 'green',
  waitlisted: 'gold',
  declined: 'danger',
  withdrawn: 'neutral',
} satisfies Record<ApplicationStatus, 'neutral' | 'green' | 'gold' | 'danger'>;

export const CYCLE_STATUS_LABELS = { draft: 'Draft', open: 'Open', closed: 'Closed' } satisfies Record<AdmissionCycle['status'], string>;
export const CYCLE_STATUS_TONES = { draft: 'neutral', open: 'green', closed: 'neutral' } satisfies Record<AdmissionCycle['status'], 'neutral' | 'green' | 'gold' | 'danger'>;

export const DIMENSIONS = ['dream_clarity', 'problem_insight', 'evidence_of_action', 'builder_mindset', 'commitment', 'communication'] as const satisfies readonly ScoringDimension[];
export const DIMENSION_LABELS = {
  dream_clarity: 'Clarity of the dream',
  problem_insight: 'Insight into the problem',
  evidence_of_action: 'Evidence of action',
  builder_mindset: 'Builder mindset',
  commitment: 'Commitment',
  communication: 'Communication',
} satisfies Record<ScoringDimension, string>;

export const RECOMMENDATION_LABELS = { advance: 'Advance', hold: 'Hold', decline: 'Decline' } satisfies Record<ApplicationReview['recommendation'], string>;

export const EDUCATION_LEVELS = [
  { value: 'secondary', label: 'Secondary school' },
  { value: 'diploma', label: 'Diploma or certificate' },
  { value: 'undergraduate', label: 'Undergraduate degree' },
  { value: 'graduate', label: 'Postgraduate degree' },
  { value: 'other', label: 'Something else' },
] as const;

/** Admission dates are entered and shown in this time zone. */
export const ADMISSIONS_TIME_ZONE = 'Africa/Lagos';

/** "12 Nov 2026, 18:00" in the admissions time zone. */
export const admissionsTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: ADMISSIONS_TIME_ZONE });

/** A 0–100 index, or a dash when not every dimension was scored. */
export const formatIndex = (n: number | null) => (n === null ? '—' : String(n));
