---
about: useLocale(locale?) is the shipped contract and reads no Locale field; the "two @vipengele/ts copies" premise is gone once all four packages sit on ^0.2.0
saw:
  - source/react-ui/packages/tokens/src/useLocale.ts
  - source/react-ui/packages/tokens/src/LocaleProvider.tsx
  - source/react-ui/packages/tokens/src/locale-context.ts
  - source/react-ui/packages/tokens/package.json
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
---

- `useLocale(locale?: Locale): Locale` (`useLocale.ts:43`): argument, else context, else a lazily
  created `Locale.default()` held in a `useRef` (`:52-54`), so it is stable per component instance,
  not shared across components. Context value is the bare `Locale` (`LocaleProvider.tsx:20`),
  provider prop is `locale: Locale` (an instance, not a tag). Context is unexported
  (`locale-context.ts`). No field of Locale is read anywhere in tokens or ui/src (grep for
  uses24Hour, hourCycle, firstDayOfWeek: 0 hits); Locale (ts-core-common 0.2.0 `locale.d.ts`)
  exposes `tag`, `hourCycle`, `uses24Hour`, `firstDayOfWeek` (IsoWeekday), `monthNames`, `weekdayNames`.
- NumberInput is the reference consumer: `useLocale(localeProp)` (`NumberInput.tsx`, diff in 01b2114).
- `@vipengele/ts` is a regular `dependencies` entry of tokens (`package.json:35-37`), not a peer;
  100053d moved tokens, telemetry, ui and storybook to `^0.2.0`. The earlier candidate's `instanceof`
  warning (two class identities from two ts versions) no longer has a cause in the lockfile, but the
  pass-through-as-given behaviour is still pinned by `LocaleProvider.test.tsx`.
- ADR-0025's only diff in 01b2114 is `status: proposed` -> `accepted`; the body is unchanged. It
  leaves seconds and the 12/24 override to the TimeField issue ("Left to later decisions"), and says
  there are no `hourCycle`/`firstDayOfWeek` props.
- `ui` takes react-tokens as a peer (`ui/package.json:41-43`). bundle-check's `external` list is
  react, react-dom, jsx-runtime and react-telemetry only (`run.mjs:36`), so react-tokens is
  bundled in the check and needs no sideEffects rule; this was read, not run.
- 100053d is local only: `git branch -a --contains` lists only this branch; origin/main's last
  commit touching ui/package.json is 01b2114 (`^0.1.0`).
