# Never give a `var(--vpg-*)` read a literal fallback value

`@vipengele/react-tokens` is the single source of every `--vpg-*` value. A literal fallback —
`var(--vpg-space-2, 8px)` — creates a second, driftable copy of that value which silently
wins whenever the substrate is missing the property, hiding exactly the bug a fallback exists to
surface. See `docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md`.

## Applies to

- Every `var(--vpg-*)` read in `packages/ui/src/**/*.{ts,tsx}`.
- Enforced automatically: `packages/ui/src/no-fallback-var-reads.test.ts` globs the package's own
  source tree at test-run time and fails on any match, so a fallback introduced in a component
  that doesn't exist yet is still caught.

## Example

```ts
// Correct — reads the token bare
"padding-inline: var(--vpg-space-3);"

// Wrong — the literal duplicates the substrate's value and wins silently if it's ever missing
"padding-inline: var(--vpg-space-3, 0.75rem);"
```

If the token a component needs doesn't exist yet, add it to `@vipengele/react-tokens` — don't inline a
guess here.
