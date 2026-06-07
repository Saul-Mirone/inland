# Contributing

Thanks for your interest in working on Inland.

## Tech stack

- **Backend** (`packages/backend`) — Fastify 5, Effect-TS service layers, Prisma 7 (PostgreSQL), Redis sessions, GitHub OAuth
- **Frontend** (`packages/frontend`) — React 19, Vite 8, Tailwind CSS 4, shadcn/ui, Effect-TS services, RxJS state management
- **Dev tooling** (`packages/dev`) — internal tsconfig codegen, workspace utilities
- **Monorepo** — Yarn 4 workspaces; Node version pinned in `.nvmrc`

## Prerequisites

- Node.js (see `.nvmrc`) — `nvm use` or equivalent
- Docker + Docker Compose
- A GitHub OAuth App pointed at `http://localhost:3001/api/auth/github/callback` (for local sign-in)

## Setup

```bash
# 1. Start PostgreSQL + Redis for development
docker compose -f dev-container/docker-compose.yml up -d

# 2. Configure backend env
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env: fill in GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET

# 3. Install dependencies
yarn install

# 4. Apply database migrations
yarn workspace @inland/backend db:migrate

# 5. Run dev servers (in two terminals)
yarn dev:fe   # frontend on http://localhost:3000
yarn dev:be   # backend  on http://localhost:3001
```

The frontend dev server proxies `/api/*` to the backend on `:3001`.

## Common commands

```bash
yarn tsc              # project-wide type check (uses TypeScript project references)
yarn lint:ox          # oxlint
yarn lint:eslint      # ESLint
yarn lint:fmt         # oxfmt check
yarn lint:fmt:fix     # oxfmt fix
yarn test             # vitest watch
yarn test:run         # vitest single run
yarn test:coverage    # vitest with coverage
yarn codegen          # regenerate tsconfig references across the monorepo
```

Pre-commit hooks (Husky + lint-staged) run oxfmt + ESLint fix on staged files and oxlint over the whole repo.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for the canonical reference. The short version:

- **Backend** uses Effect-TS for DI and error handling. Business logic lives in `services/`, data access in `repositories/`, external integrations in `providers/`. Routes use a `runRouteEffect()` helper that bridges Effect errors to HTTP responses.
- **Frontend** uses Effect services backed by `BehaviorSubject` models for state. React components subscribe via a `useObservable()` hook. Side effects (data fetching, auto-selection) belong in the service layer, not in `useEffect`.

`CLAUDE.md` also documents Effect-TS rules (error handling, type safety, layer construction, etc.) and project-wide code style. Please read it before opening a PR — review will check against these rules.

## Testing

```bash
yarn test:run
```

- **Backend** tests live in `packages/backend/src/__test__/`. They use `vitest-mock-extended` for Prisma mocks and compose a `TestRepositoryLayer` to inject test doubles into the Effect runtime.
- **Frontend** has no tests yet. When adding them, create `packages/frontend/vitest.config.ts` — the root config will auto-discover it. Mirror the backend pattern: mock dependencies in a test layer, run effects via `testRuntime.runPromise()`.

## Commit & PR conventions

- **Conventional Commits** are enforced via commitlint. Examples:
  - `feat: add article editor toolbar`
  - `fix(backend): handle expired session token`
  - `chore: bump dependencies`
  - `docs: clarify deployment steps`
- Keep PRs focused; one logical change per PR.
- CI runs type check, lint (oxlint + ESLint + oxfmt), and tests. All must pass.

## Project structure

```
packages/
  backend/      Fastify API
  frontend/     React SPA
  dev/          internal tooling
dev-container/  docker-compose for local Postgres + Redis
scripts/        repo scripts (codegen, init-db.sql)
```

## Docker images

Production images are built and pushed by `.github/workflows/docker.yml` on every push to `main` and on `v*` git tags. See `packages/backend/Dockerfile` and `packages/frontend/Dockerfile`.

`docker-compose.yml` pulls images from GHCR by default. To build from local source instead (e.g. to test a change before pushing), overlay `docker-compose.build.yml`:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml \
  --env-file .env.production up -d --build
```
