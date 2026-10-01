# Submit the canonical value through a hidden input, not the locale-formatted display

A locale-aware field's visible input shows text in the user's own locale (`1 234,5`), which is
not the value a server should have to parse. Give the visible input no `name` at all, and pair it
with a sibling `<input type="hidden">` that carries the caller's `name` and the canonical,
unformatted value, written on every commit. Mirror `disabled` onto the hidden input too, so a
disabled field contributes nothing to the submission, exactly as a disabled native control does.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that displays a locale- or format-dependent
  string while owning a canonical underlying value — `NumberInput` today, and any future
  currency, date, or unit-aware field.

## Example

```tsx
// Correct — the server only ever sees the canonical value
<input type="text" inputMode="decimal" value={display} onChange={...} /* no name */ />
<input type="hidden" name={name} disabled={disabled} value={committed ?? ""} />

// Wrong — the submitted payload is locale-dependent and unparseable on the server
<input type="text" name={name} value={display} onChange={...} />
```

See `docs/adr/0020-numberinput-owns-spinbutton-semantics-and-locale-parsing.md` for the full
reasoning.
