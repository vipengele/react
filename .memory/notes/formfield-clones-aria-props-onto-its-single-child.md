---
name: formfield-clones-aria-props-onto-its-single-child
kind: gotcha
description: FormField cloneElements id, aria-labelledby, aria-describedby and aria-invalid onto its single child, so a field whose root is a FieldShell must accept and spread those four itself; a two-control field is group-shaped.
anchors:
  - path: source/react-ui/packages/ui/src/FormField/FormField.tsx
    blob: 8674cdbfd205
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
    blob: 5d54f16c41a8
  - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
    blob: e59320800703
confidence: suspect
---

`FormField.tsx:76` clones `id`, `aria-labelledby`, `aria-describedby` and `aria-invalid` onto its one child (it throws otherwise);
`aria-invalid` is `true` only when `error` is set. A field that renders `<FieldShell>` as its root would get them on the shell
wrapper rather than the input, so the field must accept those four as props and spread them to the real control (NumberInput does
via `...rest`, merging `aria-invalid` with its own flags). `FieldShell` renders its children as-is and never clones. For a
composite control the `role="group"` that is the shell's marked control is the element receiving FormField's props; group
components with several controls use `aria-label` instead, so a two-input range field is group-shaped, not FormField-shaped.
