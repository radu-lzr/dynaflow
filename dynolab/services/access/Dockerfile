# ─── Stage 1: Build ─────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

# argon2 needs build tools to compile native bindings
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY services/access/package.json services/access/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/ packages/core/
COPY services/access/ services/access/
COPY tsconfig.base.json ./

# Build core first, then auth
RUN pnpm --filter @dynolab/core build
RUN pnpm --filter @dynolab/access build

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
COPY services/access/package.json services/access/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/services/access/dist services/access/dist

# Switch to non-root user
USER appuser

EXPOSE 4002

# Node.js receives SIGTERM directly (no shell wrapper)
CMD ["node", "services/access/dist/index.js"]