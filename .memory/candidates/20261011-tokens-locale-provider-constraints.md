---
about: tokens' LocaleProvider/useLocale is a second, deliberately non-theme context; useLocale must pass Locale values through without instanceof, and its default is read lazily to keep the package side-effect free
saw:
  - source/react-ui/packages/tokens/src/useLocale.ts
  - source/react-ui/packages/tokens/src/locale-context.ts
  - source/react-ui/packages/tokens/src/LocaleProvider.tsx
  - source/react-ui/packages/tokens/package.json
  - source/react-ui/apps/storybook/package.json
  - source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
---

- `useLocale(locale?)` resolves the argument, else the nearest `LocaleProvider`, else
  `Locale.default()`, and never throws outside a provider (`useLocale.ts`). The context
  (`locale-context.ts`) is unexported and defaults to `undefined`; the provider renders no element and
  is independent of `ThemeProvider`.
- It must not test `instanceof Locale`. `@vipengele/ts` is a dependency of tokens (`^0.1.0`) while
  `ui` and `telemetry` still resolve `^0.0.2` until `NumberInput` adopts `Locale`, so the lockfile
  holds two copies and the class has two identities; a value is passed through as given
  (`LocaleProvider.test.tsx` pins this with a plain object).
- `Locale.default()` is read on first need and kept in a ref, never at module scope, so tokens keeps
  `"sideEffects": false`.
- The locale context is the one JS-readable context exempt from `no-usetheme-hook.md`: a locale
  cannot be a CSS custom property (ADR-0025, carve-out of ADR-0001). Do not widen it to theme values.
- `apps/storybook` must declare `@vipengele/ts` itself to import `Locale`: pnpm's strict layout does
  not hoist it from tokens (`apps/storybook/package.json`).
