import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CenteredCard } from '@/components/auth/shells';
import { OrgWizard } from '@/components/directory/org-wizard';
import { TextLink } from '@/components/ui/primitives';
import { siteDomain } from '@/lib/tenant';

export const metadata: Metadata = { title: 'Create an organisation' };

export default async function NewOrganisationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind, from } = await searchParams;
  const valid = kind && /^[a-z]{1,20}$/.test(kind) ? kind : undefined;
  // Setting up an organisation is deliberate: always through the explanation and confirmation first.
  if (from !== 'start') redirect(`/orgs/start${valid ? `?kind=${valid}` : ''}`);
  return (
    <CenteredCard
      back={{ href: `/orgs/start${valid ? `?kind=${valid}` : ''}`, label: 'the previous step' }}
      width="wide"
      eyebrow="New organisation"
      eyebrowTone="gold"
      title="Bring your people together"
      intro="Two quick steps. You’ll be its admin, and you can change everything later."
    >
      <OrgWizard initialKind={valid} domain={siteDomain()} />
      <p className="text-center text-[13px] text-muted">
        Changed your mind? <TextLink href="/app">Back to my space</TextLink>
      </p>
    </CenteredCard>
  );
}
