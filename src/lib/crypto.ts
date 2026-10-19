import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison for secrets such as sign-on state. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
