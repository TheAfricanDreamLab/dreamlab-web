# syntax=docker/dockerfile:1.7
# Next.js standalone server. NEXT_PUBLIC_* values are fixed at build time; everything else
# (GATEWAY_URL, SITE_DOMAIN, PORT) is read when the container starts.
# Node 24.22.1: the October 2026 security release (Brotli RCE, TLS hostname bypasses).
ARG NODE_VERSION=24.22.1-alpine

FROM node:${NODE_VERSION} AS build
RUN apk add --no-cache git && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
# The LiveKit server for live classes (wss://…), allowed by the Content Security Policy.
ARG NEXT_PUBLIC_LIVEKIT_URL=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID} NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL} NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3100
CMD ["node", "server.js"]
