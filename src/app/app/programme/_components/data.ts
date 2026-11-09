import { cache } from 'react';
import type { MyProgram } from '@/lib/cohorts';
import type { MyCommunity } from '@/lib/community';
import type { ProgramOnTrack } from '@/lib/engagement';
import { api } from '@/lib/gateway';

/*
 * What the My programme pages read. Each page asks only for what it shows; `cache` keeps a page from
 * asking twice in one render.
 */

export const loadProgrammes = cache(() => api<{ items: MyProgram[] }>('GET', '/v1/learning/me/programs'));

export const loadCommunity = cache(() => api<MyCommunity>('GET', '/v1/learning/me/community'));

/**
 * Pace, catch-up and the way to the certificate (LRN-9), one per programme in the same order. An API
 * without them (or any failure here) gives null: the pages leave those parts out.
 */
export async function loadTracks(items: MyProgram[]): Promise<(ProgramOnTrack | null)[]> {
  return Promise.all(
    items.map(async (p) => {
      const t = await api<ProgramOnTrack>('GET', `/v1/learning/me/programs/${p.enrollment.id}/on-track`);
      return t.ok ? t.data : null;
    }),
  );
}
