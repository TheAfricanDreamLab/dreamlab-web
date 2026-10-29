# dreamlab-web

The Dream Lab OS web app (Next.js 16, App Router): learners, faculty, authors, organisation admins
and platform admins. It talks to the API only from the server (Server Components, Server Actions,
Route Handlers) through the gateway; the browser holds httpOnly session cookies and never sees a token.

## Run it locally

Requirements: Node 24.22.1+, pnpm 10, and the API running (see dreamlab-api: `pnpm dev`, gateway on 3000).

```sh
pnpm install
cp .env.example .env.local
pnpm dev          # http://localhost:3100 ; organisation sites at http://<slug>.localhost:3100
```

| Variable | What it is |
|---|---|
| `GATEWAY_URL` | The API gateway, called server-side |
| `SITE_DOMAIN` | Platform domain; organisations live at `<slug>.<domain>` |
| `SESSION_COOKIE_DOMAIN`, `SESSION_COOKIE_PREFIX` | One session across the platform and organisation sites; per-environment cookie names |
| `MEDIA_ORIGIN_URL` | Public storage container that `/media/*` is served from (Azurite locally) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign-in (optional) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit server for live classes (`wss://…`), allowed by the Content Security Policy; fixed at build time |

## What is where

| Path | |
|---|---|
| `/`, `/courses`, `/programs/[slug]` | Public catalogue |
| `/learn/[enrollmentId]/[itemId]` | Course player: lessons, quizzes, assignments (with file attachments), discussions |
| `/app` | Signed-in space: My learning, My programme, Journal, Notifications, Account (incl. email choices) |
| `/app/members`, `/app/roles`, `/app/settings` | Organisation people (roles for the whole organisation or one course), roles, sign-in and security |
| `/app/cohorts`, `/app/grading` | Cohorts, sessions and attendance; the grading queue |
| `/app/authoring` | Course drafts: editor with photo, trailer and lesson media uploads, preview as learners see it, review and publish |
| `/app/admin` | Platform admin: people, organisations, catalogue, programme editor |
| `/media/...` | Uploaded course media, same origin (typed by extension, sandboxed, Range requests) |
| `/files/[fileId]` | A learner's attached file: the API checks access, then a short-lived link |

`src/proxy.ts` runs before every page: it refreshes the session, keeps signed-out visitors out of
signed-in pages, and on an organisation's site switches members into that organisation.

Uploads go from the browser straight to Azure Blob Storage with a short-lived write-only link from the
API (`src/lib/upload.ts`); the production content security policy (`next.config.ts`) allows that
storage host for `connect-src` only.

## Tests

```sh
pnpm lint && pnpm exec tsc --noEmit
pnpm test:e2e     # Playwright, against the full local stack (API, notify, Azurite) and this app on 3100
```

The Playwright helpers read one-time codes and invitation links from `../dreamlab-api/.logs/iam.log`, so
run the API with its IAM output written there and with `EMAIL_PROVIDER=console` (a real email key in
the API's `.env` would try to mail the test addresses, and sign-ups fail). Run the suite with
`E2E_RESET_RATE_LIMITS=1` so the many sign-ups from one address are not rate-limited. Test against a production build (`next build` then
`next start -p 3100`): development mode compiles pages on first visit, too slowly for the timeouts.
