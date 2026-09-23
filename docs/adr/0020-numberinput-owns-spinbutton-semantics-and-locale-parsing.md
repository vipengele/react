# NumberInput owns spinbutton semantics and locale parsing

`<input type="number">` is the control this component exists to replace. It scrolls to a different
value under an ambient wheel gesture, it parses against the page's locale rather than the user's,
it rejects a grouping separator the user's own locale puts in every number they write, and its
stepper buttons are unstylable. `NumberInput` therefore does not wrap it. It renders
`<input type="text" inputMode="decimal">` inside a `FieldShell` (ADR-0011), marked with
`.vpg-field-shell-control` so the shell grows it (ADR-0017), and supplies the parts of
`type="number"` worth keeping itself.

Supplying them means the component holds state and interprets keystrokes, which no other control
in `source/react-ui/packages/ui` that edits a value does. That is the substance of this decision.

## The control is a spinbutton, always

The `<input>` carries `role="spinbutton"`, and Up and Down arrow keys step the value by `step`
(default `1`), clamped to `min` and `max`. None of this is conditional on `min` or `max` being
set: a spinbutton with an unbounded range is still a spinbutton, and a control whose arrow keys
work only when the caller happened to pass a bound is a control nobody can rely on.

`aria-valuemin` and `aria-valuemax` are emitted when `min` and `max` are given. `aria-valuenow`
and `aria-valuetext` are **omitted entirely** when the committed value is `undefined` — ARIA 1.2
makes both optional for exactly the case of a spinbutton with no value, and an empty field
reporting `aria-valuenow="0"` announces a number the user did not enter.

A component owning its own keyboard handling is not new in this package. `Dropdown` routes every
key through `useListboxKeyboard`, and `Tabs` hand-writes `handleKeyDown` for roving-tabindex
arrow navigation. `Slider` does not, and is not a counterexample: it renders a native
`<input type="range">`, which supplies arrow stepping and range ARIA for free. What has no
precedent here is pairing arrow-key stepping with spinbutton ARIA on an input the user also types
free text into — the two interpretations of the same element have to agree, which is why the
display state and the committed value below are separate things.

## There is no wheel-scroll increment

Not opt-in, not behind a prop, not deferred. A wheel listener that changes the value is the single
worst-behaved part of `type="number"`: it has no discoverable affordance, it fires from a gesture
the user made to scroll the page, and it silently rewrites a field they had already filled in. It
is also not an accessibility affordance standing in for anything — every user it could serve is
served by the arrow keys, the stepper buttons, or typing. Removing it is a reason this component
exists.

## The value contract is numeric and commit-only

```ts
value?: number;
defaultValue?: number;
onChange?: (value: number | undefined) => void;
```

`onChange` fires on **commit** only: blur, Enter, a stepper-button press, or an arrow-key step. It
never fires per keystroke.

This breaks the convention every other control in the package follows. `TextField`, `Textarea` and
`Checkbox` are thin passthroughs — they spread onto a native element, add no state, and hand the
caller the native event. `NumberInput` cannot be one. Locale-aware entry means the string in the
box (`1 234,5`, or `1,234.` mid-typing) and the number the caller owns (`1234.5`) are different
values with different lifetimes, so the component has to hold the display string itself. Once it
holds display state, a per-keystroke `onChange` would be reporting a parse of a half-typed number,
which is why the commit boundary is part of the contract rather than an implementation detail.

## Parsing and formatting are delegated, and the locale is the runtime's

All parsing and formatting go through `@vipengele/ts-core-common`'s `Numeric.tryParse` and
`Numeric.format`. The component owns no number grammar of its own.

The locale passed to them is the runtime's own resolved default,
`Intl.NumberFormat().resolvedOptions().locale`. There is no `locale` prop. A user reading a field
formatted for a locale other than the one their browser is configured for is a worse failure than
a caller who cannot override it, and an application-wide i18n layer is a decision this component
should receive rather than invent.

## Out-of-range values commit as typed

Stepping — arrow keys or stepper buttons — clamps to `min` and `max` and rounds to `step`'s own
decimal precision, so stepping by `0.1` produces `0.3`, not `0.30000000000000004`.

A value the user **types or pastes** is not clamped. On blur or Enter it commits exactly as
entered: `onChange` and `aria-valuenow` receive the real out-of-range number, never `undefined`
and never a clamped substitute. `aria-invalid` is the only signal that anything is wrong, and it
is the caller's job to act on it.

The two paths differ because the user's intent differs. Holding an arrow key against a bound is an
unambiguous request for the bound. Typing `250` into a field that maxes at 100 is a statement,
possibly a mistake, and rewriting it to `100` under the cursor destroys the evidence of the
mistake along with the input.

## An in-progress edit wins over a controlled update

While the input is focused, the user's edit is authoritative: a change to the controlled `value`
prop does not overwrite what is in the box. External `value` updates reach the display only while
the input is unfocused. Committing reconciles the two.

Without this, any ambient re-render carrying a stale or recomputed `value` — a debounced fetch
landing, a sibling field's update — replaces the half-typed number under the caret.

## Enter inside a form submits natively

The Enter handler does not call `preventDefault()`, and it does not call `requestSubmit()`. It
commits and lets the event continue, so the browser's implicit-submission rules apply exactly as
they do for any other text input: a lone text field submits, two text fields with no submit button
do not.

The ordering problem this creates is real and is solved narrowly. The native submit fires in the
same tick as the commit, before React would flush the resulting state, so the hidden input would
carry the previous value. The commit's state updates are therefore wrapped in `flushSync`, making
the DOM value current before the unprevented submit reads it.

## Form participation goes through a hidden input

The visible `<input>` carries **no** `name`. A sibling `<input type="hidden">` carries the
caller's `name` and the canonical, unformatted committed value, and is written on every commit. It
mirrors `disabled` too, so a disabled `NumberInput` contributes nothing to the submitted form, as
a disabled native control does not.

Naming the visible input instead would submit the formatted display string — `1 234,5` — which is
a locale-dependent payload no server should have to parse.

## Considered options

- **A raw-string passthrough**, `value?: string` spread onto a native input, like `TextField`.
  Keeps the package's convention intact, adds no state, and leaves parsing to the caller. Rejected
  because it moves the whole of the decision onto every caller: each one would have to parse
  against the user's locale, format for display, decide when a half-typed string is a number, and
  get the spinbutton ARIA right. Locale-aware numeric semantics are not a thin wrapper, and a
  component that pretends otherwise is a `TextField` with a misleading name.
- **Per-keystroke filtering, or a per-keystroke `onChange`.** Rejected because it fights the input
  it is meant to accept. A grouping separator, a lone decimal separator, a leading minus and a
  trailing zero are all legal states of a number being typed, and a filter strict enough to be
  useful rejects them while a filter loose enough to permit them rejects nothing. It also
  contradicts the commit boundary: a caller receiving a value per keystroke has no way to know
  which one the user meant.
- **An opt-in `wheel` prop.** Rejected on the same grounds as wheel scrolling itself — an opt-in
  defect is still the defect, and the prop's existence invites a caller to turn it on for the one
  screen where it seems convenient.
- **A `locale` prop.** Rejected as out of scope. It is the first piece of an i18n layer this
  package does not have, and adding it here fixes the locale of one control while every label,
  date and currency around it still follows the runtime. When that layer arrives it decides how
  locale reaches components, and this component follows it.
- **Clamping a typed out-of-range value on blur.** Consistent with stepping, and the field is
  never left holding an invalid number. Rejected because it discards what the user typed without
  telling them, and the thing it discards is usually the evidence that something upstream is
  wrong.
- **Substituting `undefined` for an out-of-range typed value.** Rejected for the same reason and
  one more: it reports "no value" for a field that visibly has one.
- **Syncing the controlled `value` even while focused**, the straightforward controlled-component
  reading. Rejected because it stomps on an in-progress edit — see above.
- **`requestSubmit()` on Enter**, with `preventDefault()` to avoid a double submit. Rejected
  because it submits forms the platform would not: a form with two text fields and no submit
  button has no implicit submission, and calling `requestSubmit()` gives it one. Preserving native
  behaviour and ordering the flush around it costs one `flushSync` and changes nothing the user
  can observe.
- **Naming the visible input and formatting the value canonically in the box.** Rejected because
  it gives up the locale-aware display that is the point of the component.
