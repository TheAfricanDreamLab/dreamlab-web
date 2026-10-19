/** Liveness for the container health check and the load balancer. */
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
