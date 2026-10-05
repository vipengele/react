# Portal `@floating-ui/react` content through `useOverlayRoot`, never `document.body`

`src/internal/useOverlayRoot.ts` is the only place an overlay resolves its portal target and
calls `createPortal`. Its target is the trigger's nearest ancestor carrying
`data-vpg-overlay-root` (set only on a modal surface), else the nearest `.vpg-root`, else none —
the overlay renders inline beside its trigger.

`ThemeProvider` assigns every `--vpg-*` custom property on `.vpg-root`, not `:root`. A portal to
`document.body` (floating-ui's default target) renders outside that subtree, so every
`var(--vpg-*)` the floating element reads resolves to nothing and colour-mode adaptation breaks
silently for that component. An overlay opened inside a modal surface has to land inside it
instead, because the surface makes everything outside itself inert and paints above it. See
`docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` and
`docs/adr/0024-overlay-layering-and-portal-ownership.md` for the full rationale.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that renders a floating element via
  `@floating-ui/react` (`useFloating`, `FloatingFocusManager`, etc.).

## Example

```tsx
const { portal } = useOverlayRoot(elements.domReference);

return bubble === null ? null : portal(bubble);
```

Never call `createPortal` or `closest(".vpg-root")` in a component: a second lookup drifts from
the hook's order, and an overlay that skips the overlay root is unreachable inside a modal
surface. Pass the trigger (`elements.domReference`) as the reference. The floating element is
positioned by the same computed coordinates wherever it lands; only the `--vpg-*` values it
inherits differ.
