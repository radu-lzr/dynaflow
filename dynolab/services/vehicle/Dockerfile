# ─── Stage 1: Build ─────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY services/vehicle/package.json services/vehicle/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/ packages/core/
COPY services/vehicle/ services/vehicle/
COPY tsconfig.base.json ./

# Build core first, then vehicle
RUN pnpm --filter @dynolab/core build
RUN pnpm --filter @dynolab/vehicle build

# ─── Stage 2: Production ────────────────────────────────────
FROM node:22-bookworm-slim AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Non-root user for security
RUN groupadd --system appuser && \
    useradd --system --gid appuser --no-create-home appuser

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY services/vehicle/package.json services/vehicle/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/services/vehicle/dist services/vehicle/dist

# Switch to non-root user
USER appuser

EXPOSE 4004

# Node.js receives SIGTERM directly (no shell wrapper)
CMD ["node", "services/vehicle/dist/index.js"]
