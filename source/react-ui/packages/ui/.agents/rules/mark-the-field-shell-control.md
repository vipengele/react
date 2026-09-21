# A `FieldShell` composer marks its control with `vpg-field-shell-control`

`FieldShell` grows the child carrying `vpg-field-shell-control` to fill the centre's free space.
Leaving every child unmarked falls back to growing whichever child is positionally last, which a
page can capture — a browser extension appending its own element to the field becomes that last
child and takes the growth instead of the control (ADR-0017).

## Applies to

- Any component under `packages/ui/src/*` that renders inside a `FieldShell` and should receive
  the centre's free space: `TextField`'s `<input>`, `Dropdown`'s trigger, and any future control
  that composes the shell.
- A sibling inside the centre that should size to its own content — `Dropdown`'s chip row, for
  instance — carries no such marker.

## Example

```tsx
// Correct — the shell grows this element
<input className="vpg-text-field vpg-field-shell-control" {...rest} />

// Wrong — relies on this element happening to render last among the shell's children
<input className="vpg-text-field" {...rest} />
```
