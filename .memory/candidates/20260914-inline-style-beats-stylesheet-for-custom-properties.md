---
about: an inline style always overrides a stylesheet rule for the same CSS custom property on the same element, regardless of selector specificity
saw: packages/tokens/src/theme.ts, packages/tokens/src/base-stylesheet.ts
---

`@tandiko/tokens`'s dark mode was silently dead on arrival from the moment it shipped in
PR #9: `createTheme()` included `--tandiko-accent`/`--tandiko-ink`/`--tandiko-surface` in the
`Theme` object `ThemeProvider` applies as an inline `style`, and `base-stylesheet.ts`'s
`.tandiko-root[data-tandiko-mode="dark"]` rule reassigned those same three properties. An
inline style declaration always wins over any stylesheet selector for the same property on
the same element — there is no selector specificity high enough to beat it, short of the
inline declaration itself using `!important` (which React doesn't let you do via the `style`
prop). `colorMode="dark"` set the `data-tandiko-mode` attribute correctly and the Storybook
toolbar toggle appeared to work, but the actual background/text colors never changed — nothing
in the existing test suite caught this, because Vitest/jsdom cannot compute CSS cascade for
custom properties from a stylesheet rule against an element with conflicting inline styles.

Fixed in PR #11: `createTheme()` no longer returns those three keys at all — only the
mode-independent `-light`/`-dark` variants (e.g. `--tandiko-accent-light`,
`--tandiko-accent-dark`) are ever applied inline, since those never need to be overridden
after the fact. `base-stylesheet.ts`'s `.tandiko-root` rule is now the ONLY place
`--tandiko-accent`/`-ink`/`-surface` are assigned (defaulting to the `-light` variant), which
lets the higher-specificity dark-mode selectors actually take effect.

**The general rule for any future component in this design system**: any CSS custom property
that needs to be reassigned later — by a `[data-*]` mode selector, a `:hover`/`:focus` state
rule, a media query, or any other stylesheet-driven override — must be assigned only via an
injected stylesheet (the `<style href precedence>` pattern both `@tandiko/tokens` and
`@tandiko/icons` use), never as part of an object spread into a React `style` prop. Only
properties that are truly static per-instance (never overridden by any selector) are safe to
apply inline.
