'use server';

import type { ActionPlan, Graduation, Portfolio, Residency } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { CREDENTIAL_CODE } from '@/lib/outcomes';

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from My programme.' };
const base = (enrollmentId: string) => `/v1/learning/programs/enrollments/${enrollmentId}`;
const REQUIREMENT_KEY = /^[a-z0-9_]{2,60}$/;

/** Links come as parallel label/url fields; empty rows are dropped. */
function linksOf(fd: FormData): { label: string; url: string }[] {
  const labels = fd.getAll('linkLabel').map((v) => String(v).trim());
  const urls = fd.getAll('linkUrl').map((v) => String(v).trim());
  return urls.map((url, i) => ({ label: labels[i] || url, url })).filter((l) => l.url);
}

// ---------- Dream Residency ----------

/** Save a stage's document; with intent=submit, also send it for review. */
export async function saveResidencyStage(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  const position = Number(str(fd, 'position'));
  if (!isUuid(enrollmentId) || !Number.isInteger(position) || position < 1 || position > 20) return BAD_LINK;
  const values = { text: String(fd.get('text') ?? '') };
  const saved = await api<Residency>('PUT', `${base(enrollmentId)}/residency/${position}`, { text: values.text, links: linksOf(fd) });
  if (!saved.ok) return { error: friendlyError(saved.error), fields: fieldErrors(saved.error), values };
  if (str(fd, 'intent') !== 'submit') {
    refresh();
    return { notice: 'Draft saved.' };
  }
  const submitted = await api<Residency>('POST', `${base(enrollmentId)}/residency/${position}/submit`);
  // The draft was saved either way: the form comes back holding it.
  refresh();
  if (!submitted.ok) return { error: friendlyError(submitted.error), notice: 'Your draft is saved.' };
  return { notice: 'Submitted. Faculty have been told; you’ll hear when they review it.' };
}

/** Faculty approve a submitted stage with a score, or ask for changes. */
export async function reviewResidencyStage(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  const position = Number(str(fd, 'position'));
  if (!isUuid(enrollmentId) || !Number.isInteger(position) || position < 1) return BAD_LINK;
  const decision = str(fd, 'decision');
  const values = { decision, scorePct: str(fd, 'scorePct'), feedback: str(fd, 'feedback') };
  if (decision !== 'approved' && decision !== 'changes_requested') return { error: 'Choose approve or ask for changes.', values };
  const scorePct = values.scorePct === '' ? null : Number(values.scorePct);
  if (decision === 'approved' && (scorePct === null || !Number.isFinite(scorePct) || scorePct < 0 || scorePct > 100)) {
    return { error: 'Approving needs a score from 0 to 100.', fields: { scorePct: 'A score from 0 to 100' }, values };
  }
  const res = await api<Residency>('POST', `${base(enrollmentId)}/residency/${position}/review`, { decision, scorePct: decision === 'approved' ? scorePct : null, feedback: values.feedback });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { notice: decision === 'approved' ? 'Approved. The learner has been told and the credits count now.' : 'Sent back with your feedback.' };
}

// ---------- action plan ----------

function planBody(fd: FormData) {
  const months = fd.getAll('milestoneMonth').map((v) => Number(v));
  const milestones = fd.getAll('milestone').map((v) => String(v).trim());
  const measures = fd.getAll('milestoneMeasure').map((v) => String(v).trim());
  return {
    vision: str(fd, 'vision'),
    milestones: milestones
      .map((milestone, i) => ({ month: months[i] ?? 1, milestone, measure: measures[i] ?? '' }))
      .filter((m) => m.milestone || m.measure),
    resources: str(fd, 'resources'),
    risks: str(fd, 'risks'),
  };
}

export async function saveActionPlan(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  if (!isUuid(enrollmentId)) return BAD_LINK;
  const body = planBody(fd);
  if (body.milestones.some((m) => !Number.isInteger(m.month) || m.month < 1 || m.month > 12)) return { error: 'Each milestone needs a month from 1 to 12.' };
  if (body.milestones.some((m) => m.milestone.length < 3 || m.measure.length < 3)) return { error: 'Give each milestone what you will do and how you will measure it.' };
  const saved = await api<ActionPlan>('PUT', `${base(enrollmentId)}/action-plan`, body);
  if (!saved.ok) return { error: friendlyError(saved.error), fields: fieldErrors(saved.error) };
  if (str(fd, 'intent') !== 'submit') {
    refresh();
    return { notice: 'Draft saved.' };
  }
  const submitted = await api<ActionPlan>('POST', `${base(enrollmentId)}/action-plan/submit`);
  refresh();
  if (!submitted.ok) return { error: friendlyError(submitted.error), notice: 'Your draft is saved.' };
  return { notice: 'Submitted for approval.' };
}

export async function reviewActionPlan(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  if (!isUuid(enrollmentId)) return BAD_LINK;
  const decision = str(fd, 'decision');
  if (decision !== 'approved' && decision !== 'changes_requested') return { error: 'Choose approve or ask for changes.' };
  const res = await api<ActionPlan>('POST', `${base(enrollmentId)}/action-plan/review`, { decision, feedback: str(fd, 'feedback') });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error) };
  refresh();
  return { notice: decision === 'approved' ? 'Action plan approved.' : 'Sent back with your feedback.' };
}

// ---------- graduation ----------

/** Faculty confirm a requirement, or withdraw their confirmation. */
export async function confirmRequirement(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  const key = str(fd, 'key');
  if (!isUuid(enrollmentId) || !REQUIREMENT_KEY.test(key)) return BAD_LINK;
  const confirmed = str(fd, 'confirmed') === 'true';
  const res = await api<Graduation>('PUT', `${base(enrollmentId)}/graduation/${key}`, { confirmed, note: str(fd, 'note') });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: confirmed ? 'Confirmed.' : 'Confirmation withdrawn.' };
}

export async function graduateLearner(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  if (!isUuid(enrollmentId)) return BAD_LINK;
  const res = await api<Graduation>('POST', `${base(enrollmentId)}/graduate`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Graduated. Their credential is issued and they have been told.' };
}

// ---------- portfolio ----------

export async function sharePortfolio(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  if (!isUuid(enrollmentId)) return BAD_LINK;
  const shared = str(fd, 'shared') === 'true';
  const res = await api<Portfolio>('POST', `${base(enrollmentId)}/portfolio/share`, { shared });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: shared ? 'Your portfolio is published at the link below.' : 'Your portfolio is private again; the old link no longer works.' };
}

// ---------- credentials ----------

/** The verify form: tidy what was typed and open its page. */
export async function lookUpCredential(_: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, 'code').toUpperCase().replace(/\s+/g, '');
  if (!CREDENTIAL_CODE.test(code)) return { error: 'Type the code as it is printed, for example DL-7KQ2-M9TX-4HPR.', values: { code } };
  redirect(`/verify/${code}`);
}

export async function revokeCredential(_: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, 'code');
  if (!CREDENTIAL_CODE.test(code)) return BAD_LINK;
  const res = await api('POST', `/v1/learning/credentials/${code}/revoke`, { reason: str(fd, 'reason') });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Credential revoked. Its check page now says so.' };
}
