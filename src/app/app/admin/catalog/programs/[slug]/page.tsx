import { DELIVERY_MODES, PROGRAM_FEATURES, PROGRAM_TYPES, type ProgramAuthoring } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProgramEditor } from '@/components/admin/program-editor';
import { BackLink } from '@/components/ui/nav';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { type AdminCourse, SLUG } from '@/lib/learning';

export const metadata: Metadata = { title: 'Edit programme' };

const BLANK: ProgramAuthoring = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  provider: 'The African Dream Lab',
  programType: 'cohort_program',
  deliveryMode: 'cohort',
  features: [],
  cover: { from: '#0A3D29', to: '#12805C', symbol: '◆' },
  phases: [],
  capstoneStages: [],
  graduationRequirements: [],
  calendar: [],
};

export default async function ProgramEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const isNew = slug === 'new';
  if (!isNew && !SLUG.test(slug)) notFound();
  const [program, courses] = await Promise.all([
    isNew ? null : api<ProgramAuthoring>('GET', `/v1/catalog/admin/programs/${slug}`),
    api<{ items: AdminCourse[] }>('GET', '/v1/catalog/admin/courses'),
  ]);
  if (program && !program.ok && program.status === 404) notFound();
  const error = (program && !program.ok && program.error) || (!courses.ok && courses.error) || null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <BackLink href="/app/admin/catalog" label="Catalog" className="-ml-0.5 mb-1" />
        <Eyebrow tone="gold">Platform admin · Programme</Eyebrow>
        <h1 className="text-[30px] font-extrabold">{isNew ? 'New programme' : program?.ok ? program.data.title : slug}</h1>
      </header>
      {error ? (
        <Notice tone="error">{friendlyError(error)}</Notice>
      ) : (
        <ProgramEditor
          initial={isNew ? BLANK : (program as { data: ProgramAuthoring }).data}
          isNew={isNew}
          options={{
            programTypes: PROGRAM_TYPES,
            deliveryModes: DELIVERY_MODES,
            features: PROGRAM_FEATURES,
            courses: courses.ok ? courses.data.items.map((c) => ({ slug: c.slug, title: c.title })).sort((a, b) => a.title.localeCompare(b.title)) : [],
          }}
        />
      )}
    </div>
  );
}
