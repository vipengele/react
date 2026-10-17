---
name: tokens-locale-context-is-lazy-and-theme-exempt
kind: invariant
description: tokens' useLocale reads Locale.default() lazily into a ref to keep sideEffects false, and the locale context is the one JS-readable context exempt from the no-useTheme rule.
anchors:
  - path: source/react-ui/packages/tokens/src/useLocale.ts
    blob: 2d7138e6e1af
  - path: source/react-ui/packages/tokens/package.json
    blob: 71cba38b8582
  - path: source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
    blob: e72b3ae9800e
  - path: source/react-ui/apps/storybook/package.json
    blob: 60d82c41bb01
confidence: verified
---

- `useLocale` falls back to `Locale.default()` on first need, kept in a ref (`useLocale.ts:23-25`), never at
  module scope, so the package keeps `"sideEffects": false` (`tokens/package.json:7`).
- `LocaleProvider`/`useLocale` are exempt from `no-usetheme-hook.md` (`:16`): a locale is not a theme value
  and cannot be a CSS custom property (ADR-0025). Do not widen the exemption to theme values.
- `apps/storybook` declares `@vipengele/ts` itself (`package.json:17`) to import `Locale`; pnpm's strict
  layout does not hoist it from tokens.
