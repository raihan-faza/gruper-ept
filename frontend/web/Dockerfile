# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy all dependencies (including devDeps for the build)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Build Next.js in standalone mode for a minimal runtime image
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output (requires output: 'standalone' in next.config)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
