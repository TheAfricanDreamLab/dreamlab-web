import { Badge, Card } from '@/components/ui/primitives';
import { type Application, admissionsTime, APPLICANT_STAGES, type ApplicantStage, EDUCATION_LEVELS, STAGE_LABELS, STATUS_LABELS, STATUS_TONES } from '@/lib/admissions';

/** What happened to the application, oldest first. */
export function Timeline({ application }: { application: Application }) {
  return (
    <ol className="space-y-3">
      {application.transitions.map((t, i) => {
        const statusChanged = i === 0 || application.transitions[i - 1]!.status !== t.status;
        const moved = t.from !== t.to;
        return (
          <li key={`${t.at}-${i}`} className="flex gap-3">
            <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-[14px] font-semibold text-ink">
                {i === 0 ? 'Application started' : moved ? `Moved to ${STAGE_LABELS[t.to]}` : statusChanged ? STATUS_LABELS[t.status] : `${STAGE_LABELS[t.to]} updated`}
              </p>
              <p className="text-[12.5px] text-muted">
                {admissionsTime(t.at)} · {t.actor.name}
              </p>
              {t.note && <p className="text-[13.5px] text-body">{t.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function StatusBadge({ status }: { status: Application['status'] }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[12.5px] font-semibold text-muted">{label}</dt>
      <dd className="whitespace-pre-line text-[14.5px] text-ink">{children}</dd>
    </div>
  );
}

const yes = (v: unknown) => (v === true ? 'Yes' : 'No');
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v : '—');

/** An applicant stage's answers, read-only. */
export function StageAnswers({ stage, answers, prompts }: { stage: ApplicantStage; answers: Record<string, unknown> | undefined; prompts: readonly { id: string; prompt: string }[] }) {
  const a = answers ?? {};
  if (Object.keys(a).length === 0) return <p className="text-[14px] text-muted">Not answered yet.</p>;
  switch (stage) {
    case 'eligibility':
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="Country">{s(a.country)}</Row>
          <Row label="Highest education">{EDUCATION_LEVELS.find((l) => l.value === a.educationLevel)?.label ?? '—'}</Row>
          <Row label="18 or older">{yes(a.isAdult)}</Row>
          <Row label="Can commit full-time">{yes(a.canCommitFullTime)}</Row>
          <Row label="Has a device and internet">{yes(a.hasDeviceAndInternet)}</Row>
        </dl>
      );
    case 'application':
      return (
        <dl className="space-y-3">
          <Row label="City or town">{s(a.city)}</Row>
          <Row label="What they do now">{s(a.occupation)}</Row>
          <Row label="Why they are applying">{s(a.motivation)}</Row>
          <Row label="How they heard">{s(a.howHeard)}</Row>
        </dl>
      );
    case 'dream_application':
      return (
        <dl className="space-y-3">
          <Row label="The dream">{s(a.dream)}</Row>
          <Row label="The problem">{s(a.problem)}</Row>
          <Row label="Who benefits">{s(a.whoBenefits)}</Row>
          <Row label="Why them">{s(a.whyYou)}</Row>
        </dl>
      );
    case 'evidence': {
      const items = Array.isArray(a.items) ? (a.items as Record<string, unknown>[]) : [];
      return (
        <ol className="space-y-3">
          {items.map((e, i) => (
            <li key={i} className="space-y-0.5">
              <p className="text-[14.5px] font-semibold text-ink">
                {i + 1}. {s(e.title)}
              </p>
              <p className="whitespace-pre-line text-[14px] text-body">{s(e.description)}</p>
              {typeof e.link === 'string' && e.link && (
                <a href={e.link} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[13.5px] font-semibold text-link hover:underline">
                  {e.link}
                </a>
              )}
            </li>
          ))}
        </ol>
      );
    }
    case 'assessment': {
      const answers = (typeof a.answers === 'object' && a.answers ? a.answers : {}) as Record<string, unknown>;
      return (
        <dl className="space-y-3">
          {prompts.map((p, i) => (
            <Row key={p.id} label={`${i + 1}. ${p.prompt}`}>
              {s(answers[p.id])}
            </Row>
          ))}
        </dl>
      );
    }
    case 'video':
      return (
        <dl className="space-y-3">
          <Row label="Video">
            {typeof a.url === 'string' && /^https?:\/\//i.test(a.url) ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-link hover:underline">
                {a.url}
              </a>
            ) : (
              '—'
            )}
          </Row>
          {typeof a.note === 'string' && a.note && <Row label="Note">{a.note}</Row>}
        </dl>
      );
  }
}

/** Every applicant stage's answers, each in its own card. */
export function AllAnswers({ application, prompts }: { application: Application; prompts: readonly { id: string; prompt: string }[] }) {
  return (
    <div className="space-y-4">
      {APPLICANT_STAGES.map((stage) => (
        <Card key={stage} className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[17px] font-bold">{STAGE_LABELS[stage]}</h3>
            <p className="text-[12.5px] text-muted">{application.submitted[stage] ? `Submitted ${admissionsTime(application.submitted[stage])}` : 'Not submitted'}</p>
          </div>
          <StageAnswers stage={stage} answers={application.answers[stage]} prompts={prompts} />
        </Card>
      ))}
    </div>
  );
}
