import type { LibraryVideo } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { VideoLibrary } from '@/components/authoring/video-library';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import type { AuthoringOverview } from '@/lib/authoring';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Video library' };

type Props = { searchParams: Promise<{ video?: string }> };

/** The organisation's video library (CAT-6). */
export default async function VideoLibraryPage({ searchParams }: Props) {
  const [sp, me, list, overview] = await Promise.all([
    searchParams,
    getMe(),
    api<{ items: LibraryVideo[] }>('GET', '/v1/catalog/authoring/videos'),
    api<AuthoringOverview>('GET', '/v1/catalog/authoring'),
  ]);
  const active = activeMembership(me);
  // Authors (of the organisation, or of any of its courses) change the library; reviewers look.
  const canChange = overview.ok && (overview.data.can.author || overview.data.courses.some((c) => c.canEdit));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[13.5px]">
          <Link href="/app/authoring" className="font-semibold text-link hover:underline">
            ← Authoring
          </Link>
        </p>
        <Eyebrow tone="gold">{active ? active.org.name : 'Platform courses'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Video library</h1>
        <p className="max-w-3xl text-[14.5px] text-muted">
          Upload a video once and use it in any course. Videos are prepared for streaming on Dream Lab’s own servers, play in the quality each learner’s connection allows, and can have captions and a transcript.
        </p>
      </header>
      {list.ok ? (
        <VideoLibrary initial={list.data.items} openId={sp.video && isUuid(sp.video) ? sp.video : null} canChange={canChange} />
      ) : (
        <Notice tone="error">{list.status === 403 ? 'The video library is for this organisation’s course authors. Ask an admin for the course author role.' : friendlyError(list.error)}</Notice>
      )}
    </div>
  );
}
