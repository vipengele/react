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

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines.
