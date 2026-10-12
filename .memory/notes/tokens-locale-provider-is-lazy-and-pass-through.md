---
name: tokens-locale-provider-is-lazy-and-pass-through
kind: gotcha
description: tokens' useLocale reads Locale.default() lazily into a ref to keep the package side-effect free, never throws outside a provider, and returns a prop or provided locale as given; the locale context is the one JS-readable context exempt from the no-useTheme rule.
anchors:
  - path: source/react-ui/packages/tokens/src/useLocale.ts
    blob: 2d7138e6e1af
  - path: source/react-ui/packages/tokens/src/locale-context.ts
    blob: 57a4cdd8625a
  - path: source/react-ui/packages/tokens/package.json
    blob: db1158b55d7d
  - path: source/react-ui/apps/storybook/package.json
    blob: 80a081329fd0
  - path: source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
    blob: e72b3ae9800e
confidence: suspect
---

- `useLocale(locale?)` returns the argument, else the provider's value, else `Locale.default()` cached in a ref
  on first need (`useLocale.ts:14-34`); it never throws outside a provider and does no `instanceof` test, so any
  value passed in comes back as given.
- Reading the default lazily, never at module scope, is what lets tokens keep `"sideEffects": false`
  (`package.json:7`).
- `apps/storybook` declares `@vipengele/ts` itself (`package.json:17`); the explorer's reason is that pnpm's strict
  layout does not hoist it from tokens.
- The locale context is the exempt carve-out from `no-usetheme-hook.md` (a locale cannot be a CSS custom property,
  ADR-0025); do not widen it to theme values.

Suspect: the explorer's "no `instanceof`" reason (two copies of `@vipengele/ts` in the lockfile) no longer holds,
since all three packages now require `^0.1.0`; the rule is kept as the safe default. The rules file and ADR-0025
were not re-read here.
