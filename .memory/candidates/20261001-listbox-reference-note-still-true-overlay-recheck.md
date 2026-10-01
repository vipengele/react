---
about: Dismissal pointers in listbox-reference-is-the-control-not-the-field re-checked
targets: listbox-reference-is-the-control-not-the-field
verdict: still-true
saw:
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
---

Re-read only the useDismiss/outsidePress part: useListboxKeyboard.ts:211-224 matches the note (outsidePress excludes field at 212-215, "click" for search at 223). Popover.tsx:131 is still the modal FloatingFocusManager. Dropdown.tsx line pointers (D:960-1029, 1096-1119) NOT re-verified: unchecked.
