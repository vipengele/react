# @vipengele/react-telemetry

Telemetry for React in the Vipengele design system. See the root `AGENTS.md` for monorepo-wide
commands and policy, and `README.md` in this directory for the consumer-facing API.

## Commands

```bash
pnpm --filter @vipengele/react-telemetry build        # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-telemetry type-check
pnpm --filter @vipengele/react-telemetry test         # vitest run --coverage
```

## Architecture

- `src/index.ts` is the single entry point; everything public is a plain named export, never a
  namespace barrel, which would defeat tree-shaking (`"sideEffects": false`).
- tsup bundles the JavaScript and `tsc -p tsconfig.build.json` emits the declarations.
- `@vipengele/ts` is the only runtime dependency. React 19 / React DOM 19 are peer dependencies.
  Nothing is imported from `@vipengele/ts-core-common`, which `@vipengele/ts` pins exactly and does
  not re-export wholesale: attributes are typed `Record<string, unknown>`, and a reserved-key error
  is recognised by `code === "common.scope.reserved-key"`, never `instanceof`, since two resolved
  copies of that package give the class two identities.
- `src/context.ts` holds the React context carrying the nearest `ScopeProvider`'s scope; it is not
  exported. `useScope()` reads it and falls back to `Scope.current()`.
- `src/ScopeProvider.tsx` builds its scope once, in a lazy `useState` initialiser:
  `Scope.propagate(parent, () => Scope.inherit(tag, attributes, () => Scope.current()))`, or
  `Scope.isolated(...)` under `isolate`. `tag` and `isolate` are read only then. Changed
  `attributes` are diffed shallowly against the last applied ones and written to the same scope in
  a `useLayoutEffect` — never during render, which React may replay or discard. A dropped key is
  set to `undefined`, since a scope has no key delete; that shadows the parent's value.
- The scope is captured lexically because nothing ambient survives an `await` in the browser: the
  carrier there is a synchronous stack. Under jsdom the carrier is Node's `AsyncLocalStorage`,
  which does follow `await`, so behaviour that depends on losing the ambient scope is tested only
  in the chromium project.

## Tests

`vitest.config.ts` has two projects. `jsdom` runs `src/*.test.tsx`; `chromium` runs
`src/*.browser.test.tsx` in Playwright's Chromium and has no automatic Testing Library cleanup, so
each browser suite calls `afterEach(cleanup)` itself. Both feed one v8 coverage report.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines.
