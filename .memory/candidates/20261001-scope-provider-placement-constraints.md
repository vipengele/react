---
about: why ScopeProvider/useScope (needs @vipengele/ts) live in a new react-telemetry package rather than tokens, ui, or a new project
saw:
  - docs/adr/0022-non-visual-primitives-live-in-react-telemetry.md
  - source/react-ui/packages/telemetry/package.json
  - source/react-ui/packages/tokens/package.json
  - source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/AGENTS.md
  - docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md
  - docs/adr/0015-a-project-is-the-unit-of-release.md
---

Decision recorded in ADR-0022: non-visual React primitives live in `@vipengele/react-telemetry`.
The constraints that ruled out the alternatives, by reading each file:

- tokens has zero runtime deps (only react/react-dom peers) and `sideEffects:false`;
  `tokens/.agents/rules/no-usetheme-hook.md` forbids a JS-readable theme context (ADR-0001). A
  scope is not a theme, so the rule is not literally broken, but it is the nearest precedent, and
  tokens would push `@vipengele/ts` on every theme-only consumer.
- ui's runtime deps are deliberately closed (`ui/AGENTS.md` names `@floating-ui/react` and
  `@vipengele/ts`). A scope provider there adds no new dependency but reaches every ui consumer
  and joins its bundle-check.
- A new project under `source/` is not warranted: ADR-0015 makes a project the unit of
  release/lockfile (own workspace, turbo.json, biome.json, lockfile, `.lydite` entries); a
  cross-project dependency is just a published range, never `workspace:*`.
- telemetry's only runtime dependency is `"@vipengele/ts": "^0.0.2"` (same form as ui); nothing
  is imported from `@vipengele/ts-core-common`, so reserved-key errors are matched by
  `code === 'common.scope.reserved-key'` rather than `instanceof`.
- ADR numbers: 0018 and 0020 each exist twice (`ls docs/adr`); 0021 is the Link external
  affordance ADR and 0022 is the telemetry placement ADR, so the next free number is 0023. Cite
  colliding ADRs by title.
