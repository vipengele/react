# SegmentedControl is separate from Tabs

A `SegmentedControl` is a value picker: a row of mutually exclusive segments, one selected, and
choosing a segment changes a value. `Tabs` is a panel switcher: a row of tabs, one selected, and
choosing a tab changes which panel is shown. Both draw a row of adjacent buttons with one
highlighted, which is why one reads as a variant of the other, and why this ADR exists. A
`SegmentedControl` is never a `Tabs` variant, a `Tabs` with a prop turned off, or a `Tabs`
composed without its panels.

## The test

If choosing a segment sets a value, it is a `SegmentedControl`. If choosing it reveals a panel, it
is `Tabs`.

- "Grid | List | Map" above a collection changes how the collection renders, and the choice may
  be submitted with a form. It is a `SegmentedControl`.
- "Overview | Activity | Settings" over three regions of content is `Tabs`.

## Why `Tabs` cannot carry it

- **Roles.** `Tabs` is `tablist` → `tab` → `tabpanel`, with `aria-controls` and
  `aria-labelledby` tying each tab to the panel it owns. A segmented control owns no panel, so
  every `aria-controls` would point at nothing. Its semantics are `radiogroup` → `radio`: one
  value out of several.
- **Form participation.** A tab is not a form control and submits nothing. Each segment is a
  native `<input type="radio">` sharing one `name`, so the control submits its value with a form
  and resets with it, with no hidden input to keep in sync.
- **Keyboard.** `Tabs` hand-writes a roving tabindex, automatic activation and `Home`/`End`.
  Native radios sharing a `name` give the group a single tab stop and arrow-key movement in the
  browser, so the segmented control carries no keyboard code.
- **Ownership.** `Tabs` mounts the selected panel and unmounts the rest, and its compound
  children and context exist to pair tabs with panels. A control with no panels has nothing for
  that machinery to do.

## Settled design points

- **It does not compose `RadioGroup` or `RadioButton`.** `RadioButton` draws a visible dot, and
  composing it would hide that dot and pull its stylesheet into the bundle of every consumer of
  `SegmentedControl`. The segment renders its own visually hidden `<input type="radio">`.
- **One `options` array, not compound children or context.** The segments are a flat list of
  values and labels; there is no per-segment content that needs children, and no state that a
  context would carry between parts.
- **Non-string labels require a per-option `aria-label`.** The option type is a union following
  `Tag`'s: a string `label` names the radio by itself, and any other label (an element, an icon
  alone, nothing) makes `aria-label` required.
- **The selected fill belongs to the segment.** The stylesheet paints it with
  `:has(> :checked)` on each segment. There is no sliding thumb, no measurement of segment widths
  and no inline custom property, so the control needs no layout effect and keeps colour-mode
  adaptation, which an inline theme property would defeat.

## Considered options

- **A `Tabs` variant** (`<Tabs variant="segmented">`, with panels optional) — rejected: it
  needs a second role set (`radiogroup` rather than `tablist`), a second keyboard model, and form
  participation that a tab has no place for, which leaves nothing of the component shared except
  the look. Every `Tabs` consumer would also carry the props and types of a mode they never use.
- **Composing `RadioGroup` and `RadioButton`** — rejected for the dot and the stylesheet cost
  described above.
- **A sliding selection thumb** — rejected: it needs the selected segment's measured offset and
  width written back as inline properties, and a resize observer to keep them true.
