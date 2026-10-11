---
about: a top-layer popover outside an open modal dialog's subtree paints above it but is inert and absent from the accessibility tree, so the toast region lives in a host element that moves into the topmost open modal surface
saw:
  - source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.ts
  - source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.browser.test.tsx
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

Checked in Chromium while building Toast (vipengele/react#63).

- `showModal()` makes everything outside the dialog's subtree inert, a `popover="manual"` element
  in the top layer included. Re-showing it after the dialog opens only fixes paint order: its
  buttons cannot be focused or clicked (Playwright reports the `<dialog>` intercepts pointer
  events) and CDP `Accessibility.getPartialAXTree` marks it `ignored` for `activeModalDialog`. A
  live region inside it is silent. ADR-0024's Toast paragraph records this and the resulting design.
- The region therefore renders into a host `div` React never renders (`useModalSurfaceHost.ts:152`
  portals into it) that is moved into the topmost open `[data-vpg-overlay-root][open]` surface and
  back down as surfaces close. After each move the popover is hidden and shown again (`:122`).
- `parent.moveBefore` (`useModalSurfaceHost.ts:45-56`) keeps a shown popover open and keeps its
  computed styles; a plain remove-and-insert hides it and replays every toast's `@starting-style`
  entry. Engines without `moveBefore`, and a Dialog that unmounts while holding the host, take the
  plain insert and replay the entry.
- The DOM does not expose top-layer order, so the hook tracks open order itself from an `open`
  attribute mutation with `oldValue === null` (`:25-28`). Surfaces already open when the region
  mounts are seeded in document order, which is wrong only for sibling surfaces opened out of
  document order before mount (`:90`).
