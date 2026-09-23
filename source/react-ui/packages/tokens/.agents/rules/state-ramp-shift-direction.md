# A ramp step that should stay visible at rest shifts `l` the same direction as hover; a step that should recede shifts it the opposite direction

`--vpg-state-shift`'s sign flips with colour mode, so `l + state-shift` (hover, press, visited)
always moves lightness away from the surface and `l - state-shift` (wash) always moves it toward
the surface, in both modes. Picking the wrong sign for a new ramp step still passes a test that
only checks the step differs from hover — it reads fine in whichever mode you eyeballed it in and
loses contrast against the surface in the other, because the sign that reads as "more contrast"
in light mode reads as "less contrast" in dark mode.

## Applies to

- `packages/tokens/src/theme.ts` — any new `--vpg-accent-*`/`--vpg-danger-*` ramp step derived
  from `l` and `--vpg-state-shift`.

## Example

```ts
// Correct — visited stays legible at rest in both modes, like hover
"--vpg-accent-visited": "oklch(from var(--vpg-accent) calc(l + var(--vpg-state-shift) * 3) c h)",

// Wrong — moves toward the surface like wash; reads fine in one mode, loses contrast in the other
"--vpg-accent-visited": "oklch(from var(--vpg-accent) calc(l - var(--vpg-state-shift) * 3) c h)",
```

Pin the exact derived expression in a test, not just that it differs from hover/wash — see
`packages/tokens/src/theme.test.ts`'s `"shifts visited the same direction as hover..."` test for
why a looser assertion would not have caught this.
