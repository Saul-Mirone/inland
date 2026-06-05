# ---- Base ----
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare yarn@4.13.0 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/backend/package.json packages/backend/
COPY packages/dev/package.json packages/dev/
RUN yarn workspaces focus @inland/backend

# ---- Build ----
FROM deps AS build
COPY packages/backend/ packages/backend/
COPY packages/dev/ packages/dev/
COPY tsconfig.json ./
# prisma.config.ts requires DATABASE_URL at load time; db:generate doesn't connect,
# so a dummy value is enough. Real URL is injected at runtime.
ENV DATABASE_URL=postgresql://build:build@build:5432/build
RUN yarn workspace @inland/backend db:generate \
 && yarn workspace @inland/backend build

# ---- Production deps ----
FROM base AS prod-deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/backend/package.json packages/backend/
COPY packages/dev/package.json packages/dev/
RUN yarn workspaces focus @inland/backend --production

# ---- Runtime ----
FROM node:24-alpine AS runtime
RUN corepack enable && corepack prepare yarn@4.13.0 --activate
RUN apk add --no-cache tini
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/backend/dist ./packages/backend/dist
COPY --from=build --chown=node:node /app/packages/backend/generated ./packages/backend/generated
COPY --from=build --chown=node:node /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build --chown=node:node /app/packages/backend/prisma.config.ts ./packages/backend/
COPY --chown=node:node packages/backend/package.json ./packages/backend/
COPY --chown=node:node package.json ./

COPY --chown=node:node packages/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER node
ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["/docker-entrypoint.sh"]
