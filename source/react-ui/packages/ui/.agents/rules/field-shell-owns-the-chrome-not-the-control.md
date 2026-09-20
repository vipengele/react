# A control composing `FieldShell` never redeclares the chrome the shell already owns

`FieldShell` is the single definition of a text-entry field's box: its border, background,
corner radius, focus ring, open-listbox border, invalid border, disabled dimming, height,
horizontal padding and width. A control that composes it keeps its own element, class name, `className` and prop
spread, but carries none of those — redeclaring one applies the treatment twice (a ring on the
input inside the ring on the shell, an opacity multiplied into itself) and reintroduces the
per-component drift `FieldShell` exists to end (ADR-0011).

## Applies to

- Any component under `packages/ui/src/*/*.stylesheet.ts` that renders inside a `FieldShell`
  (`TextField`, `PasswordInput`, and any future control that composes it).
- The composed control's own stylesheet: no `border`, `background-color`, `border-radius`,
  `box-shadow`, `width`, or state selector for hover/focus-visible/`aria-expanded`/`aria-invalid`/`:disabled` —
  those live only on `.vpg-field-shell`. `outline: none` stays, since the shell draws the
  focus ring and the control's native outline would sit inside it.

## Example

```ts
// Correct — TextField's own stylesheet carries only what the shell doesn't
".vpg-text-field { border: none; background: none; outline: none; color: inherit; }"

// Wrong — duplicates the shell's border and disabled dimming on the input itself
".vpg-text-field { border: 1px solid var(--vpg-border-strong); }
 .vpg-text-field:disabled { opacity: 0.55; }"
```
