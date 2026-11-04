import type { Outcome } from '@/app/actions/community';

/**
 * Runs a server action from the browser. A request that fails outright (the connection drops, the
 * server cannot be reached) becomes an ordinary error instead of a rejection, so callers always
 * clear their busy state and show what went wrong.
 */
export async function attempt<T>(action: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, error: 'We could not reach Dream Lab. Check your connection and try again.' };
  }
}
