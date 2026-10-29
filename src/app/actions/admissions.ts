'use server';

import { type AdmissionCycle, type Application, BUILDER_ASSESSMENT_PROMPTS } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ADMISSIONS_TIME_ZONE, DIMENSIONS, isApplicantStage } from '@/lib/admissions';
import { fromLocalInput } from '@/lib/cohorts';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid, SLUG } from '@/lib/learning';
import { getClaims } from '@/lib/session';

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from the menu.' };

// ---------- applicants ----------

/** Start (or resume) an application, then open it. Signed-out visitors create an account first. */
export async function startApplication(_: FormState, fd: FormData): Promise<FormState> {
  const cycleId = str(fd, 'cycleId');
  const back = str(fd, 'back');
  if (!isUuid(cycleId)) return BAD_LINK;
  if (!(await getClaims())) redirect(`/signup?next=${encodeURIComponent(back.startsWith('/') ? back : '/app/apply')}`);
  const res = await api<Application>('POST', '/v1/admissions/applications', { cycleId });
  if (!res.ok) return { error: friendlyError(res.error) };
  redirect(`/app/apply/${res.data.id}`);
}

/** The answers a stage's form holds, in the shape the contract expects. */
function stageAnswers(stage: string, fd: FormData): Record<string, unknown> {
  const ticked = (key: string) => fd.get(key) === 'on';
  switch (stage) {
    case 'eligibility':
      return {
        isAdult: ticked('isAdult'),
        country: str(fd, 'country'),
        educationLevel: str(fd, 'educationLevel') || undefined,
        canCommitFullTime: ticked('canCommitFullTime'),
        hasDeviceAndInternet: ticked('hasDeviceAndInternet'),
      };
    case 'application':
      return { city: str(fd, 'city'), occupation: str(fd, 'occupation'), motivation: str(fd, 'motivation'), howHeard: str(fd, 'howHeard') };
    case 'dream_application':
      return { dream: str(fd, 'dream'), problem: str(fd, 'problem'), whoBenefits: str(fd, 'whoBenefits'), whyYou: str(fd, 'whyYou') };
    case 'evidence': {
      const titles = fd.getAll('evidenceTitle').map((v) => String(v).trim());
      const descriptions = fd.getAll('evidenceDescription').map((v) => String(v).trim());
      const links = fd.getAll('evidenceLink').map((v) => String(v).trim());
      const items = titles
        .map((title, i) => ({ title, description: descriptions[i] ?? '', link: links[i] || null }))
        .filter((e) => e.title || e.description || e.link);
      return { items };
    }
    case 'assessment':
      return { answers: Object.fromEntries(BUILDER_ASSESSMENT_PROMPTS.map((p) => [p.id, str(fd, `answer:${p.id}`)])) };
    case 'video':
      return { url: str(fd, 'url'), note: str(fd, 'note') };
    default:
      return {};
  }
}

/**
 * The API names the first missing answer as "path: message". Plain fields need only the message;
 * evidence items and assessment answers say which one.
 */
function incompleteMessage(message: string): string {
  const m = /^([\w.]+): ([\s\S]*)$/.exec(message);
  if (!m) return message;
  const [, path, text] = m as unknown as [string, string, string];
  const item = /^items\.(\d+)\./.exec(path);
  if (item) return `Evidence ${Number(item[1]) + 1}: ${text}`;
  const question = BUILDER_ASSESSMENT_PROMPTS.findIndex((p) => path === `answers.${p.id}`);
  if (question >= 0) return `Question ${question + 1}: ${text}`;
  // zod's own wording for an empty choice ("Required", "Invalid enum value…") means nothing to applicants.
  return /^(Required|Invalid)/.test(text) ? 'Answer every question before submitting.' : text;
}

/** Save the stage as a draft; with intent=submit, also submit it so the application moves on. */
export async function saveApplicationStage(_: FormState, fd: FormData): Promise<FormState> {
  const applicationId = str(fd, 'applicationId');
  const stage = str(fd, 'stage');
  if (!isUuid(applicationId) || !isApplicantStage(stage)) return BAD_LINK;
  const saved = await api<Application>('PUT', `/v1/admissions/applications/${applicationId}/stages/${stage}`, { answers: stageAnswers(stage, fd) });
  if (!saved.ok) return { error: friendlyError(saved.error) };
  if (str(fd, 'intent') !== 'submit') {
    refresh();
    return { notice: 'Draft saved. You can come back to it any time before the cycle closes.' };
  }
  const submitted = await api<Application>('POST', `/v1/admissions/applications/${applicationId}/stages/${stage}/submit`);
  if (!submitted.ok) {
    const error = submitted.error.code === 'stage_incomplete' ? incompleteMessage(submitted.error.message) : friendlyError(submitted.error);
    // The draft was saved: the form comes back holding it.
    refresh();
    return { error, notice: 'Your draft is saved.' };
  }
  refresh();
  return {};
}

export async function withdrawApplication(_: FormState, fd: FormData): Promise<FormState> {
  const applicationId = str(fd, 'applicationId');
  if (!isUuid(applicationId)) return BAD_LINK;
  const res = await api<Application>('POST', `/v1/admissions/applications/${applicationId}/withdraw`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Your application is withdrawn.' };
}

// ---------- staff: cycles ----------

const when = (fd: FormData, key: string) => fromLocalInput(str(fd, key), ADMISSIONS_TIME_ZONE);

export async function createCycle(_: FormState, fd: FormData): Promise<FormState> {
  const values = { name: str(fd, 'name'), programSlug: str(fd, 'programSlug'), cohortId: str(fd, 'cohortId'), opensAt: str(fd, 'opensAt'), closesAt: str(fd, 'closesAt') };
  if (!SLUG.test(values.programSlug)) return { error: 'Choose a programme.', values };
  if (values.cohortId && !isUuid(values.cohortId)) return { error: 'Choose a cohort, or none for now.', values };
  const opensAt = when(fd, 'opensAt');
  const closesAt = when(fd, 'closesAt');
  if (!opensAt) return { error: 'Choose when applications open.', fields: { opensAt: 'Choose a date and time' }, values };
  if (!closesAt) return { error: 'Choose when applications close.', fields: { closesAt: 'Choose a date and time' }, values };
  const res = await api<AdmissionCycle>('POST', '/v1/admissions/admin/cycles', { name: values.name, programSlug: values.programSlug, cohortId: values.cohortId || null, opensAt, closesAt });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  redirect(`/app/admissions/cycles/${res.data.id}?created=1`);
}

export async function updateCycle(_: FormState, fd: FormData): Promise<FormState> {
  const cycleId = str(fd, 'cycleId');
  if (!isUuid(cycleId)) return BAD_LINK;
  const body: Record<string, unknown> = {};
  if (fd.has('status')) body.status = str(fd, 'status');
  if (fd.has('name')) body.name = str(fd, 'name');
  if (fd.has('cohortId')) {
    const cohortId = str(fd, 'cohortId');
    if (cohortId && !isUuid(cohortId)) return { error: 'Choose a cohort, or none for now.' };
    body.cohortId = cohortId || null;
  }
  for (const key of ['opensAt', 'closesAt'] as const) {
    if (!fd.has(key)) continue;
    const value = when(fd, key);
    if (!value) return { error: 'Choose a date and time for both opening and closing.' };
    body[key] = value;
  }
  const res = await api<AdmissionCycle>('PATCH', `/v1/admissions/admin/cycles/${cycleId}`, body);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved.' };
}

// ---------- staff: applications ----------

async function staffCall(fd: FormData, path: string, method: 'POST' | 'PUT', body: unknown, notice: string): Promise<FormState> {
  const applicationId = str(fd, 'applicationId');
  if (!isUuid(applicationId)) return BAD_LINK;
  const res = await api<Application>(method, `/v1/admissions/admin/applications/${applicationId}/${path}`, body);
  if (!res.ok) return { error: res.error.code === 'ai_unavailable' || res.error.code === 'ai_no_result' ? res.error.message : friendlyError(res.error), fields: fieldErrors(res.error) };
  refresh();
  return { notice };
}

export async function reviewApplication(_: FormState, fd: FormData): Promise<FormState> {
  const scores: Record<string, number> = {};
  for (const d of DIMENSIONS) {
    const n = Number(str(fd, `score:${d}`));
    if (!Number.isInteger(n) || n < 1 || n > 5) return { error: 'Score every dimension from 1 to 5.' };
    scores[d] = n;
  }
  return staffCall(fd, 'reviews', 'POST', { scores, recommendation: str(fd, 'recommendation'), comment: str(fd, 'comment') }, 'Review saved.');
}

export async function requestAiEvaluation(_: FormState, fd: FormData): Promise<FormState> {
  return staffCall(fd, 'ai-evaluations', 'POST', undefined, 'The AI evaluation is below, beside the reviews.');
}

export async function advanceApplication(_: FormState, fd: FormData): Promise<FormState> {
  return staffCall(fd, 'advance', 'POST', { note: str(fd, 'note') || null }, 'Moved to the next stage.');
}

export async function scheduleInterview(_: FormState, fd: FormData): Promise<FormState> {
  const scheduledAt = when(fd, 'scheduledAt');
  if (!scheduledAt) return { error: 'Choose the date and time of the interview.' };
  return staffCall(fd, 'interview', 'PUT', { scheduledAt, interviewerUserId: null, notes: str(fd, 'notes') }, 'Interview saved.');
}

export async function awardScholarship(_: FormState, fd: FormData): Promise<FormState> {
  const percent = Number(str(fd, 'percent'));
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return { error: 'The award is a whole percentage from 0 to 100.' };
  return staffCall(fd, 'scholarship', 'PUT', { percent, note: str(fd, 'note') }, 'Scholarship recorded.');
}

export async function decideApplication(_: FormState, fd: FormData): Promise<FormState> {
  return staffCall(fd, 'decision', 'POST', { outcome: str(fd, 'outcome'), note: str(fd, 'note') }, 'Decision recorded. The applicant has been told.');
}
