# Textarea autogrows with CSS `field-sizing`

`Textarea` takes an opt-in `autoGrow` prop. When set, the control tracks its content through CSS
`field-sizing: content`, and nothing is measured in JS. The `<textarea>` carries
`data-auto-grow=""` as the selector hook:

```css
.vpg-textarea[data-auto-grow] {
  resize: none;
  field-sizing: content;
}
```

`resize: none` goes with it: under `field-sizing: content` the box follows the text, so a drag
handle would fight the next keystroke for the height.

## The height bounds

Growth runs between two inline lengths, both in `lh`:

- `min-height: {rows}lh` is the floor. `rows` is inert under `field-sizing: content`, so without
  the floor an empty field collapses to a single line. The native `rows` attribute stays on the
  element anyway: it governs the fixed mode, and it is what a browser without `field-sizing`
  falls back to. `rows` and the inline `min-height` therefore coexist, each covering a case the
  other does not.
- `max-height: {maxRows}lh` is the ceiling, present only when the caller passes `maxRows`; past
  it the text scrolls. `maxRows` exists only on the `autoGrow: true` branch of the props union,
  because a ceiling on a field that does not grow has no meaning.

Both are plain lengths, not `--vpg-*` properties, so setting them inline shadows no theme value
(`packages/ui/AGENTS.md`). A caller's own `style` is spread last and wins over either.

The stylesheet sets `box-sizing: content-box` and spends the vertical breathing room on
`padding-block`. On `border-box` the padding is subtracted from the height instead of added to
it, so a `max-height` of `Nlh` clips the last row and a `min-height` of `Nlh` shows one row fewer
than it names. On `content-box`, `lh` means N rows.

## Considered options

- **Measuring `scrollHeight` in JS on every keystroke.** The classic autogrow: reset the height,
  read `scrollHeight`, write it back. Rejected because the read forces a synchronous layout on
  each keystroke, and the reset-then-write flickers the box. `field-sizing: content` gives the
  browser the same job inside its own layout pass.
- **The mirror-wrapper grid trick.** A wrapper holds a hidden copy of the text in a grid cell
  the textarea is stacked over, so the copy sizes the cell and the textarea fills it. Rejected
  because `FieldShell` styles state from the textarea as its *direct child*:
  `:has(> :focus-visible)`, `> :disabled` and `> [aria-invalid="true"]`. Wrapping the textarea
  makes it a grandchild, and the focus ring, disabled treatment and invalid border stop
  applying. Keeping them would mean restating the shell's state rules for one component, which
  ADR-0011 assigns to the shell.
- **Unbounded growth.** A field that grows forever pushes the rest of the form out of view on a
  long paste. Rejected, hence the opt-in `maxRows` as a `max-height` in `lh`. Left unset the
  field is unbounded by choice of the caller, not by default of the component.

## Consequences

**Browsers without `field-sizing` degrade to a fixed-rows scrolling textarea.** The stylesheet
rule is ignored, `rows` governs the height, and the text scrolls once it exceeds it. The field
stays usable, only not self-sizing. This is stated behaviour and is not covered by a test.

**Adornments stay vertically centred.** `FieldShell` centres its children, so a `leading` or
`trailing` adornment sits at the middle of a tall field, not beside its first line. `FieldShell`
is unchanged. Top-aligning adornments for multi-line controls is a possible follow-up and would
be a decision of its own, since it changes a shell every composer shares.
