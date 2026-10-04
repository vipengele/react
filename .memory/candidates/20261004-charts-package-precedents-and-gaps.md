---
about: planning a charts package - no charting ADR/token/note exists; "version independently" is only satisfiable by a separate project; telemetry (ADR-0022) is the precedent for a new package in react-ui; ui's bundle-check is per-package so a separate charts package never touches it
saw:
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0022-non-visual-primitives-live-in-react-telemetry.md
  - docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/icons/package.json
  - source/react-ui/pnpm-workspace.yaml
  - .lydite/components.yml
---

Established by reading the files above (for issue #84, new `@vipengele/react-charts`).

- Versioning: ADR-0015 says all packages of a project share one version (internal deps are
  `workspace:*`, packed as exact pins; `release.yml` publishes every non-private package at the tag
  version). A package under `source/react-ui/packages/charts` therefore cannot version
  independently; only a new project `source/react-charts/` can (own workspace, lockfile, turbo,
  tsconfig.base, biome, tag `react-charts@vX.Y.Z`, cross-project dep on react-tokens as a published
  range). ADR-0015 gives no explicit criterion for project vs package. ADR-0022 is the nearest
  precedent: it put `react-telemetry` in react-ui as a package and rejected "a new project (ADR-0015)
  is more machinery than a package that shares the react-ui version, toolchain and Storybook".
- Rejected-option record for charting libs: none. grep for chart|recharts|visx|nivo|echarts|d3 over
  docs, notes, ADRs finds only ADR-0001's deferral ("a canvas-drawn chart ... can read a resolved CSS
  custom property off its own DOM node at render time; not yet needed") and the same example in
  `tokens/.agents/rules/no-usetheme-hook.md`. No `useTheme()` hook may be added (ADR-0001), so a
  canvas library must read `getComputedStyle(node)` itself; SVG can use `var(--vpg-*)` directly.
- Tokens: the seed is only accent/danger/ink/surface/radius/fonts (`tokens/src/theme.ts:11-28`). grep
  for success|warning|info|series|categorical|palette in `tokens/src` finds no data-viz or status
  roles besides accent and danger, so categorical series colours would be new roles (and must be
  stylesheet/`light-dark()` consistent with ADR-0007/0008).
- bundle-check (`ui/bundle-check/run.mjs`) is a per-package leak check, not a size budget: it bundles a
  Button-only entry from the package's own `dist/` and asserts markers absent. It exists in `ui` and
  `icons` only. A separate charts package never enters ui's bundle, so ui's check is unaffected
  unless ui imports charts; charts would have no bundle-check unless one is written (needs a marker
  string the library emits at runtime, per note bundle-check-floating-ui-markers-lack-positive-control).
- Wrapping precedent: `icons/package.json` has `lucide-react` as a real `dependencies` entry (not a
  peer), `sideEffects: false`, react/react-dom `^19` peers. ADR-0002 and ADR-0025 likewise take
  third-party libs as real dependencies and require the pinned version to pass minimumReleaseAge /
  no-downgrade / blockExoticSubdeps.
- Per-package touchpoints are in candidate 20261001-new-react-ui-package-touchpoints.md; the
  `.lydite/components.yml` header (lines 1-14) confirms a component is one workspace package and
  telemetry (lines ~42-49) is the model for a package with a chromium browser project.
