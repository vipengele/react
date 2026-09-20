# Never add a `--vpg-*` property to `createTheme`'s output if its value depends on colour mode or `prefers-reduced-motion`

`ThemeProvider` applies `createTheme`'s output as an inline style on `.vpg-root`. An inline
declaration beats every stylesheet rule for the same property on the same element, including one
inside a media query, so a property assigned inline is permanently beyond the reach of the
`[data-vpg-mode="dark"]` rule or the `prefers-reduced-motion` query. The failure is silent:
the attribute is set, the rule matches, the declaration is simply outranked, so the property
holds one mode's value in both and nothing reads as broken (ADR-0007).

## Applies to

- `packages/tokens/src/theme.ts` — the object `createTheme` builds, and `ThemeOverrides`.
- `packages/tokens/src/base-stylesheet.ts` — where a stylesheet-owned property's light value and
  its mode/preference-resolved reassignment belong instead.

## Example

Adding a new property that must differ between colour modes or under reduced motion means:
add it to `STYLESHEET_OWNED_PROPERTIES` in `theme.ts` (so `createTheme` and `ThemeOverrides` both
reject it), assign its default in `.vpg-root` in `base-stylesheet.ts`, and reassign it in the
relevant mode/media rule there — never add it to the object `createTheme` returns.
