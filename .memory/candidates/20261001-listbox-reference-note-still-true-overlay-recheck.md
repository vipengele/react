---
about: Dismissal claims in listbox-reference-is-the-control-not-the-field re-checked
targets: listbox-reference-is-the-control-not-the-field
verdict: still-true
saw:
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
---

Re-read only the useDismiss/outsidePress part: `useListboxKeyboard.ts` still excludes the field
from `outsidePress` and uses `outsidePressEvent` "click" in search mode, "pointerdown" otherwise.
`Popover.tsx` passes its `modal` prop (default `true`) to `FloatingFocusManager`, so it is modal unless a caller sets `modal={false}`. The listbox is now also a `FloatingTree`
node (a `nodeId` option), and the search input composes `dismiss` so Escape typed there closes the
listbox. Dropdown.tsx line pointers in the note are NOT re-verified and have drifted; find symbols
by name.
