# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# =============================================================================
# Stage 2: Install all dependencies (including devDependencies)
# =============================================================================
FROM oven/bun:1-alpine AS dev-deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# =============================================================================
# Stage 3: Build using Node.js
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy all dependencies from Bun dev-deps stage
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Build Next.js in standalone mode for a minimal runtime image
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
RUN npx @better-auth/cli generate
RUN npm run build

# =============================================================================
# Stage 4: Runtime
# =============================================================================
FROM node:22-alpine AS runner

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
