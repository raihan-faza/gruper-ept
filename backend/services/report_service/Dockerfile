# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy lockfile and package manifest for reproducible installs
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM oven/bun:1-alpine

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose gRPC port (matches SERVICE_PORT)
EXPOSE 3030

# Run with Bun directly (no compile step needed)
CMD ["bun", "run", "index.ts"]
