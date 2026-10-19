import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Invitation links carry a secret token in the URL: never leak it to other sites.
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Nearly every signed-in page reads the session cookie, so pages render per request.
  // The landing page is static on its own; Cache Components can come back per route later.
  cacheComponents: false,
  poweredByHeader: false,
  // A self-contained server for the Docker image (Dockerfile).
  output: 'standalone',
  // Platform admins upload course files (JSON) through a Server Action; allow up to 4 MB plus overhead.
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
