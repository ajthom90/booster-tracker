# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Build tools needed by better-sqlite3 native bindings
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Install deps with caching
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source and build
COPY . .

# Build SvelteKit (also runs paraglide compile via Vite plugin)
RUN npm run build

# Strip dev deps for the production install
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/data.db

# CA certs for HTTPS to LL2; nothing else needed at runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy built app + production node_modules + drizzle migrations + seed entrypoint
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/lib/seed.ts ./src/lib/seed.ts
COPY --from=builder /app/src/lib/server ./src/lib/server
COPY --from=builder /app/src/lib/paraglide ./src/lib/paraglide

VOLUME ["/data"]
EXPOSE 3000
USER node

CMD ["node", "build"]
