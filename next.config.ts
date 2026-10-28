import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Invitation links carry a secret token in the URL: never leak it to other sites.
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/*
 * Content Security Policy (production builds; `next dev` needs eval and websockets). Scripts stay
 * 'unsafe-inline' because Next's bootstrap is inline; the rest is tight: course images only from the
 * media hosts and our own /media (lib/media.ts), video only from youtube-nocookie or /media, Google's
 * sign-in button, uploads to Azure Blob Storage, no plugins,
 * no framing, and forms may only post here or hand over to an identity provider (https).
 */
/** A production build tested locally uploads to Azurite (MEDIA_ORIGIN_URL); allow that origin too. */
function localStorageOrigin(): string {
  try {
    const origin = new URL(process.env.MEDIA_ORIGIN_URL ?? '').origin;
    return origin.endsWith('.blob.core.windows.net') ? '' : ` ${origin}`;
  } catch {
    return '';
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://i.ytimg.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  'frame-src https://www.youtube-nocookie.com https://accounts.google.com',
  // Uploads go from the browser straight to Azure Blob Storage with a short-lived link (MEDIA-1).
  `connect-src 'self' https://accounts.google.com https://*.blob.core.windows.net${localStorageOrigin()}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https:",
].join('; ');
if (process.env.NODE_ENV === 'production') securityHeaders.push({ key: 'Content-Security-Policy', value: contentSecurityPolicy });

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
