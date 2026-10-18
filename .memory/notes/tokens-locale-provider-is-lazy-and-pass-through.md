---
name: tokens-locale-provider-is-lazy-and-pass-through
kind: invariant
description: tokens' useLocale reads Locale.default() lazily into a ref to keep the package side-effect free, never throws outside a provider, and returns a prop or provided locale as given; the locale context is the one JS-readable context exempt from the no-useTheme rule.
anchors:
  - path: source/react-ui/packages/tokens/src/useLocale.ts
    blob: 2d7138e6e1af
  - path: source/react-ui/packages/tokens/src/locale-context.ts
    blob: 57a4cdd8625a
  - path: source/react-ui/packages/tokens/package.json
    blob: 71cba38b8582
  - path: source/react-ui/apps/storybook/package.json
    blob: a79f33c913c8
  - path: source/react-ui/packages/tokens/.agents/rules/no-usetheme-hook.md
    blob: e72b3ae9800e
confidence: suspect
---

- `useLocale(locale?)` returns the argument, else the provider's value, else `Locale.default()` cached in a ref on first
  need (`useLocale.ts:14-27`); it never throws outside a provider and does no `instanceof` test, so any value passed in
  comes back as given. The ref makes the default stable per component instance, not shared across components. The context
  in `locale-context.ts` is unexported and defaults to `undefined` (explorer report for the default, file not re-read).
- Reading the default lazily, never at module scope (`useLocale.ts:23-25`), is what lets tokens keep `"sideEffects": false`
  (`tokens/package.json:7`).
- The locale context is the exempt carve-out from `no-usetheme-hook.md` (`:16`): a locale cannot be a CSS custom property
  (ADR-0025, carve-out of ADR-0001). Do not widen it to theme values.
- `@vipengele/ts` is a regular dependency of tokens (`tokens/package.json:36`, `^0.2.0`), not a peer; telemetry is `^0.2.0`
  (`telemetry/package.json:35`) and ui `^0.2.1` (`ui/package.json:40`). `apps/storybook` declares it itself
  (`apps/storybook/package.json:18`) to import `Locale`; the explorer's reason is that pnpm's strict layout does not hoist it
  from tokens (not verified, hence suspect).
- NumberInput is the reference consumer (`useLocale(localeProp)`, `NumberInput.tsx:226`).

The original reason for "no `instanceof`" was two copies of `@vipengele/ts` in the lockfile. With every package on `^0.2.x`
the lockfile no longer has a cause for that, but a consumer's own range could still dedupe to a different copy, so
pass-through remains the safe default (pinned by `LocaleProvider.test.tsx`; lockfile and test not re-read).
