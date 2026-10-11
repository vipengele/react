---
about: NumberInput already resolves locale prop > LocaleProvider > runtime default (ADR-0025 supersedes ADR-0035's locale parts, not "ADR-0020")
saw:
  - docs/adr/0035-numberinput-owns-spinbutton-semantics-and-locale-parsing.md
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.test.tsx
  - source/react-ui/packages/tokens/src/useLocale.ts
  - source/react-ui/packages/tokens/src/LocaleProvider.tsx
---
The module-scope locale constant is recorded in ADR-0035 (`## Parsing and formatting are delegated`, "Intl.NumberFormat().resolvedOptions().locale", "There is no `locale` prop"), not ADR-0020 (that is ErrorBoundary/StatePanel). ADR-0025 lines 82-86 supersede only the no-locale-prop rule and the module-scope capture; the rest of ADR-0035 (commit-only onChange, draft wins while focused, hidden input) stands. ADR-0035 gives no stated SSR/hydration/test rationale for the constant: its reason is "a locale other than the browser's is a worse failure" and "an i18n layer should be received, not invented".

State on disk: the change is already in the tree. `NumberInput.tsx:26` has `locale?: Locale`, `:226` `useLocale(localeProp)` from @vipengele/react-tokens, used in tryParse/format at `:230,242,259,262,268,270,351`. `tokens/src/{LocaleProvider.tsx,useLocale.ts,locale-context.ts}` exist. useLocale caches `Locale.default()` in a per-component-instance useRef (stable across renders, not per module, not per provider). Tests: `NumberInput.test.tsx:547-604`.

Draft/locale gotcha: nothing re-parses `draft` when locale changes mid-edit. Test `NumberInput.test.tsx:591-597` only asserts the box text is kept; `commitDraft` (`NumberInput.tsx:~255-262`) then parses the old-locale text with the NEW locale (e.g. "12," under en-US). Not asserted by any test; ADR-0035 is silent. Verdict on severity not judged.

Deps: ui and tokens both declare `@vipengele/ts` ^0.1.0 (`ui/package.json:39`, `tokens/package.json:36`), lockfile resolves 0.1.0. pnpm-workspace.yaml `minimumReleaseAgeExclude: "@vipengele/*"` exempts it from the 7-day cooldown; trustPolicy no-downgrade still applies.
