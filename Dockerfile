# Felt: the web app and its server in one image.
# Build:  docker build -t felt .
# Run:    docker run -p 8787:8787 -v felt-data:/data --env-file apps/server/.env felt

# Node 22.13 or later runs node:sqlite without a flag. Keep this pin in both stages.
ARG NODE_IMAGE=node:22.22.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Dependencies first so they stay cached until a manifest or the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/core/package.json packages/core/
COPY packages/content/package.json packages/content/
RUN pnpm install --frozen-lockfile

COPY . .
# Optional contact address for the terms and privacy pages (read at build time).
ARG VITE_SUPPORT_EMAIL
ENV VITE_SUPPORT_EMAIL=${VITE_SUPPORT_EMAIL}
RUN pnpm build:server

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_PATH=/data/felt.sqlite \
    WEB_DIR=/app/web
WORKDIR /app
# The server bundle carries every dependency, so no node_modules are needed.
COPY --from=build /app/apps/server/dist/server.cjs ./server.cjs
COPY --from=build /app/apps/server/scripts/backup.cjs ./backup.cjs
COPY --from=build /app/apps/web/dist ./web
# Hosts mount their volume here. It runs as root because Fly and Render mount volumes owned by root.
RUN mkdir -p /data
VOLUME /data
EXPOSE 8787
CMD ["node", "--no-warnings", "server.cjs"]
