import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DraftEditor } from '@/components/authoring/draft-editor';
import { Notice } from '@/components/ui/primitives';
import type { Draft } from '@/lib/authoring';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Edit course' };

type Props = { params: Promise<{ draftId: string }>; searchParams: Promise<{ comment?: string }> };

export default async function DraftPage({ params, searchParams }: Props) {
  const { draftId } = await params;
  // A link from a comment notification opens that thread.
  const comment = (await searchParams).comment;
  if (!isUuid(draftId)) notFound();
  const res = await api<Draft>('GET', `/v1/catalog/authoring/drafts/${draftId}`);
  if (!res.ok && res.status === 404) notFound();

  return (
    <div className="space-y-4">{res.ok ? <DraftEditor key={res.data.id} initial={res.data} openComment={comment && isUuid(comment) ? comment : null} /> : <Notice tone="error">{friendlyError(res.error)}</Notice>}</div>
  );
}
