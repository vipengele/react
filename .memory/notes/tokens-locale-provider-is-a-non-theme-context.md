---
name: tokens-locale-provider-is-a-non-theme-context
kind: invariant
description: tokens' LocaleProvider/useLocale is the one JS-readable context exempt from the no-theme-context rule; useLocale never throws outside a provider and reads Locale.default() lazily so the package stays side-effect free.
anchors:
  - path: source/react-ui/packages/tokens/src/useLocale.ts
    blob: 2d7138e6e1af
  - path: source/react-ui/packages/tokens/src/locale-context.ts
    blob: 57a4cdd8625a
  - path: source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
    blob: e72b3ae9800e
  - path: source/react-ui/apps/storybook/package.json
    blob: 80a081329fd0
confidence: suspect
---

- `useLocale(locale?)` resolves the argument, else the nearest `LocaleProvider`, else `Locale.default()`,
  and never throws outside a provider (`useLocale.ts:13-27`). A value from the prop or a provider is
  returned as given. The context in `locale-context.ts` is unexported and defaults to `undefined`.
- `Locale.default()` is read on first need and kept in a ref (`useLocale.ts:21-24`), never at module
  scope, which is what lets tokens keep `"sideEffects": false` (`tokens/package.json:7`).
- The locale context is exempt from `no-usetheme-hook.md` (line 15): a locale cannot be a CSS custom
  property (ADR 0025, carve-out of ADR 0001). Do not widen it to theme values.
- `apps/storybook` declares `@vipengele/ts` itself (`package.json:17`); the explorer attributes this to
  pnpm's strict layout not hoisting it from tokens (not re-verified, hence suspect).
- Dropped as stale: the explorer's claim that ui/telemetry still resolved `@vipengele/ts` `^0.0.2`, which
  was why `instanceof Locale` is unsafe. All of tokens, ui and telemetry now declare `^0.1.0`, so
  that two-identity rationale no longer holds; `useLocale` still does not test `instanceof`.
