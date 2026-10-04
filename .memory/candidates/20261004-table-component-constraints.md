---
about: Table in packages/ui — the density prop, sticky layer token and caption-conditional scroll region are settled conventions, and the constraints a future DataTable or dense component inherits
saw:
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - docs/adr/0027-table-density-scroll-region-and-sticky-layer.md
  - source/react-ui/packages/ui/src/Table/Table.tsx
  - source/react-ui/packages/ui/src/Table/Table.stylesheet.ts
  - source/react-ui/packages/ui/src/Table/Table.browser.test.tsx
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/.agents/rules/pure-annotate-compound-component-exports.md
---

Established by implementing and testing Table.

- Density: `Table`'s `density` ("compact" | "regular" | "relaxed") is the package's only density prop; it sets cell
  padding from `--vpg-space-*` steps and nothing else (Table.stylesheet.ts). Size vocabularies elsewhere are
  per-component unions (`ButtonSize`, `BadgeSize`); there is no shared size or density type.
- Layering: `--vpg-layer-sticky` is "900", the lowest step below `--vpg-layer-listbox` (tokens/src/theme.ts:330-333).
  ADR-0024 says every z-index is a token, so a sticky or pinned element reads a layer token rather than a literal.
  ButtonGroup.stylesheet.ts still carries a literal `z-index: 1`.
- Scroll region: the `<table>` always sits in `div.vpg-table-container` (`overflow: auto`). `className`/`style` go to
  that div; `ref` and rest props go to the `<table>`. The div is `role="region"` + `tabIndex={0}` + `aria-labelledby`
  only when a caption exists, decided by a prop check at render. A ResizeObserver, children validation, a
  `maxBlockSize` prop (ADR-0019) and `<colgroup>` alignment (`text-align` on `<col>` does not inherit) were rejected
  (ADR-0027).
- Sticky header: `border-collapse: separate` + `border-spacing: 0` so cell borders scroll with the pinned `<thead>`;
  the thead paints opaque `--vpg-surface`. `stickyHeader` pins nothing unless the wrapper's block size is bounded.
- Tests: coverage is 100% over the union of the jsdom and chromium projects (vitest.config.ts). Geometry and `calc()`
  results are asserted in `Table.browser.test.tsx`; jsdom drops `block-size` from `toHaveStyle` and converts `rem`
  to `px`. Compound components need a `unrelatedComponents` marker in bundle-check/run.mjs that matches a rule the
  stylesheet emits verbatim (`.vpg-table {`).
