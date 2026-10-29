/**
 * Instructor profiles and course staff (INSTR-1). Type-only contract imports, so client components
 * can use this without pulling in zod.
 */
import type { InstructorProfile } from '@dreamlab/contracts';

export type { InstructorProfile };
export type StaffRole = InstructorProfile['courses'][number]['role'];

export const STAFF_ROLES: readonly StaffRole[] = ['lead', 'instructor', 'assistant'];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = { lead: 'Lead instructor', instructor: 'Instructor', assistant: 'Teaching assistant' };
