---
name: datefield-focus-return-is-steered-through-popover-returnfocus
kind: invariant
description: DateField is a non-modal Popover anchored to its FieldShell with no Dialog host and no narrow layout; focus after close is steered by repointing the returnFocus ref before the close request, so Escape returns to the button and a pick to the input.
anchors:
  - path: source/react-ui/packages/ui/src/DateField/DateField.tsx
    blob: b08bcd6cad8d
  - path: source/react-ui/packages/ui/src/internal/useCalendarPopup.ts
    blob: 57b74f3ec40b
  - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
    blob: e15783dc3f25
  - path: docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
    blob: c00e96fd023e
confidence: verified
---

DateField passes `returnFocus={popup.returnFocus}` and `anchor={popup.fieldRef}` to `Popover` (`DateField.tsx:182-184`); ADR-0025
rejects a narrow-viewport Dialog, so there is no Dialog host, `useMediaQuery` or narrow layout in DateField, and earlier candidate
claims about `useDialogHost`/`dialogReady` describe code that is not here.

`Popover` reads its `returnFocus` ref when the panel closes, in floating-ui's passive cleanup (`Popover.tsx:72,216`:
`returnFocus ?? true`). `useCalendarPopup` points the ref at the calendar button while open (`useCalendarPopup.ts:79`) and
`closeOnto(target)` repoints it (`:86`); DateField calls `popup.closeOnto(inputRef.current)` (`DateField.tsx:341`) just before
closing from a pick, so Escape and outside press return to the button while a pick returns to the input. Repointing after the
close request is too late. This is the one place a caller can steer where focus lands, since `Popover` exposes no `initialFocus`.

Because `Calendar` ignores a re-pick of the selected day ([[calendar-grid-markup-and-test-hazards]]), the popup stays open when the
user picks the value already selected; only Escape or an outside press closes it.
