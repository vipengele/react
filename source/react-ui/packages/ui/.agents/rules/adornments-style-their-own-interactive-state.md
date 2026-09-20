# An interactive adornment in a `FieldShell` slot styles its own focus and disabled state

`FieldShell`'s state selectors match `> ` — a direct child of the shell — so they read focus,
invalidity and disabledness off the wrapped control only, never into a slot's subtree. A button
or other interactive element placed in `leading`/`trailing` gets no focus ring and no dimming
from the shell: it needs its own `:focus-visible` outline and its own `:disabled` treatment, and
its disabled state never sets the shell's own `opacity` (which would double-fade the field, since
the shell already dims for a disabled control).

## Applies to

- Any adornment passed to `FieldShell`'s or `TextField`'s `leading`/`trailing` prop that renders
  a focusable or disableable element (a button, a link) — `PasswordInput`'s reveal button is the
  first instance.
- That adornment's own stylesheet: declare `:focus-visible` and `:disabled` rules there; do not
  rely on the shell's `:has(> :focus-visible)` / `:has(> :disabled)` selectors to reach it.

## Example

```ts
// Correct — the toggle button owns its own focus ring and carries no opacity of its own
".vpg-password-input-toggle:focus-visible { outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring); }
 .vpg-password-input-toggle:disabled { cursor: not-allowed; }"
```

A disabled adornment button does not need `pointer-events: none` or an `opacity` rule of its
own — the surrounding field already reads as disabled once the control it wraps is, and stacking
a second dimming rule onto the shell's reads as more faded than the rest of the field.
