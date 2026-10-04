---
about: nothing about Pagination, DataTable, page-size select or aria-live announcement exists in the repo; the constraints a Pagination inherits, and the real touchpoints (lydite is per package, bundle-check entry needed)
saw:
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/src/Tree/useControllableState.ts
  - source/react-ui/packages/ui/src/Tag/Tag.tsx
  - source/react-ui/packages/ui/src/Spinner/Spinner.tsx
  - source/react-ui/packages/ui/src/index.ts
  - .lydite/components.yml
  - docs/adr
---

Re-checked 2026-10-04 while scoping Pagination (issue #82).

- No prior art: `grep -rIl -i 'pagination|aria-live|live region|DataTable|#44|#82'` over the repo (excluding
  node_modules, .memory) hits only Button.tsx/Spinner.tsx (`role="status"` on Spinner, `Spinner.tsx:40`),
  ui README (Spinner), and ADR-0024 (toast-style live region mention, `:84`). No ADR, CONTEXT.md or
  docs/ mirror of #44/#82. Table (ADR-0027) is the only dense/data component.
- Composition rule: `packages/ui/AGENTS.md` "Architecture": a component may compose another only if that
  one is exported from `src/index.ts`; `src/internal/` never imports a component. Precedents: Tag composes
  Badge (`Tag.tsx` imports `../Badge/Badge.js`), Button imports Spinner, Dropdown imports Button/FieldShell.
  Each component injects its own `<style href="vpg-x" precedence="vpg-x">` (Tag.tsx:45, Badge.tsx:36,
  Button.tsx:68), so React dedupes by href; composing does not duplicate CSS.
- bundle-check consequence: `bundle-check/run.mjs` asserts a Button-only bundle contains only Button+Spinner;
  a new component needs an `unrelatedComponents` entry (marker = a verbatim stylesheet rule such as
  `.vpg-pagination {`). Rule `.agents/rules/update-bundle-check-with-every-component.md`.
- Compound exports (`Pagination.X`) need `/* @__PURE__ */ Object.assign(...)`
  (`.agents/rules/pure-annotate-compound-component-exports.md`); bundle-check is the only proof.
- `.lydite/components.yml` lists packages (icons, tokens, ui, telemetry, storybook), not components: no
  entry per component. Correcting an expectation, not a gotcha in the repo.
- No shared controlled/uncontrolled helper is public: `useControllableState` exists only in
  `src/Tree/useControllableState.ts` (used by `Tree.tsx:231,236`). `src/internal/` is for code two+
  components share; promoting it would be a first.
- i18n: no locale/label prop mechanism. Strings are hard-coded English defaults with an override prop
  (`Tag.tsx:36` `removeLabel ?? \`Remove ${children}\``; Spinner `label`). ADR-0020 deliberately has no
  `locale` prop (uses runtime default via `@vipengele/ts` Numeric).
- Coverage 100% over jsdom+chromium union (`vitest.config.ts`); live-region/aria wiring is jsdom-testable,
  geometry/tokens need `*.browser.test.tsx` and `afterEach(cleanup)`.
