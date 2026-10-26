---
about: "Five fields already ship a trailing clear button, each with its own copy of the button and diverging label, mousedown, focus and visibility rules"
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
  - source/react-ui/packages/ui/src/DateRangeField/DateRangeField.tsx
  - source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
  - source/react-ui/packages/ui/src/DateField/DateField.stylesheet.ts
  - source/react-ui/packages/ui/.agents/rules/adornments-style-their-own-interactive-state.md
  - docs/adr/0013-dropdown-is-the-one-searchable-combobox.md
---

Found while planning issue #89 (shared clear-button ADR). The issue frames Dropdown as the only
existing clear button; it is not. Every clear button is a private `ClearButton` function in its
component file, a lucide `X` icon (`@vipengele/react-icons`) in a `<button type="button">`, placed
in the FieldShell `trailing` slot, with a per-component stylesheet block that is a near copy
(`padding: var(--vpg-space-1)`, `--vpg-radius-full`, icon `--vpg-icon-sm`, hover `--vpg-accent-wash`,
own `:focus-visible` outline). Evidence: `grep -rn 'ClearButton' src --include=*.tsx`.

Divergences (the ADR has to pick one):
- Label: Dropdown hardcodes `aria-label="Clear selection"` (Dropdown.tsx:668), no prop. DateField
  (`clearLabel`, default "Clear date", DateField.tsx:50-51,242), DateTimeField ("Clear date and
  time", :58-59,360), DateRangeField ("Clear dates", :71-72,346), DateTimeRangeField (:95) take a
  `clearLabel` string prop with an English default. ADR-0043:33 states the library rule: every
  string has an override prop with English default, no locale prop.
- Mousedown: DateField's button does `onMouseDown={e => e.preventDefault()}` (DateField.tsx:147) so
  the input does not blur-commit before the clear. Dropdown has none on the button; it relies on the
  field's `onFieldMouseDown` skipping `target.closest("button")` (useListboxKeyboard.ts:196).
- Focus after clear: Dropdown focuses the trigger (Dropdown.tsx:1052-1058, because the button
  unmounts with the selection). DateField focuses the input then commits `undefined`
  (DateField.tsx:332-335).
- Visibility: Dropdown `clearable && selectedEntries.length > 0` (:970) and is opt-in; it has no
  disabled/readOnly prop on the component itself (only option-level `disabled`). DateField is
  always-on, shown when `editable && (committed !== undefined || display !== "")` (:375), i.e.
  hidden when disabled/readOnly. DateRangeField's readOnly doc says "no clear button" (:57).
- Callback: Dropdown `onChange(null)` single / `onChange([])` multiple (Dropdown.tsx:553-555); date
  fields `onChange(undefined)` via `commit(undefined)`.
- Prop naming: Dropdown's opt-in is `clearable?: boolean` default false (Dropdown.tsx:243); date
  fields have no opt-in at all.

Shared constraint already written down: `.agents/rules/adornments-style-their-own-interactive-state.md`
(slot adornments need their own `:focus-visible`; no own `opacity`), and ADR-0013 section
"`clearable`" (docs/adr/0013-...md:115-130) explains why the button is in the trailing slot after
the chevron, which is inside the trigger.
