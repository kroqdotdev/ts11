# teamsheet11: Next.js standalone server with SQLite (better-sqlite3) and sharp.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Build tools for better-sqlite3 in case no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Route modules are loaded while building; they get a throwaway in-memory database.
ENV NEXT_TELEMETRY_DISABLED=1 TS11_BUILD=1 DATABASE_PATH=:memory:
RUN pnpm build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
  DATABASE_PATH=/data/teamsheet11.db DEV_DATA_DIR=/data/dev
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# SQL migrations, applied at start-up.
COPY --from=build --chown=node:node /app/drizzle ./drizzle
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/auth/ok').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
