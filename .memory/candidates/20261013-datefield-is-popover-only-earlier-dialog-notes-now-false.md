---
about: DateField today has no Dialog host, no useMediaQuery and no narrow layout - a non-modal Popover anchored to the field via Popover's anchor prop; the staged notes about useDialogHost, dialogReady and the narrow vitest viewport describe code that is not on this branch
saw:
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
---

Checked 2026-10-13, branch ccr-5af6aa3e-ohkekb (DateField last touched by 0256787 "add DateField (#180)").

- `grep -n "useMediaQuery\|Dialog" DateField/DateField.tsx` -> 0 hits. `grep -rl useMediaQuery src` -> only `SideNav.tsx` and `internal/useMediaQuery*`. ADR-0025 lines 14-20 and 161-164: non-modal Popover "on every viewport width"; a narrow-viewport Dialog was rejected.
- So candidates 20261012-datefield-focus-return-and-dialog-mount-gate (the `useDialogHost`/`dialogReady` parts, `DateField.tsx:265,297`) and 20261012-vitest-browser-viewport-is-narrow-and-calendar-ignores-reselect (the DateField `page.viewport` part) are `now-false` for DateField. Still true: `returnFocus` ref read at close time (`Popover.tsx:59`), repointed by `closeOnto` (`DateField.tsx:261-264`) just before closing from a pick; the effect aiming it at the button (`:253-255`); `Calendar` ignoring a re-pick of the selected day (`Calendar.tsx:65`).
- 20261011-composing-calendar-popover-field-constraints says Popover has no `anchor` prop; it does now: `anchor={popup.fieldRef}` with `placement="bottom-start"`, `modal={false}` (`DateField.tsx:291-300`), the FieldShell ref (`FieldShell.tsx` `ref` prop). The calendar button sits in the shell's `leading` slot, the clear button in `trailing` (`:502-525`).
- `bundle-check/run.mjs:139` comment "DateField composes Calendar, Popover, Dialog and FieldShell" still names Dialog; the comment, not the code, is stale.
