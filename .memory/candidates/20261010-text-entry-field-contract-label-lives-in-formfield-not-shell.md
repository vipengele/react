---
about: FieldShell takes no label/error/required/size props; FormField above it clones id/aria onto the single child, so a multi-segment control has no ADR-sanctioned place for the labelling attributes
saw:
  - docs/adr/0011-the-field-shell-as-keystone.md
  - docs/adr/0017-the-field-shell-grows-the-control-its-composer-names.md
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
  - source/react-ui/packages/ui/src/FormField/FormField.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
---

FieldShell props are only `leading`, `trailing`, `className`, `ref`, HTMLAttributes<div>, `children`
(`FieldShell/FieldShell.tsx:4-34`). It is a pure wrapper, takes no `as`, renders no field element
(ADR-0011 "The contract"). No label, description, error, required, disabled or size props: label,
hint, error live in `FormField`, which sits ABOVE the shell and is explicitly not a shell adopter
(ADR-0011 "Who composes the shell"). The control carries `vpg-field-shell-control`
(`TextField.tsx:28`, `Dropdown.tsx:1271`; ADR-0017 :3-5); the shell never clones children (ADR-0017
:53-56). Composers: TextField, PasswordInput, Dropdown, NumberInput (ADR-0011 lists Autocomplete,
removed by ADR-0013).

FormField (`FormField/FormField.tsx:21-36,57-76`) takes `label`, `hint`, `error` and clones `id`,
`aria-labelledby`, `aria-describedby`, `aria-invalid` onto exactly ONE child element (throws on
Fragment/array, :52). Required/size props do not exist on it. Disabled and invalid reach the shell only
through `:disabled` / `aria-invalid` on a DIRECT child (`FieldShell.stylesheet.ts:95-124`).

Implication for a segmented TimeField (inference, no ADR or note addresses it): the shell's state
selectors read ONE direct-child control. Several spinbutton segments inside the shell would be
siblings or grandchildren; a segment's own `:focus-visible` on a grandchild does not match
`:has(> :focus-visible)`, and `:disabled` does not exist on a non-form div. The control marked
`vpg-field-shell-control` would have to be a single direct-child wrapper (e.g. role="group" carrying
`id`, aria-labelledby/describedby/invalid/aria-disabled) and the shell's focus ring would need a
rule the shell does not have (`:focus-within` is not used, `:has(> :focus-visible)` only matches the
direct child itself). Dropdown works because its trigger is a focusable direct child. Issue #76 says
DateField "carries the control marker", consistent with this. I did not prototype it.
