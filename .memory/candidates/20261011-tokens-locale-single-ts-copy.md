---
about: the two-copies-of-@vipengele/ts worry behind useLocale's no-instanceof rule no longer holds in the lockfile
saw:
  - source/react-ui/pnpm-lock.yaml
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/tokens/src/useLocale.ts
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
targets: tokens-locale-provider-is-lazy-and-pass-through
verdict: still-true
---
Re-checked the note's "suspect" tail. `grep -n '@vipengele/ts' source/react-ui/pnpm-lock.yaml`: every importer
(ui, tokens, telemetry, storybook) specifies `^0.1.0` and resolves `@vipengele/ts@0.1.0`; one package entry, one
`ts-core-common@0.1.0`. `packages/ui/package.json:39` lists it under `dependencies` (not a peer), tokens and
telemetry also depend on it. So today there is one copy and `instanceof Locale` would work; but ui declares
it as a dependency while a consumer's own range could still dedupe to a different copy, so keeping "no instanceof,
accept the value as given" remains the safe default. `useLocale.ts` body matches the note (prop, else provider,
else `Locale.default()` cached in a ref). NumberInput already consumes it (`NumberInput.tsx:2,24`).
