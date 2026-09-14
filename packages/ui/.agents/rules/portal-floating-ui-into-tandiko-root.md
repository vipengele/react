# Portal `@floating-ui/react` content into the nearest `.tandiko-root`, never `document.body`

`ThemeProvider` assigns every `--tandiko-*` custom property on `.tandiko-root`, not `:root`. A
portal to `document.body` (floating-ui's default target) renders outside that subtree, so every
`var(--tandiko-*)` the floating element reads resolves to nothing and colour-mode adaptation
breaks silently for that component. See
`docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` for the full rationale.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that renders a floating element via
  `@floating-ui/react` (`useFloating`, `FloatingFocusManager`, etc.).

## Example

```tsx
const themeRoot = elements.domReference?.closest(".tandiko-root") ?? null;

return themeRoot !== null ? createPortal(bubble, themeRoot) : bubble;
```

Fall back to rendering inline (not to `document.body`) when no `.tandiko-root` ancestor exists —
an unthemed page, or a test rendering the component standalone. The floating element is
positioned by the same computed coordinates either way; only the `--tandiko-*` values it inherits
differ.
