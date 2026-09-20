# Portal `@floating-ui/react` content into the nearest `.vpg-root`, never `document.body`

`ThemeProvider` assigns every `--vpg-*` custom property on `.vpg-root`, not `:root`. A
portal to `document.body` (floating-ui's default target) renders outside that subtree, so every
`var(--vpg-*)` the floating element reads resolves to nothing and colour-mode adaptation
breaks silently for that component. See
`docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` for the full rationale.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that renders a floating element via
  `@floating-ui/react` (`useFloating`, `FloatingFocusManager`, etc.).

## Example

```tsx
const themeRoot = elements.domReference?.closest(".vpg-root") ?? null;

return themeRoot !== null ? createPortal(bubble, themeRoot) : bubble;
```

Fall back to rendering inline (not to `document.body`) when no `.vpg-root` ancestor exists —
an unthemed page, or a test rendering the component standalone. The floating element is
positioned by the same computed coordinates either way; only the `--vpg-*` values it inherits
differ.
