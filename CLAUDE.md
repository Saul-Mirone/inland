# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inland is a markdown-based documentation/CMS management system that connects to GitHub. It is a Yarn 4 workspaces monorepo with three packages:

- **`@inland/backend`** (`packages/backend`) — Fastify 5 REST API with Effect-TS service layers, Prisma 7 (PostgreSQL), Redis sessions, GitHub OAuth
- **`@inland/frontend`** (`packages/frontend`) — React 19 SPA with Vite 8, Tailwind CSS 4, shadcn/ui, Effect-TS services, RxJS state management
- **`@inland/dev`** (`packages/dev`) — Internal dev tooling (tsconfig codegen, workspace utilities)

## Common Commands

```bash
# Dev servers
yarn dev:fe              # Frontend dev server (port 3000, proxies API to 3001)
yarn dev:be              # Backend dev server (port 3001, nodemon + SWC)

# Type checking
yarn tsc                 # Project-wide type check with project references

# Linting & formatting
yarn lint:ox             # oxlint
yarn lint:eslint         # ESLint
yarn lint:fmt            # oxfmt check
yarn lint:fmt:fix        # oxfmt fix

# Testing
yarn test                # vitest watch mode
yarn test:run            # vitest single run
yarn test:coverage       # vitest with coverage

# Codegen
yarn codegen             # Auto-generate tsconfig references across monorepo
```

## Architecture

### Backend (Effect-TS Layered Architecture)

The backend uses Effect-TS for dependency injection and error handling throughout:

- **Services** (`src/services/`) — Business logic as Effect `Context.Tag` classes (`UserService`, `SiteService`, `ArticleService`, `SessionService`)
- **Repositories** (`src/repositories/`) — Prisma-based data access implementing repository interfaces
- **Providers** (`src/providers/`) — External integrations (GitHub API via `GitProvider`, auth via `AuthProvider`)
- **Routes** (`src/routes/`) — Fastify route handlers using `runRouteEffect()` helper that maps tagged Effect errors to HTTP status codes
- **Effect Runtime** (`src/utils/effect-runtime.ts`) — `ManagedRuntime` composing all service/repository/provider layers; injected into Fastify via plugin

Request validation uses Effect `Schema` via a `withSchemaValidation` Fastify pre-handler.

### Frontend (Effect + RxJS Pattern)

- **Models** (`src/model/`) — `BehaviorSubject` instances holding state, exposed as Effect `Context.Tag` services
- **Services** (`src/services/`) — Effect-based business logic orchestrating API calls and model updates. Follow the same Tag pattern as backend services (`Context.Tag` + interface + `ServiceLive` layer). Each service directory separates interface from implementation:
  - `service-name.ts` — interface + `Context.Tag` definition
  - `service-name-live.ts` — implementation + `ServiceLive` layer
  - `index.ts` — barrel re-exports
- **API Client** (`src/services/api/`) — Shared `ApiClient` service (Tag + Live layer) providing typed HTTP methods (`get`, `post`, `put`, `del`) with automatic token refresh and error mapping. Other services depend on `ApiClient` via Effect DI.
- **React bridge** — `useObservable()` hook wraps `useSyncExternalStore` to subscribe to BehaviorSubjects

### Testing Patterns

Root `vitest.config.ts` discovers per-package configs via `packages/**/*/vitest.config.ts`. Run `yarn test` (watch) or `yarn test:run` (single run) from the root.

**Backend** — Tests live in `packages/backend/src/__test__/`:

- `vitest-mock-extended` for Prisma client mocks
- Mock factories in `__test__/helpers/mock-factories.ts` for test data
- `TestRepositoryLayer` in `__test__/helpers/test-layers.ts` composing all mock layers
- Tests create `ManagedRuntime.make(TestRepositoryLayer)` and run effects via `testRuntime.runPromise()`

**Frontend** — No tests yet. When adding tests, create a `packages/frontend/vitest.config.ts` (it will be auto-discovered by the root config). Frontend services should be tested the same way as backend: compose a test layer with mock dependencies, then run effects via `testRuntime.runPromise()`. UI component tests can use `@testing-library/react`.

## Dev Environment

Docker Compose (`dev-container/docker-compose.yml`) provides PostgreSQL and Redis. Copy `packages/backend/.env.example` to `.env` for required environment variables.

Node version managed by `.nvmrc`, Yarn version managed by corepack (`packageManager` in `package.json`).

## Effect-TS Coding Rules

These rules apply to all Effect-TS code in both backend and frontend. They are derived from past code review findings.

### Error Handling

- **Always use `Effect.tryPromise`** for async operations that can fail (Prisma queries, fetch calls, etc.). Never use `Effect.promise` — it swallows errors silently.
- **Never wrap `yield*` in `try/catch`** inside `Effect.gen`. The `yield*` operator propagates errors through the Effect error channel — `try/catch` around it is dead code. Use `Effect.catchTag`, `Effect.catchAll`, or error mapping in the pipeline instead.
- **Never use `Effect.runSync` inside `Effect.gen`**. Compose effects with `yield*` instead.

### Type Safety

- **No `as` type assertions on external API responses**. Use runtime validation (e.g., an `assertFields` helper) before narrowing types. This catches API shape changes at runtime.
- **Use class-based `Context.Tag`**, not `GenericTag`. All services should be defined as `class MyService extends Context.Tag('MyService')<MyService, MyServiceInterface>() {}`.

### Data Handling

- **Spread operator guards must use `!== undefined`**, not truthy checks. `data.field && { field: data.field }` silently drops falsy values like `""`, `0`, `false`. Use `data.field !== undefined && { field: data.field }`.

### Layer Construction

- **Use `Layer.succeed` for static service wiring**, not `Layer.effect(Tag, Effect.succeed(...))`. The latter is redundant. Only use `Layer.effect` when the layer needs to resolve dependencies at construction time.
- **Defer config reads to layer construction time**. Use `Layer.effect(Tag, Effect.sync(() => ...))` instead of `Layer.succeed(Tag, resolveConfig())`. Eager reads at import time break test scenarios where env vars are set after import.
- **Services that need config must obtain it from `ConfigService` tag**, not by calling `resolveConfig()` directly at module scope. This keeps the dependency graph explicit and testable.

### Architecture

- **Route handlers must use `runRouteEffect()`** for Effect-to-Fastify bridging. Map domain errors to `HttpError` via Effect's native `catchTags` + `httpError(status, message)` helper before passing the effect to `runRouteEffect()`. The wrapper handles success responses, `HttpError` → HTTP status, and fallback 500 for unhandled errors. Do not call `runtime.runPromise` or write `matchEffect` boilerplate directly in routes.
- **Authorization checks belong in the service layer**, not in route handlers. Service methods that access owned resources should accept a `userId` parameter and verify ownership internally.
- **Schema validation errors must stop request processing**. The `withSchemaValidation` preHandler throws `SchemaValidationError` — never silently send a reply and continue.
- **Use `ConfigService` / `resolveConfig()`** for all environment variable access. Do not read `process.env` directly in business logic.
- **All service-like modules must follow the Tag pattern** (`Context.Tag` + interface + `ServiceLive` layer). Do not define standalone functions without a Tag — this prevents DI replacement and mocking in tests.
- **Repository interfaces must not expose infrastructure dependencies in their `R` channel**. Methods should return `Effect.Effect<T, RepositoryError>`, not `Effect.Effect<T, RepositoryError, DatabaseService>`. Resolve `DatabaseService` internally within the layer.
- **Define shared types once**. If a type (e.g., `CreateUserData`) is identical across repository and service layers, define it in one place and re-export.

### Frontend

- **Frontend `runEffect` must not silently swallow errors**. Services should always handle errors via `catchAll`/`catchTag`. The top-level `runEffect` should surface unhandled errors to the UI (e.g., via a toast/notification), not just `console.error`.
- **Frontend services follow a 4-file convention** inside `services/<name>/`:
  - `<name>-service.ts` — interface + `Context.Tag` definition. No implementation logic.
  - `<name>-service-impl.ts` — `class XxxServiceImpl implements XxxServiceInterface`. All business logic lives here. Constructor receives dependencies (model, api, etc.) and methods are arrow-function properties returning `Effect.Effect`. Use `Effect.gen(this, function* () { ... })` to bind `this` in generators.
  - `<name>-service-live.ts` — only layer wiring. Use `Layer.succeed(Tag, new Impl())` when there are no Effect DI dependencies, or `Layer.effect(Tag, Effect.gen(...))` to resolve dependencies and pass them to the constructor.
  - `index.ts` — barrel re-exports (Tag, interface types, Live layer).
- **Use "service" naming**, not "controller". Frontend business logic modules are services (`SiteService`, `services/site/`), not controllers.
- **No `useEffect` in new component code** (shadcn/ui components excluded). Side effects (data fetching, subscriptions, auto-selection) belong in the service layer, not in React components. Use service `bootstrap()` methods triggered from layout-level bootstrapping (e.g., `AuthBouncer`) instead.

## Code Style Rules

These rules apply to all code in the repository.

### Naming & Structure

- **Meaningful, consistent names** — same concept = same name throughout. Variable names should be pronounceable and searchable.
- **Single Responsibility** — each module/function has one reason to change.
- **Depend on abstractions** — use DI tags and interfaces, not concrete implementations directly.

### Code Quality

- **No duplicated code** — similar code in multiple locations with the same calling context should be extracted.
- **Avoid deep nesting** — max 3 levels of conditional nesting. Refactor with early returns or extraction.
- **Short parameter lists** — more than 3-4 parameters suggests the need for an options object or restructuring.
- **Self-documenting code** — comment only what the code cannot express through naming and structure. Remove comments that repeat what the code already says.

### Cleanup

- **No dead code** — remove unused variables, functions, imports, and commented-out code blocks.
- **Fix typos** — in variable names, comments, and strings.

## Conventions

- Conventional commits enforced via commitlint
- Pre-commit hooks run oxfmt + eslint fix via lint-staged, plus oxlint
- oxfmt: no semicolons, single quotes, 80-char width
- Frontend uses `@/*` path alias mapping to `src/*`
- shadcn/ui components use base-nova style with neutral base color
