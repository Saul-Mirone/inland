# ---- Base ----
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare yarn@4.13.0 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/dev/package.json packages/dev/
RUN yarn workspaces focus @inland/frontend --production=false

# ---- Build ----
FROM deps AS build
COPY packages/frontend/ packages/frontend/
COPY packages/dev/ packages/dev/
COPY tsconfig.json ./
RUN yarn workspace @inland/frontend build

# ---- Runtime ----
FROM nginx:alpine AS runtime
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
