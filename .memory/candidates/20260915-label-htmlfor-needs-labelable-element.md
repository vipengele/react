---
about: <label htmlFor> silently does nothing on a non-labelable element, so FormField clones aria-labelledby unconditionally rather than relying on htmlFor alone
saw: packages/ui/src/FormField/FormField.tsx, packages/ui/src/Dropdown/Dropdown.tsx
---

An HTML `<label for="id">` only associates with labelable elements — `input`, `select`,
`textarea`, `button`, `meter`, `output`, `progress`. Pointing `htmlFor` at an `id` on some other
element (e.g. a `<div role="combobox">`) is not an error: the id resolves, the attribute is
valid HTML, and nothing warns — the label is just silently disconnected from any accessible
name computation for that element.

`Dropdown`'s trigger is exactly such an element (`<div role="combobox" tabIndex={0}>` — a plain
`<button>` was rejected for it, see the ADR at `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`
and the nested-interactive-chips finding in this store). `FormField` therefore clones
`aria-labelledby={labelId}` onto every child unconditionally, not only `htmlFor` — the child's
`id` (used for `htmlFor`) plus `aria-labelledby` together cover both labelable natives and a
non-labelable custom trigger with the same code path, rather than branching per element type.

Any future component in this package whose trigger/root is not a native form element needs the
same `aria-labelledby` treatment when wrapped by `FormField` — `htmlFor` alone will not name it.
