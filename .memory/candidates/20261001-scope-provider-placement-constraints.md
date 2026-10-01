---
about: where a non-visual ScopeProvider/useScope (needs @vipengele/ts) can live in react-ui, and which rules constrain each option
saw:
  - source/react-ui/packages/tokens/package.json
  - source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/pnpm-lock.yaml
  - docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0016-the-brand-is-its-own-repo-consumed-as-a-published-package.md
  - .lydite/components.yml
---

Found planning issue #92 (ScopeProvider/useScope). Evidence by reading each file.

- tokens has zero runtime deps (only react/react-dom peers, `tokens/package.json:30-33`) and
  `sideEffects:false`; ThemeProvider has no `createContext` and no 'use client' (no match under
  `packages/*/src` for `use client`). `tokens/.agents/rules/no-usetheme-hook.md` forbids "a
  `useTheme()` hook or any other JS-readable theme context" (ADR-0001). A ScopeProvider is not a
  theme, so the rule is not literally broken, but it is the nearest precedent and argues against
  tokens; it would also push `@vipengele/ts` on every theme-only consumer.
- ui's runtime deps are deliberately closed: `ui/AGENTS.md` (around line 70) names `@floating-ui/react`
  and `@vipengele/ts` as the real runtime dependencies and points at ADR-0002 and ADR-0020 before
  adding another. `@vipengele/ts` is already one of them, so a ScopeProvider in ui adds no new
  dependency but still reaches every ui consumer. ui also carries
  `update-bundle-check-with-every-component.md`.
- Existing cross-repo dep form: `"@vipengele/ts": "^0.0.2"` (`ui/package.json:38`),
  `"@vipengele/brand": "^0.1.0"` (`apps/storybook/package.json:12`). Caret range, never
  `workspace:*` (ADR-0015). `@vipengele/ts@0.0.2` is in `pnpm-lock.yaml`, with `ts-core-common`
  transitive; see candidate `20261001-numeric-comes-from-the-ts-umbrella-from-0-0-2` and verify
  what `@vipengele/ts` exports before assuming `Scope` is reachable through it.
- A new project under `source/` is not warranted: ADR-0015 makes a project the unit of
  release/lockfile (own workspace, turbo.json, biome.json, lockfile, `.lydite` entries); a
  cross-project dep is just a published range.
- ADR numbers: 0018 and 0020 each exist twice (`ls docs/adr`), highest prefix is 0020, so the next
  free number is 0021; cite colliding ADRs by title.
