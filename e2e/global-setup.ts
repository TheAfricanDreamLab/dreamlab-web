import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Every test signs up and signs in from 127.0.0.1, so repeated local runs exhaust IAM's per-IP and
 * per-identifier limits (which answer silently, by design). Clear those counters in the local Redis
 * before a run. Development stack only: this never touches anything but the docker compose Redis.
 */
export default function globalSetup(): void {
  const apiDir = join(__dirname, '..', '..', 'dreamlab-api');
  const script = "for _,p in ipairs({'iam:rl:*','iam:lock:*','iam:otp-cd:*'}) do for _,k in ipairs(redis.call('KEYS',p)) do redis.call('DEL',k) end end return 1";
  try {
    execSync(`docker compose exec -T redis redis-cli EVAL "${script}" 0`, { cwd: apiDir, stdio: 'pipe' });
  } catch (err) {
    console.warn(`Could not reset local rate limits: ${(err as Error).message.split('\n')[0]}`);
  }
}
