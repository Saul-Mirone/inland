Review all changed or newly added Effect-TS code in this repository for anti-patterns. Check both staged and unstaged changes.

## Rules

Apply all rules from the **"Effect-TS Coding Rules"** section in `/CLAUDE.md`. The checklist below maps each rule to a review number for referencing in output:

1. `Effect.promise` instead of `Effect.tryPromise`
2. `try/catch` wrapping `yield*` in `Effect.gen`
3. `Effect.runSync` inside `Effect.gen`
4. `as` type assertions on external API responses
5. `GenericTag` usage instead of class-based `Context.Tag`
6. Spread guard using truthy check instead of `!== undefined`
7. `Layer.effect(Tag, Effect.succeed(...))` instead of `Layer.succeed`
8. Eager config reads at module scope
9. Bypassing `ConfigService` tag
10. Manual `matchEffect`/`runPromise` boilerplate in route handlers (should use `runRouteEffect` + `catchTags` + `httpError`)
11. Authorization checks in route handlers instead of service layer
12. Schema validation that doesn't stop request processing
13. Direct `process.env` reads in business logic
14. `console.log` / `console.error` in Effect code
15. Service-like module without `Context.Tag` or missing file separation
16. Repository interface leaking infrastructure dependencies in `R` channel
17. Duplicate type definitions across layers
18. Frontend `runEffect` silently swallowing errors

## Output Format

For each issue found, output:

- **File**: path and line number
- **Rule**: which rule number is violated
- **Problem**: what the code does wrong
- **Fix**: how to correct it

If no issues are found, confirm the code is clean.
