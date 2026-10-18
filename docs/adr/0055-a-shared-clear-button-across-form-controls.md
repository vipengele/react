# A clear button is one internal component, opted into with `clearable` and placed last in `trailing`

Several controls in `source/react-ui/packages/ui` offer a press that empties the field: `TextField`,
`Textarea` and `Dropdown` with `clearable`, `Calendar` with `clearable` as a footer button, and the
four date fields with a button they always render. Each such button has to answer the same
questions — when it shows, where it sits, what happens to focus, and what the caller is told — and
a control that answers them on its own drifts from the others the first time either changes.

**The decision: the icon-only clear button is one internal component,
`src/internal/ClearButton.tsx`, and a control that offers one opts in through a `clearable` /
`clearLabel` prop pair and renders it last in its shell's trailing slot. Clearing reports the
control's own empty value through the control's ordinary change path.**

## The props

`clearable` is a boolean that defaults to `false`. `clearLabel` is the button's accessible name and
defaults to an English string naming what is cleared — `"Clear"` on a text control, `"Clear
selection"` on `Dropdown`. Like every string in the package it is an override prop with an English
default and no locale prop, for the reason ADR-0043 gives: the package does not own locale
resolution. `Calendar` carries the same pair, with the same names and default `"Clear"`, so the
pair is the package's one spelling of the opt-in.

## When the button shows

The button renders while the control is `clearable`, holds a value, is not disabled and is not
read-only. Outside those conditions it is absent from the DOM rather than present and inert: an
empty field carries no control with nothing to do, and a disabled or read-only field accepts no
edit, so a button offering one would contradict the field. A control without a `disabled` or
`readOnly` prop of its own — `Dropdown` — applies the conditions it has.

## Where it sits

The button is an adornment (`CONTEXT.md`) in the `FieldShell` trailing slot (ADR-0011), after
whatever the caller passed as `trailing`. Last is the rule `NumberInput` follows for its steppers:
the control's own affordance stays against the field's trailing edge whatever the caller put
beside it, so two clearable fields with different adornments still put the button in the same
place. It goes in the slot rather than among the shell's direct children because the shell reads
focus, invalidity and openness off those children, and a button among them would give the whole
field a focus ring the moment it took focus.

A composer whose control is taller than one line positions the slot itself. `Textarea` pins the
whole trailing slot to the top of the field and gives it the first line's box — the textarea's top
padding above, one line's height inside — so the button and any caller adornment stay beside the
first line of text rather than floating at the vertical middle of a tall field. The slot belongs to
the shell; the composer that knows its control's line metrics is the one that aligns it.

## Focus

The button's `mousedown` default is prevented, so a pointer press never takes focus from the
control. Without that, the press blurs the control before the click lands, and a control that
commits or closes on blur does so and is only then cleared — two reports for one press. After
clearing, focus is on the control: the button leaves the DOM along with the value it emptied, and
focus left on it falls to `<body>` with nothing answering the keyboard. The button is still a real
`<button>`, so it is a tab stop and carries its name into the accessibility tree; its icon is
decorative and hidden from it.

## What the caller is told

Clearing reaches the caller as the control's own change to its empty value, through the same
callback a user edit reaches, so a caller handles one path and never a separate clear event:

- **Text controls** (`TextField`, `Textarea`) write `""` through the element's prototype `value`
  setter and dispatch a bubbling `input` event, which React delivers to `onChange` as an ordinary
  change. Its `nativeEvent` is a plain `Event` whose `isTrusted` is `false`; a caller that inspects
  it cannot read the clear as user-initiated input, and one that only reads `event.target.value`
  sees no difference from a typed deletion.
- **`Dropdown`** reports `null` for a single selection and `[]` for a `multiple` one, each mode's
  own emptiness.
- **Any other control** reports whatever its value type uses for empty. For `NumberInput`, whose
  committed value is `number | undefined`, that is `undefined`.

A text control decides whether to show the button from the text it holds: a controlled field reads
`value` on every render, and an uncontrolled one keeps the text in state from `defaultValue` and
each change event. `form.reset()` and a programmatic write to the element's `.value` fire no
`input` event, so an uncontrolled field emptied either way keeps the text it last saw and still
shows the button over an empty input. After `form.reset()`, React's own record of the value still
holds the old text, so a press reports `""`. After a `.value` write, that record already holds the
new value, React sees no change, nothing is reported and the button stays. A caller that resets or
writes the value outside the input controls the field instead.

## The existing implementations

Beyond the two text controls, six controls render a clear affordance, and they differ:

| Control | Props | Default label | Shows | Reports | Focus after clearing |
|---|---|---|---|---|---|
| `Dropdown` | `clearable`, `clearLabel` | `"Clear selection"` | opt-in, while something is selected | `null`, or `[]` when `multiple` | the trigger |
| `Calendar` | `clearable`, `clearLabel` | `"Clear"` | opt-in; a visible text button in the footer, `aria-disabled` while nothing is selected | `undefined` | stays on the button, which remains focusable |
| `DateField` | `clearLabel` | `"Clear date"` | always, while editable and holding a value or draft text | `undefined` | the input, then the commit |
| `DateTimeField` | `clearLabel` | `"Clear date and time"` | always, while editable and holding a value or draft text | `undefined` | the input, then the commit |
| `DateRangeField` | `clearLabel` | `"Clear dates"` | always, while editable and either end holds a value or draft text | `undefined` | the start editor, then the commit |
| `DateTimeRangeField` | `clearLabel` | `"Clear dates and times"` | always, while editable and either end holds a value or draft text | `undefined` | the start editor, then the commit |

`Dropdown` renders the shared component. `Calendar`'s Clear is a labelled footer button rather
than a field adornment: the calendar has no field shell and no trailing slot, and a button that
stays focusable while disabled keeps focus inside the grid's widget. It is the precedent for the
prop pair, not for the button.

The four date fields each render a private copy of the same icon button, with the same
`mousedown` prevention, in the trailing slot. They have no `clearable` prop: a date field is a
commit-only control (ADR-0035, ADR-0049), and its button is how the committed value is emptied, so
it is part of the field rather than an option on it. For these fields clearing is a commit: focus
moves to the input (the start editor, for a range) first, because focusing adopts the text on
screen as the draft, and the commit of `undefined` then replaces both the draft and the committed
value. Focusing after the commit would adopt the text the clear just removed.

`NumberInput` renders no clear button. Under this contract its button goes after its steppers and
reports `undefined`; vipengele/react#214 tracks adopting it.

## Considered options

- **A public, exported `ClearButton`.** It would let a consumer composing a control the package
  does not ship add the same button. Rejected because the button is meaningless without the
  behaviour around it — the visibility rule, the focus return and the change notification all live
  in the control — and an exported button commits the package to a DOM and a prop surface for the
  part that carries none of that. ADR-0011 exports `FieldShell` because its shape is the
  commitment; this component's shape is not, and it stays in `src/internal/`.
- **An `onClear` callback in place of a change.** A dedicated callback is explicit and needs no
  synthetic event. Rejected because every caller then handles two paths to one state: a form
  library bound to `onChange` never learns the field was emptied, and a controlled caller that
  forgets `onClear` leaves the field showing a value the user removed. Reporting the empty value
  through `onChange` keeps a clear indistinguishable from the edit it is.
- **A private copy per control**, as the date fields have. Each copy is a few lines. Rejected
  because the lines that matter — the `mousedown` prevention, the hidden icon, the hoisted
  stylesheet — are exactly the ones a copy drops or changes on its own, and every new clearable
  control would add another to keep in agreement by hand.
- **Always rendered when `clearable`, disabled while empty**, as `Calendar`'s footer button is.
  This keeps the field's width and the slot's contents stable. Rejected for field adornments
  because a native `disabled` button drops focus to `<body>` the moment it becomes disabled — which
  is the moment a press empties the field — and an `aria-disabled` one leaves a tab stop that does
  nothing in every empty field of a form. Absent while empty costs neither.
