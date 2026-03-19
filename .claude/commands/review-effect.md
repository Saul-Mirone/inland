Review all changed or newly added Effect-TS code in this repository for the following anti-patterns. Check both staged and unstaged changes. For each issue found, report the file, line number, and which rule is violated.

## Checklist

### Error Handling

1. **`Effect.promise` instead of `Effect.tryPromise`** — Any async operation that can fail (Prisma queries, fetch, file I/O) must use `Effect.tryPromise` with an error mapping. `Effect.promise` swallows errors.
2. **`try/catch` wrapping `yield*` in `Effect.gen`** — This is dead code. `yield*` propagates errors through the Effect error channel. Use `Effect.catchTag` or `Effect.catchAll` in the pipeline instead.
3. **`Effect.runSync` inside `Effect.gen`** — Never call `runSync` inside a generator. Use `yield*` to compose effects.

### Type Safety

4. **`as` type assertions on external API responses** — Never cast API responses with `as`. Use runtime validation (e.g., `assertFields` helper) before narrowing.
5. **`GenericTag` usage** — All services should use class-based `Context.Tag`, not `GenericTag`.

### Data Handling

6. **Spread guard using truthy check instead of `!== undefined`** — `data.field && { field: data.field }` drops falsy values (`""`, `0`, `false`). Must use `data.field !== undefined && { field: data.field }`.

### Layer Construction

7. **`Layer.effect(Tag, Effect.succeed(...))` instead of `Layer.succeed(Tag, ...)`** — `Layer.effect` wrapping `Effect.succeed` is redundant. Use `Layer.succeed` directly. Only use `Layer.effect` when the layer needs to resolve dependencies at construction time.
8. **Eager config reads at module scope** — `Layer.succeed(Tag, resolveConfig())` executes `resolveConfig()` at import time, before tests can set env vars. Use `Layer.effect(Tag, Effect.sync(() => resolveConfig()))` to defer to layer construction time.
9. **Bypassing `ConfigService` tag** — Services that need config (e.g., `GitProvider`) must obtain it from the `ConfigService` tag via `yield* ConfigService`, not by calling `resolveConfig()` directly at module scope.

### Architecture

10. **Manual `catchTags`/`matchEffect`/`runPromise` boilerplate in route handlers** — Routes should use `runRouteEffect()` with declarative error mappings.
11. **Authorization checks in route handlers instead of service layer** — Service methods accessing owned resources should accept `userId` and verify ownership internally.
12. **Schema validation that doesn't stop request processing** — `withSchemaValidation` must throw to halt processing, not silently reply.
13. **Direct `process.env` reads in business logic** — Use `ConfigService` / `resolveConfig()` instead.
14. **`console.log` / `console.error` in Effect code** — Use Effect's built-in logging (`Effect.log`, `Effect.logError`) or Fastify's logger.
15. **Service-like module without a `Context.Tag` or missing file separation** — All service modules must follow the 4-file convention: `service.ts` (interface + class-based `Context.Tag`), `service-impl.ts` (implementation class), `service-live.ts` (layer wiring only — `Layer.succeed` or `Layer.effect` instantiating the impl class), and `index.ts` (barrel). Implementation logic must not live in the live file. Standalone exported functions without a Tag cannot be replaced or mocked via DI.
16. **Repository interface leaking infrastructure dependencies** — Repository methods must not expose `DatabaseService` (or similar infra tags) in their `R` channel. Return `Effect.Effect<T, RepositoryError>`, not `Effect.Effect<T, RepositoryError, DatabaseService>`. Resolve infra dependencies internally within the layer.
17. **Duplicate type definitions across layers** — If a type (e.g., `CreateUserData`, `UserWithIntegrations`) is identical in both repository and service layers, it should be defined once and re-exported. Check for structural duplicates.

### Frontend

18. **`runEffect` silently swallowing errors** — The top-level `runEffect` must surface unhandled errors to the UI via toast (sonner). Services must always handle expected errors via `catchAll`/`catchTag`; `runEffect` is the last-resort fallback, not a substitute for service-level error handling.

## Output Format

For each issue found, output:

- **File**: path and line number
- **Rule**: which rule number is violated
- **Problem**: what the code does wrong
- **Fix**: how to correct it

If no issues are found, confirm the code is clean.
