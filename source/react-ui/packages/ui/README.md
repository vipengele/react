# @vipengele/react-ui

Vipengele's themeable React component library. Components read theme exclusively through
`--vpg-*` CSS custom properties set by `@vipengele/react-tokens`' `ThemeProvider` — there is no
`useTheme()` hook (see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`).

```tsx
import { Spinner } from "@vipengele/react-ui";

<Spinner size="md" />;
```

## Tree-shaking

Components are plain named exports — never a namespace barrel — so a consumer importing one
component pulls in only that component and its stylesheet.

## Styling

Each component ships its styles as a string injected through React 19's
`<style href precedence>`, not as a `.css` import: a stylesheet import is the module side effect
that `"sideEffects": false` would have to carve an exception for. React hoists and de-duplicates
by `href`, so N instances inject one stylesheet.

Theme properties are only ever *read* through `var()` in those stylesheets, never assigned as an
inline style. An inline declaration beats any stylesheet rule for the same property on the same
element, so an inline `--vpg-*` value would permanently shadow `ThemeProvider`'s dark-mode
reassignment and that instance would stop adapting to colour mode.

## Components

### `Spinner`

An indeterminate loading indicator. Sizes `sm | md | lg` (steps of the icon scale — a spinner is
glyph-sized), stroked in `var(--vpg-accent)`, rotated by a CSS
`@keyframes` rule that slows under `prefers-reduced-motion: reduce`. Exposes `role="status"` with
a `label` (default `"Loading"`) as its accessible name.

`color` sets an inline stroke override. It is an opt-in escape hatch for a spinner sitting on a
ground the theme doesn't know about: that instance no longer adapts to light/dark.

### `Button`

The library's action atom. `variant` is `primary | secondary | ghost | danger`, `size` is
`sm | md | lg` — the same scale as `Spinner`, so a `loading` button holds its height when its
content is swapped for an inline `<Spinner size={size} color="currentColor" />`. `disabled` and
`loading` both disable interaction; `loading` additionally sets `aria-busy`.

`leadingIcon` and `trailingIcon` take the icon component itself — `<Button leadingIcon={Plus} />`
— never a name, so a bundler only ever sees icons actually referenced. Passing `iconOnly` renders
the button with no visible label, in which case `aria-label` is required rather than optional: it
is the button's only accessible name.

### `Typography`

The library's text atom. `variant` is `display | h1 | h2 | h3 | h4 | body-lg | body-md |
body-sm | caption`, `weight` is `regular | medium | bold`, and `color` is a curated set of
`--vpg-*` ink tokens — `primary | secondary | subtle | accent` — not an arbitrary CSS colour,
so text always tracks light/dark mode.

`variant` also chooses the rendered HTML element (`display`/`h1`–`h4` render their matching
heading tag, `body-*` renders `<p>`, `caption` renders `<span>`). `as` overrides only the tag,
never the visual style, so a heading-styled label can render as a `<div>` where an `<h1>` would
break the document outline.

### `ButtonGroup`

Groups plain `<Button>` children into a single attached control. `orientation` is
`horizontal | vertical`. Children render unmodified — no `cloneElement`, no context — the
segmented look comes entirely from `ButtonGroup`'s own stylesheet targeting `.vpg-button` as
a descendant.

### `Avatar`

The library's person atom: an image, the person's initials, or a generic person glyph, in that
order of preference, framed as a `circle` or `square` (`shape`) at size `sm | md | lg | xl`.

`src` is the image to render; a failed load falls through to initials, then to the icon, so a
dead URL degrades instead of leaving a blank frame. `name` is the source of the initials — the
first character of the first word plus the first character of the last word, upper-cased — and
the accessible name unless `alt` overrides it.

### `Badge`

A static, non-interactive status or category mark, rendered as a `<span>`. A removable or
clickable mark is not this component.

| Prop       | Type                              | Default    |
| ---------- | --------------------------------- | ---------- |
| `variant`  | `neutral \| accent \| danger`     | `neutral`  |
| `emphasis` | `subtle \| solid`                 | `subtle`   |
| `size`     | `sm \| md`                        | `md`       |
| `icon`     | `ReactNode`                       | —          |

`subtle` sits on a tinted wash with ink-coloured text; `solid` fills with the variant's own colour
and its contrast ink. `icon` is a leading slot, hidden from assistive technology so the label alone
is announced; an icon drawn in `currentColor` takes the variant's text colour. The slot sizes its
content from the badge's `size` step, so a `size` prop on the icon itself has no effect. `ref` is a plain
prop, `className` is merged with the component's own classes, and every other `<span>` prop is
passed through.

```tsx
<Badge variant="danger" emphasis="solid" icon={<Icon icon={AlertCircle} />}>
  Overdue
</Badge>
```

### `Tag`

A `Badge` the user can remove: the same `variant`, `emphasis`, `size` and `icon`, followed by a
remove button.

| Prop          | Type         | Default                          |
| ------------- | ------------ | -------------------------------- |
| `onRemove`    | `() => void` | required                         |
| `removeLabel` | `string`     | `Remove ${children}` (see below) |

`onRemove` is called once per activation of the remove button. The tag does not remove itself: the
caller unmounts it. `removeLabel` is the remove button's accessible name. It defaults to
`Remove ${children}` only when `children` is a string; any other children — an element, a
fragment, a number — carry no text the tag can safely quote, so `removeLabel` is then required.

The remove button is the tag's only focusable element, and the tag handles no keys of its own:
Backspace and Delete do nothing on it. The tag does not manage focus either — when `onRemove`
unmounts it, where focus goes next is the caller's job.

```tsx
<Tag variant="accent" icon={<Icon icon={AlertCircle} />} onRemove={() => removeTopic(id)}>
  Design
</Tag>
```

### `Skeleton`

A shimmering placeholder shaped to match the content it stands in for: `variant` is
`rect | circle | text`. `width`/`height` accept a number (treated as pixels) or a string
carrying its own unit; left unset, the variant's own stylesheet rule sizes it. Decorative by
construction — it renders with `aria-hidden="true"` and never reaches the accessibility tree.

### `Card`

A structured content surface: `Card`, `Card.Header`, `Card.Content` (required), and
`Card.Footer`. At most one of each subcomponent is allowed among `Card`'s children — anything
else, including an arbitrary child or a second `Card.Header`, throws at render. Layout is
CSS-driven (`order` in a flex column), so the three subcomponents render header-above-content-
above-footer regardless of the order they're written in JSX.

Passing `onClick` makes the whole card interactive: it renders as `<div role="button"
tabIndex={0}>` with `Enter`/`Space` activating it, not as a native `<button>` — a `<button>`'s
content model forbids interactive content, and `Card.Footer`'s canonical content is a `<Button>`.

### `Table`

A presentational data table: `Table`, `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`,
`Table.HeaderCell` and `Table.Cell`. Each part renders its native element (`<table>`, `<thead>`,
`<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`) and passes `ref` and native props through. The
`<table>` sits inside a scroll container, so a table wider or taller than its space scrolls rather
than overflowing the page. `className` and `style` go to that container; `ref` and every other
prop go to the `<table>`.

- `caption` renders the table's `<caption>`. It also makes the scroll container a labelled,
  focusable region, so a keyboard user can scroll an overflowing table: give every scrollable
  table a caption.
- `density` is `compact`, `regular` (default) or `relaxed`, and sets cell padding from the space
  scale.
- `stickyHeader` pins `Table.Head` to the top of the container while the body scrolls under it.
  It needs a bounded block size on the container, set through `style`, `className` or the layout
  around it; without one nothing scrolls vertically and there is nothing to pin against.
- `align` on `Table.HeaderCell` and `Table.Cell` is `start` (default), `center` or `end`.
  `Table.HeaderCell` defaults `scope` to `"col"`; pass `scope="row"` for a row header.

The table has no sorting and no row selection; it renders the rows it is given.

### `StatePanel`

A centred panel explaining why a region has nothing to show. `variant` is
`empty | error | not-found` and defaults to `empty`. Copy is always supplied by the caller: `title`
is required, `description` is optional, and neither has a built-in default text.

`titleAs` sets the element the title renders as (`h1`–`h6`, `p` or `div`, default `h2`) without
changing its visual style. `media` is the artwork slot: `undefined` renders the variant's own
illustration, `null` renders no media at all, and any other node renders as given and replaces
the illustration. The slot does not size its content, so size an icon or image at the call site.
`children` is the actions area, rendered after the text. `className` and the remaining `div`
attributes land on the root element.

Each variant's illustration is decorative inline SVG that reads the theme's role tokens, so it
follows the seed and the colour mode. It is `aria-hidden`, and it is not part of the package's
public surface.

The `error` variant wraps the title and description in `role="alert"`, so assistive technology
announces them when the panel appears.

```tsx
import { Button, StatePanel } from "@vipengele/react-ui";
import { Icon, Search } from "@vipengele/react-icons";

<StatePanel
  variant="not-found"
  title="No results"
  description="Try a different search term."
  media={<Icon icon={Search} size={48} />}
>
  <Button variant="secondary" onClick={clearSearch}>
    Clear search
  </Button>
</StatePanel>;
```

### `FormField`

Labels exactly one focusable control — `label`/`hint`/`error`/`children`, flat props rather than
a compound component. `children` is a native input, `Toggle`, `RadioButton`, or `Dropdown`'s
trigger — a single element whose component forwards unknown props to its focusable root. Not a
group-shaped component like `RadioGroup`, which gets its accessible name from its own
`aria-label` instead.

`FormField` generates ids via `useId` and clones onto the child: `id` (the child's own `id` wins
if it already has one), `aria-describedby` (built from whichever of `hint`/`error` render, merged
with any `aria-describedby` the child already carries rather than overwritten), `aria-invalid`
(set when `error` is non-empty), and `aria-labelledby` — applied unconditionally, regardless of
what element the child renders as. `<label htmlFor>` only associates with labelable elements
(`input`/`select`/`textarea`/`button`/`meter`/`output`/`progress`), so a non-labelable trigger
(`Dropdown`'s `<div role="combobox">`) would otherwise get no accessible name at all;
`aria-labelledby` works on both, so every control gets it uniformly.

`children` that isn't a single valid element — text, an array, a `Fragment`, `null` — throws:
there's no single node to attach the label and description to.

```tsx
<FormField label="Email" hint="We never share this" error={errors.email}>
  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</FormField>
```

### `FieldSet`

A native `<fieldset>` + `<legend>` pair grouping related controls — typically one or more
`FormField`s, though it isn't restricted to them. It stacks its `children` one per line,
separated by a fixed spacing step, whatever each child's own `display` is: an inline child
(a bare `<span>`, an inline-level control) takes its own line the same as a block-level field
does. It carries no form-state logic of its own, purely layout: `legend` renders in the native
`<legend>`, which names the `<fieldset>` automatically with no id/aria wiring needed. `disabled`
forwards straight to the native `<fieldset>`, which disables every descendant form control for
free.

A `<legend>` naming its `<fieldset>` doesn't extend to a `role="radiogroup"` element nested
inside it, which is why `RadioGroup` carries its own `aria-label` rather than relying on an
ancestor `FieldSet`'s legend.

```tsx
<FieldSet legend="Shipping address">
  <FormField label="Street">
    <input />
  </FormField>
  <FormField label="City">
    <input />
  </FormField>
</FieldSet>
```

A `FieldSet` also groups `Checkbox`es, each carrying its own label. A labelled row takes its own
line like every other field, so the `FieldSet` spaces consecutive rows:

```tsx
<FieldSet legend="Notifications">
  <Checkbox label="Email" name="channels" value="email" />
  <Checkbox label="SMS" name="channels" value="sms" />
</FieldSet>
```

### `Stack`

The library's vertical layout primitive: its children in a column, `gap` apart. It draws nothing
of its own.

| Prop      | Values                                                                          | Default     |
| --------- | ------------------------------------------------------------------------------- | ----------- |
| `gap`     | `none` or a spacing-scale step name, `space-1` to `space-8`                      | `"space-4"` |
| `align`   | `start \| center \| end \| stretch \| baseline`                                  | `"stretch"` |
| `justify` | `start \| center \| end \| between`                                              | `"start"`   |
| `as`      | any element type, so a stack of list items can be a `<ul>`                       | `"div"`     |

`gap` takes only a spacing-scale token name or `none` — never a length, so `gap="space-3"` is
valid and `gap={13}` is a type error. A name outside the scale, cast past the type, resolves to
the default step. The `SpaceToken` type is exported for typing a `gap` value held in a variable
or a prop. `ref` reaches the rendered element, and `style` is spread after the stack's own
properties, so it wins.

```tsx
<Stack gap="space-2" as="ul">
  <li>First</li>
  <li>Second</li>
</Stack>
```

### `Inline`

The library's horizontal layout primitive: its children in a row, `gap` apart, wrapping onto
further lines unless `wrap` is `false`. It draws nothing of its own.

| Prop      | Values                                                                          | Default     |
| --------- | ------------------------------------------------------------------------------- | ----------- |
| `gap`     | `none` or a spacing-scale step name, `space-1` to `space-8`                      | `"space-4"` |
| `align`   | `start \| center \| end \| stretch \| baseline`                                  | `"stretch"` |
| `justify` | `start \| center \| end \| between`                                              | `"start"`   |
| `wrap`    | `true` to continue overflowing children on a new line, `false` to keep one row   | `true`      |
| `as`      | any element type, so a row of list items can be a `<ul>`                         | `"div"`     |

`gap` follows `Stack`'s rule: a spacing-scale token name or `none`, never a length, and it spaces
both the children along a row and the wrapped lines from one another. `ref` reaches the rendered
element, and `style` is spread after the row's own properties, so it wins.

```tsx
<Inline justify="end" gap="space-2">
  <Button variant="ghost">Cancel</Button>
  <Button>Save</Button>
</Inline>
```

### `Center`

The library's page-shell layout primitive: it caps its content at a width, centres it with auto
inline margins and keeps it `inset` off its container's inline edges. It draws nothing of its own.

| Prop        | Values                                                                      | Default     |
| ----------- | --------------------------------------------------------------------------- | ----------- |
| `max`       | a step of the width scale, `sm \| md \| lg \| xl`                            | `"lg"`      |
| `inset`     | `none` or a spacing-scale step name, `space-1` to `space-8`                 | `"space-4"` |
| `intrinsic` | centres each child at its own width rather than stretching it to the cap    | `false`     |
| `as`        | any element type, so a page's main content can be a `<main>`                | `"div"`     |

`Center` is `border-box`: `max` is the outer width, `inset` included. Changing `inset` moves the
content's edges inward without making the page wider, and two centres with the same `max` line up
on their outer edges. `inset` pads the inline axis only. `ref` reaches the rendered element, and
`style` and `className` pass through, `style` winning over the centre's own properties.

```tsx
<Center as="main" max="md" inset="space-6">
  <Article />
</Center>
```

`max` reads `--vpg-width-*` from `@vipengele/react-tokens`, with no literal fallback. A theme
without those properties — `@vipengele/react-ui` upgraded while `@vipengele/react-tokens` is
not, so the tokens version must be one that emits the width scale — leaves every `Center` with no
maximum width, silently: a bare `var()` in `max-width` is invalid at computed-value time.

### `Progress`

A linear progress bar. `size` is `sm | md | lg`. Given a `value` (against `max`, default `100`),
it renders determinate — the fill's width tracks the percentage, and `role="progressbar"` carries
`aria-valuenow`/`-valuemin`/`-valuemax`; a `value` outside `[0, max]` is clamped rather than
over- or under-filling the track. Omitting `value` renders indeterminate instead: a looping
sweep with no `aria-value*` attributes, since a progress bar with no known value has nothing to
report as a percentage. The sweep slows rather than stops under `prefers-reduced-motion: reduce`.

### `Tabs`

A tabbed interface: `Tabs`, `Tabs.List`, `Tabs.Tab`, and `Tabs.Panel`. Each `Tabs.Tab` is paired
with the `Tabs.Panel` carrying the same `value`; the `id`/`aria-controls`/`aria-labelledby` wiring
between them is generated with `useId`, so no DOM ids need supplying. Selection is controlled
through `value`/`onChange`, or left to `Tabs` itself — seeded by `defaultValue`, falling back to
the first `Tabs.Tab` in `children`.

The list follows the WAI-ARIA tabs pattern: a roving tabindex (the selected tab is the list's only
tab stop), automatic activation — an arrow key moves focus and selects in one step — wrap-around
at both ends, and `Home`/`End` jumping to the first/last tab. `orientation` is `horizontal` (the
default, Left/Right) or `vertical` (Up/Down); the off-axis arrow pair is left unhandled. A tab
with `disabled` is skipped by keyboard traversal entirely and cannot be clicked.

Only the selected panel is mounted — the others render nothing rather than staying in the DOM
hidden, so a panel's internal state does not survive a switch away from it.

### `TextField`

A styled native `<input>` for free-text entry (`type` defaults to `"text"`; pass `"email"`,
`"password"`, etc. for any other native input type). Forwards every other `<input>` prop as-is.
Reads the same border/radius/surface tokens `Dropdown`'s trigger reads, and the same
`aria-invalid` styling hook, so a text field and a dropdown trigger read as the same kind of
control side by side in a form.

### `NumberInput`

A locale-aware numeric field — `<input type="text" inputMode="decimal">` under the hood, not a
wrapper around `<input type="number">` (see
`docs/adr/0020-numberinput-owns-spinbutton-semantics-and-locale-parsing.md`).
The box shows what the user is typing, in their own locale and possibly mid-number; `onChange`
fires only on commit — blur, `Enter`, or a step — with the parsed `number | undefined`, never per
keystroke. `min`/`max` bound stepping and are reported as `aria-valuemin`/`aria-valuemax`; a typed
value outside them commits as typed and is flagged through `aria-invalid` instead. `step` sets
the amount an arrow key or a stepper button moves by, and its own decimal precision is what a step
rounds its result to.

`leading` and `trailing` are adornment slots forwarded to the `FieldShell` this component composes,
the same as `TextField`'s. `steppers` renders visible increment/decrement buttons in the trailing
slot, after any adornment of the caller's own — stepping by arrow key needs none of them, so they
are an opt-in affordance rather than the default. A hidden `<input type="hidden">` carries the
unformatted value under `name`, so a form submission never has to parse a locale-formatted string.

```tsx
<NumberInput aria-label="Quantity" min={0} max={99} step={1} steppers />
```

### `Toggle`

A native `<input type="checkbox" role="switch">` styled as a switch. It forwards every
`<input>` prop except `type`/`role`, so `checked`/`onChange` (controlled) or `defaultChecked`
(uncontrolled), `disabled`, and `aria-label`/`aria-labelledby` all work exactly as they do on a
plain checkbox. No custom keyboard handling and no hand-set `aria-checked`: the native element
already exposes its checked state through the DOM, handles focus and keyboard interaction, and
participates in forms for free.

### `Checkbox`

A native `<input type="checkbox">` styled as a box. It forwards every `<input>` prop except
`type`, so `checked`/`onChange` (controlled) or `defaultChecked` (uncontrolled), `name`, `value`
and `disabled` work as they do on a plain checkbox. No custom keyboard handling and no hand-set
`aria-checked`: the native element already exposes its state and participates in forms.

`label` renders the text inside a wrapping `<label>`, so the whole row is a pointer target.
Without it the bare `<input>` is rendered and needs an `aria-label` or an outer `<label>`.

`indeterminate` draws the third, mixed state for a box summarising a partially selected group. It
is a DOM property with no HTML attribute behind it, re-applied on every render because a click
clears it. It is announced natively as mixed, so no `aria-checked` is set by hand, and it never
reaches the markup or the submitted value. `ref` is a plain prop pointing at the `<input>`.

A `Checkbox` carries its own label, so it is not wrapped in a `FormField`. Grouping is a
`FieldSet`; there is no `CheckboxGroup`. A labelled row is block-level like every other field,
sized to its content so only the box and its text are the pointer target.

```tsx
<Checkbox
  label="Select all"
  checked={all}
  indeterminate={some && !all}
  onChange={(e) => setAll(e.target.checked)}
/>
```

### `RadioButton` / `RadioGroup`

`RadioButton` is a single styled native `<input type="radio">`. It forwards every `<input>` prop
except `type`, and is usable entirely on its own outside any `RadioGroup` — pass `name`,
`checked`/`onChange` (controlled) or `defaultChecked` (uncontrolled), and `value` manually, the
same as a plain radio input. No custom keyboard or roving-tabindex code: native radios sharing a
`name` get browser-native grouping and arrow-key behavior for free.

### `Slider`

A native `<input type="range">` styled as a single-thumb slider. It forwards every `<input>`
prop except `type`, so `min`/`max`/`step`, `value`/`onChange` (controlled) or `defaultValue`
(uncontrolled), and `disabled` all work exactly as they do on a plain range input. No custom
keyboard or pointer handling: the native element already handles arrow-key stepping, dragging,
touch, and form participation for free. Two-thumb range selection is out of scope.

`RadioGroup` is a context provider grouping `RadioButton`s: `role="radiogroup"` on its own
wrapper, with an `aria-label` for its accessible name — independent of any ancestor `FieldSet`,
since a `<legend>` doesn't automatically name a nested `role="radiogroup"` element the way it
names the `<fieldset>` itself. Selection is controlled through `value`/`onChange`, or left to
`RadioGroup` itself, seeded by `defaultValue` — the same duality as `Tabs`. A shared `name` is
auto-generated with `useId` when not given explicitly, and every child `RadioButton` reads its
`name`, checked state, and change handler from context; an explicit `checked`/`onChange` on a
`RadioButton` still overrides what the group would otherwise provide.

```tsx
<RadioGroup aria-label="Size" defaultValue="medium">
  <RadioButton aria-label="Small" value="small" />
  <RadioButton aria-label="Medium" value="medium" />
  <RadioButton aria-label="Large" value="large" />
</RadioGroup>
```

### `FileInput`

A native `<input type="file" multiple>` the component drives, with a drag-and-drop zone as an
enhancement. Every picked or dropped file becomes a row with its own `Progress` and starts
uploading at once through `upload`. The component picks no transport: `upload` is yours.

| Prop       | Type                                        | Default  |
| ---------- | ------------------------------------------- | -------- |
| `upload`   | `(file, { onProgress, signal }) => Promise` | required |
| `accept`   | `string`                                    | —        |
| `multiple` | `boolean`                                   | `true`   |
| `maxSize`  | `number` (bytes)                            | —        |
| `maxFiles` | `number`                                    | —        |
| `onChange` | `(entries) => void`                         | —        |
| `onReject` | `(rejected) => void`                        | —        |

`upload` resolving marks the row done and stores the value as its `result`; rejecting marks it
failed, showing the error's message. `onProgress(fraction)` takes 0 to 1 and never moves a row
backwards; a function that never calls it leaves the row's `Progress` indeterminate. `signal` is
aborted when the row is removed or the component unmounts, and a settlement that arrives after
either is dropped, so a transport that ignores the signal is still safe.

The list is uncontrolled: there is no `value` or `defaultValue`. Picks and drops append, and
`onChange` receives every row after an add, a status change or a removal — not per progress tick.
Each entry is `{ id, file, status, progress, … }`, where `status` is
`rejected | uploading | done | failed`, a `done` entry carries `result`, a `failed` one `error`,
and a `rejected` one `reason` (`type | size | count | directory`). `id` is per row, so the same
file picked twice is two rows.

`accept` takes the native grammar (extensions, MIME types, wildcards) and applies to dropped files
as well as picked ones. A file failing `accept`, `maxSize` or `maxFiles` — which counts rows that
are uploading or done — never uploads: it becomes a `rejected` row and is reported through
`onChange` and `onReject`. With `multiple={false}`, an add of several files takes the first and
rejects the rest. A dropped folder is rejected.

The input never submits with a form: the props type omits `name`, `form`, `required` and `type`.
The form value is whatever you store from the upload results.

Every user-visible string is a prop with an English default: `prompt`, `removeLabel(fileName)`
(`Remove ${fileName}`), `uploadingMessage`, `doneMessage`, `failedMessage(error)`,
`rejectionMessages` (a partial record keyed by reason), `doneAnnouncement(fileName)` and
`failedAnnouncement(fileName, error)`.

The native input is the keyboard and assistive-technology path to the picker, and it is the
element `ref`, the remaining `<input>` props and `FormField`'s cloned `id` and `aria-*` props land
on; `className` is merged onto the zone. A live region announces each row that finishes or fails,
each row shows its status in text as well as colour, and the remove button is named
`Remove <file name>`; removing a row returns focus to the input.

```tsx
<FormField label="Attachments" hint="PDF or images, up to 5 MB each">
  <FileInput
    accept=".pdf,image/*"
    maxSize={5_000_000}
    upload={(file, { onProgress, signal }) => send(file, onProgress, signal)}
    onChange={(entries) =>
      setAttachments(entries.flatMap((e) => (e.status === "done" ? [e.result] : [])))
    }
  />
</FormField>
```

### `Tooltip`

A small floating label describing its trigger. `content` is what the bubble shows, `children` is
the trigger, and `placement` (`top | bottom | left | right`, default `top`) is the preferred side —
the bubble flips to the opposite side when it wouldn't fit there and shifts to stay on-screen.

The trigger is wrapped in an inline `<span>` carrying the ref and the hover/focus handlers, never
cloned, so it can be any node — including a component that forwards neither a ref nor unknown
props. The bubble appears on hover and on keyboard focus, and is dismissed by moving away, by
blurring the trigger, or by `Escape`. It carries `role="tooltip"` and is wired to the trigger with
`aria-describedby` while open.

`disabled` suppresses the tooltip outright: no handler is registered and the bubble never renders.
It lives on `Tooltip` rather than being read off the trigger, because the trigger's props are
never inspected.

The bubble portals into the nearest ancestor `.vpg-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--vpg-*` value. On a page with no
`.vpg-root` ancestor it renders inline beside the trigger instead, positioned identically but
inheriting whatever theme surrounds it. A tooltip opened from inside a modal surface portals into
that surface, so it stays visible and reachable. It stacks above every other overlay, and its
`Escape` dismissal bubbles, so a tooltip never blocks the popover or listbox it sits in from
closing.

### `Popover`

A floating panel of interactive content. `content` is what the panel holds, `children` is the
trigger, and `placement` (`top | bottom | left | right`, default `bottom`) is the preferred side —
the panel flips to the opposite side when it wouldn't fit there and shifts to stay on-screen.

The trigger is wrapped in an inline `<span>` carrying the ref and the click handler, never cloned,
so it can be any node. Clicking it opens the panel; clicking it again, pressing outside, or
pressing `Escape` closes it. The wrapper carries `aria-haspopup="dialog"` and an `aria-expanded`
that tracks the panel, which itself is a `role="dialog"`.

Open state is either controlled through `open`/`onOpenChange` or left to `Popover` itself, seeded
by `defaultOpen`. `onOpenChange` fires for every open/close request in both forms. `content` is a
plain node rather than a render prop taking a `close` callback: content that has to close the
popover itself belongs in the controlled form, where the consumer already owns the state.

While the panel is open, focus is trapped inside it and the rest of the page is hidden from
assistive technology; closing it returns focus to the trigger. The panel holds real interactive
content, so keyboard users must be able to reach it and must not fall out the back of it.

The panel portals into the nearest ancestor `.vpg-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--vpg-*` value. On a page with no
`.vpg-root` ancestor it renders inline beside the trigger instead, positioned identically but
inheriting whatever theme surrounds it. A popover opened from inside a modal surface portals into
that surface.

Overlays opened from inside the panel, such as a `Dropdown` listbox, nest with it. `Escape`
closes only the innermost open overlay, a press inside the panel closes only the overlay opened
from it, and a press outside closes the whole chain. The panel stacks below a listbox and a
tooltip, so those draw over it.

### `Menu` / `MenuButton`

A list of actions opened from a trigger whose own content never changes. A control that shows its
chosen value is a `Dropdown` instead — see
`docs/adr/0026-menu-and-dropdown-are-separate-components.md`. `trigger` is the control that opens
the menu, and `children` are the rows: `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioItem`,
`Menu.Separator` and `Menu.Group`, optionally inside fragments. Any other child throws at render,
naming the offender. Submenus are not supported.

```tsx
<Menu trigger={<Button>Actions</Button>}>
  <Menu.Item onSelect={rename}>Rename</Menu.Item>
  <Menu.Separator />
  <Menu.Item onSelect={remove} disabled>Delete</Menu.Item>
</Menu>
```

`MenuButton` is a `Menu` whose trigger is a `Button`: `label` is the button's content, `variant`,
`size`, `disabled`, `leadingIcon` and `trailingIcon` pass to the `Button`, and every `Menu` prop
other than `trigger` passes straight through.

The trigger is wrapped in an inline `<span>` carrying the ref and the click handler. When it is a
single element it is additionally cloned with `aria-haspopup`, `aria-expanded` and `aria-controls`
so assistive tech operating the actual control gets its menu semantics; the panel is a
`role="menu"`. Open state is either controlled through `open`/`onOpenChange` or left to `Menu`
itself, seeded by `defaultOpen`. `onOpenChange` fires for every open/close request in both forms.
`className` applies to the panel.

| Row | Props | Behaviour |
| --- | --- | --- |
| `Menu.Item` | `onSelect`, `disabled`, `leadingIcon`, `shortcut` | `role="menuitem"`. Fires `onSelect`, then closes the menu. |
| `Menu.CheckboxItem` | `checked`, `onCheckedChange`, `disabled`, `leadingIcon`, `shortcut` | `role="menuitemcheckbox"`. Reports `!checked` and leaves the menu open. |
| `Menu.RadioItem` | `value`, `disabled`, `leadingIcon`, `shortcut` | `role="menuitemradio"`. Checked while the enclosing group's `value` equals its own; reports through the group's `onValueChange` and closes the menu. |
| `Menu.Group` | `label`, `value`, `onValueChange` | A `role="group"` named by its visible `label`. Owns the checked value of its radio rows. |
| `Menu.Separator` | none | A rule between rows. |

The caller owns checked state: `checked` and the group's `value` are shown as given and are never
reflected on the trigger. `leadingIcon` is decorative and hidden from assistive tech. `shortcut`
is display only — the menu binds no key to it. A `disabled` row stays focusable, so arrow keys and
typeahead still stop on it, but activating it fires nothing and does not close the menu.
`Menu.RadioItem` throws outside a `Menu.Group`, every row throws outside a `Menu`, and groups do not
nest.

Focus moves onto the rows themselves, one of which holds the only tab stop. Clicking the trigger,
or pressing `Enter`, `Space` or `ArrowDown` on it, opens the menu on the first row; `ArrowUp`
opens it on the last. `ArrowDown`/`ArrowUp` move between rows and wrap at either end, `Home` and
`End` jump to the first and last, and typing a row's leading characters jumps to the match.
`Enter` or `Space` activates the focused row; while a typeahead string is being typed, `Space`
extends the string instead. Separators and group labels are not stops.

The menu closes on an outside press, on `Escape`, on clicking the trigger again, or on activating a
`Menu.Item` or `Menu.RadioItem`; focus returns to the trigger. Focus leaving the panel also closes
it.

The panel portals into the nearest ancestor `.vpg-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--vpg-*` value; with no `.vpg-root`
ancestor it renders inline beside the trigger. A menu opened from inside a modal surface portals
into that surface. It stacks at `--vpg-layer-menu`, above a popover's panel and below a tooltip.
A menu opened from inside a popover's panel nests with it: `Escape` closes only the menu, and a
press outside closes both.

### `Dropdown`

A select-only combobox: `Dropdown` and `Dropdown.Option` children directly beneath it, with no
list layer — the floating listbox's positioning is `Dropdown`'s own business. The field fills its
container's width, the way `TextField` does, rather than shrinking to fit its selection — it never
widens as options are selected. Each
`Dropdown.Option` takes a `value`, a `label` (the string shown in the trigger, in its chip, matched
by the search query, and — with `searchable={false}` — by type-ahead on the trigger), an optional
leading `icon`, and `disabled`. A child that is neither a
`Dropdown.Option`, a `Dropdown.Group` nor falsy throws at render; falsy children — what `condition
&& <Dropdown.Option />` produces — are skipped.

A selection is a `DropdownValue` — `{ value, label, icon? }`, or `null` for none — controlled
through `value`/`onChange` or left to `Dropdown` itself, seeded by `defaultValue`. `multiple`
switches all three to arrays: each option gains a checkbox, each selected value a removable chip
beside the trigger, and selecting toggles the option without closing the listbox. `onChange` hands
back the whole object of the option that was picked — `(value: DropdownValue | null) => void` in
single-select, where `null` is the emptied selection, and `(value: DropdownValue[]) => void` in
`multiple`, where the empty array is.

The `value` string is the identity, so a consumer that re-creates its value object on every render
keeps its selection. A `Dropdown.Option` carrying that `value` supplies the label and icon that
render; the value object's own are the fallback for a selection no option matches.

```tsx
<Dropdown defaultValue={{ value: "medium", label: "Medium" }} onChange={(size) => setSize(size)}>
  <Dropdown.Option value="small" label="Small" icon={Minus} />
  <Dropdown.Option value="medium" label="Medium" />
  <Dropdown.Option value="large" label="Large" disabled />
</Dropdown>
```

`searchable` (default `true`) opens the listbox under a search row: a magnifier, an input hinted
by `searchPlaceholder` (default `"Search"`), then a divider. Typing filters the options to a
case-insensitive substring of their labels, wherever it falls in them, and a query matching none
of them says "No results" rather than leaving the panel blank. A selection the query filters out
of the list keeps its place in the trigger and its chip. `searchable={false}` renders the listbox
alone, with type-ahead on the trigger.

```tsx
<Dropdown aria-label="Assignee" searchPlaceholder="Search people">
  <Dropdown.Option value="ada" label="Ada Lovelace" icon={User} />
  <Dropdown.Option value="grace" label="Grace Hopper" icon={User} />
</Dropdown>
```

Every keystroke belongs to that search once the row exists. A printable character typed on the
closed trigger opens the popover and seeds the query with it. A pick in `multiple` mode keeps the
popover open and clears the query, so the next character searches every option again rather than
narrowing what is left of the picked option's own match. `Backspace` with no character left to
delete removes the last selection — `multiple`'s alone, since a single selection has no last
selection distinct from its only one, and `clearable` below is what empties that. The query clears as the
popover closes, so the next open starts on the full list.

#### Groups

`Dropdown.Group label` heads a run of `Dropdown.Option` children. A heading is not an option: it
takes no place in the flat list the arrow keys, `Home`/`End` and the wrap at either end travel, so
every option is reached exactly as it is with no group declared. Each group renders as a
`role="group"` named by its heading, with a separator drawn between one group and the next —
never before the first or after the last, and never declared by the consumer. A group the search
query leaves no option in renders nothing at all. A `Dropdown.Group` inside a `Dropdown.Group`
throws, as does any group child that is neither a `Dropdown.Option` nor falsy.

```tsx
<Dropdown aria-label="Fruit">
  <Dropdown.Option value="all" label="All fruit" />
  <Dropdown.Group label="Citrus">
    <Dropdown.Option value="lemon" label="Lemon" />
    <Dropdown.Option value="lime" label="Lime" />
  </Dropdown.Group>
  <Dropdown.Group label="Stone">
    <Dropdown.Option value="peach" label="Peach" />
  </Dropdown.Group>
</Dropdown>
```

An async result groups itself with a `group` string instead — see below.

The search input is a second `role="combobox"`, with `aria-autocomplete="list"`, its own
`aria-controls` on the listbox and the `aria-activedescendant` tracking the highlight; it is named
by `searchPlaceholder`, while the trigger keeps the accessible name and description. A non-modal
`FloatingFocusManager` puts real DOM focus in that input as the panel opens, and Escape, a
selection and a press outside each hand focus back to the trigger. `Enter` selects the highlighted
option; `Space` is a character in the query, not a selection key.

The trigger is a `<div role="combobox" tabIndex={0}>`, not a `<button>`: only `combobox` and a
handful of other roles may legally carry `aria-activedescendant`, and the highlighted option is
tracked virtually through exactly that attribute rather than by moving focus into the listbox.
The trigger also carries `aria-haspopup="listbox"`, `aria-expanded` and `aria-controls`, and
forwards `id`/`aria-label`/`aria-labelledby`/`aria-describedby`/`aria-invalid` — so a `Dropdown`
wrapped in a `FormField` gets its accessible name and description on the element that actually
takes focus.

Keyboard: `Enter`/`Space` opens the listbox and then selects the highlighted option (toggling it,
in `multiple`), the arrow keys move the highlight and wrap at both ends, `Home`/`End` jump to the
first/last option, `Escape` closes, and — with no search row to type into — typing a character
jumps the highlight to the next option whose label starts with it. Disabled options are skipped by
every one of those and cannot be clicked.

In `multiple` mode the chips render as siblings *before* the trigger inside a plain wrapper, never
inside it: floating-ui merges its own click and keyboard handlers into the trigger's, so a remove
button nested in there could not be reliably intercepted before those ran. The chips carry the
whole selection: the trigger beside them renders nothing once anything is selected, and is the
click target holding the chevron. The placeholder shows there while the selection is empty.

Those chips keep to one row, so a field with a selection stands at the same height as an empty
one. Which of them fit is measured against the width the field has — not capped at a number, which
would already overflow a narrow field and leave room unused in a wide one — and re-measured before
the next paint whenever that width changes. The rest give way to an indicator counting them, and a
chip too wide for the field shows with its label cut short rather than pushing the field past its
container.

The indicator standing for the rest reads "and N more" and takes no tab stop — a hidden selection
is removed by unchecking it in the listbox, since the chip carrying it is not on screen to remove
it from, so a stop there would be a stop with nothing to do. Hovering it shows the labels it
stands for in a `Tooltip`. That tooltip is the pointer's route to them; a screen reader's is the
trigger, which is described by every selection, hidden or not — and that description is *merged*
with whatever `aria-describedby` the trigger is given, so a `Dropdown` inside a `FormField` keeps
its hint and its error message alongside it rather than losing them to the selection.

`wrapChips` switches the measurement off and wraps the chips onto further rows instead, growing
the field downwards:

```tsx
<Dropdown multiple wrapChips aria-label="Fruit" defaultValue={picked} onChange={setPicked}>
  {fruit.map((name) => (
    <Dropdown.Option key={name} value={name} label={name} />
  ))}
</Dropdown>
```

`clearable` (default `false`) puts a "Clear selection" `<button>` in the field's trailing slot
while anything is selected, and takes it away again once nothing is. Pressing it empties the whole
selection at once — `onChange` reports `null` in single-select and `[]` in `multiple` — without
opening the listbox, and leaves focus on the trigger. It is an adornment rather than a control the
field reads: the focus ring it takes is its own, and the field around it stays at rest.

```tsx
<Dropdown clearable aria-label="Size" value={size} onChange={setSize}>
  <Dropdown.Option value="small" label="Small" />
  <Dropdown.Option value="large" label="Large" />
</Dropdown>
```

The listbox — the whole panel, search row included — portals into the nearest ancestor
`.vpg-root` — the subtree `ThemeProvider` establishes — rather than `document.body`, so it
keeps every `--vpg-*` value. On a page with no `.vpg-root` ancestor it renders inline
beside the trigger instead. A listbox opened from inside a modal surface portals into that
surface, and one opened from inside a `Popover` stacks above the panel and closes on its own
`Escape` or outside press without closing the panel.

#### Async data source

Pass `loadOptions` instead of `children` to back `Dropdown` with an API rather than a declared
list:

```tsx
<Dropdown
  aria-label="Country"
  placeholder="Pick a country"
  defaultValue={{ value: "jp", label: "Japan" }}
  loadOptions={(query) => fetchCountries(query)}
/>
```

`loadOptions: (query: string) => Promise<DropdownAsyncOption[]>` — each result a `{value, label,
icon?, disabled?, group?}` — is called with the search query after it settles for `debounceMs` (default
`300`), and `Dropdown` renders whatever it resolves to. Filtering the query is the API's job in
this mode: results are shown as returned, never matched again client-side. `loadingMessage`
(default `"Loading…"`) shows while a search is pending, `errorMessage` (default `"Something went
wrong."`) shows if the promise rejects, and a search that returns nothing says "No results". A
response the query has moved past is discarded rather than applied — a slow earlier search
resolving after a faster later one, and equally one resolving while the next query is still
settling. The search is keyed off the query alone, so an inline arrow like the one above, fresh on
every render, is as correct as a memoised `loadOptions`. `children` goes unread when `loadOptions`
is set.

`Dropdown` calls `loadOptions` inside the scope of the nearest enclosing `ScopeProvider` from
`@vipengele/react-telemetry` (the default scope outside any provider), so the loader can read that
provider's attributes with `Scope.current().get(...)`. Only the loader's synchronous start is in
that scope: past its first `await` a browser has no ambient scope, so read what it needs before
any `await`, or capture the scope with `useScope()` and re-enter it with `Scope.propagate`.
`Dropdown` creates no scope of its own and takes no scope prop.

A result's `group` is the heading it stands under. Results carrying the same string are one group
however far apart they arrive in the array, the groups stand in the order their first result
arrives, and every result carrying no group at all comes before them.

A selection carries its own `label`, so the trigger and a `multiple` chip render it with nothing
fetched, no search run and no option child to match against — including for a `value` or
`defaultValue` handed straight to `Dropdown`.

### `Grid` / `GridItem`

`Grid` lays its children out in columns, sized one of two ways that the types make mutually
exclusive. `columns` (a positive integer) repeats that many equal tracks. Without it the grid
auto-fits: as many tracks as its container's width allows, none narrower than `minColumnWidth` —
a step of the column-width scale, `sm | md | lg | xl`, default `md`. There are no breakpoints; one
grid shows four columns in a wide container and one in a narrow one.

`gap`, `rowGap` and `columnGap` take spacing-scale names — `"space-1"` to `"space-8"`, or
`"none"` — never a length. `gap` defaults to `"space-4"`, and `rowGap`/`columnGap` override it on
their own axis. `as` changes the rendered tag, and `className` and `style` pass through.

`GridItem` places one child with `colSpan` and `rowSpan`. `colSpan` is meant for fixed-`columns`
grids: `GridItem` has no context and does not check its parent, so in an auto-fit grid a span is
plain CSS behaviour, and one wider than the tracks that currently fit creates implicit tracks and
can overflow.

```tsx
<Grid columns={3} gap="space-3">
  <GridItem colSpan={2}>Wide</GridItem>
  <GridItem>Narrow</GridItem>
</Grid>

<Grid as="ul" minColumnWidth="lg">
  <li>One</li>
  <li>Two</li>
</Grid>
```

Auto-fit reads `--vpg-column-*` from `@vipengele/react-tokens`, with no literal fallback. A theme
without those properties — `@vipengele/react-ui` upgraded while `@vipengele/react-tokens` is
not, so the tokens version must be one that emits the column-width scale — leaves every auto-fit
`Grid` as a single column, silently: a bare `var()` in `grid-template-columns` is invalid at
computed-value time. Fixed-`columns` grids do not read it and are unaffected.

### `AspectRatio`

A box that holds a width-to-height ratio and fills with its media or embed. It draws nothing of
its own.

| Prop    | Values                                                     | Default |
| ------- | ---------------------------------------------------------- | ------- |
| `ratio` | width over height, such as `16 / 9`                        | `1`     |
| `as`    | any element type, so a captioned image can be a `<figure>` | `"div"` |

`ratio` is a number, never a string. A non-finite, zero or negative value is clamped to `1`: left
to CSS it would make `aspect-ratio` invalid and the box would silently take its content's height.
`ref` reaches the rendered element, and `style` is spread after the box's own properties, so it
wins.

Every direct child fills the box, `width` and `height` at 100%, and an `img` or `video` child gets
`object-fit: cover`. The box clips overflow, so content taller than the ratio is cut off rather
than growing the box. `width` and `height` do not apply to inline-level children, such as a bare
`<span>`: a child that should fill must be block-level or replaced, like `img`, `video` or `div`.

```tsx
<AspectRatio ratio={16 / 9}>
  <img src="/cover.jpg" alt="Cover" />
</AspectRatio>

<AspectRatio ratio={4 / 3} as="figure">
  <video src="/clip.mp4" controls />
</AspectRatio>
```

### `ErrorBoundary`

Catches a rendering error thrown anywhere in its subtree and renders a fallback in its place.
Catching is a tree position, not an app-wide setting: `ErrorBoundary` shows the fallback where
the failed subtree was, and the rest of the page keeps rendering. Absent a `fallback`, it renders
an error `StatePanel`, whose `title` (default `"Something went wrong."`) and `description` can be
overridden with the boundary's own `title`/`description` props; `fallback` replaces that panel
entirely, either as a node or as `(error, reset) => ReactNode`, where `reset` clears the error
state and re-renders `children`.

```tsx
<ErrorBoundary title="Couldn't load your feed" description="Try refreshing the page.">
  <Feed />
</ErrorBoundary>
```

`resetKeys` clears the error state — and re-renders `children` — whenever any of its values
changes, compared by `Object.is`, position by position: a boundary around a page keyed by a
route param recovers on navigation without the caller managing `reset` by hand.

```tsx
<ErrorBoundary resetKeys={[routeParams.id]}>
  <ProfilePage id={routeParams.id} />
</ErrorBoundary>
```

`onError` is called with every error the boundary catches, for reporting — `(error, errorInfo) =>
void`, the `ErrorReporter` type. `toRootErrorHandlers` spreads one `ErrorReporter` across React's
root-level `onCaughtError`/`onUncaughtError` options: `createRoot(el, {
...toRootErrorHandlers(report) })`. Those root options report errors and cannot render anything,
so they complement a boundary rather than replace it — the same reporter serves both call sites.
Recovering from an error no boundary caught is the app's own responsibility: React tears down the
whole root on an uncaught error, and only the app holds the `root` reference `root.render(...)`
needs to remount it — nothing in this package can do that on the app's behalf.

`StatePanel` is imported statically, so importing `ErrorBoundary` at all pulls it in — and,
transitively, `Typography` and its inline error illustration — whichever `fallback` a given
instance passes.

### `Tree`

A hierarchical list, driven by data rather than by compound children (see
`docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md`). `items`
are the root nodes, of any type `T`; the tree reads them through `getId` (unique across the tree),
`getLabel` (the text type-ahead matches), `getChildren` (`undefined` or an empty array is a leaf)
and the optional `getDisabled`, and draws each row with `renderItem(node, state)`. The tree owns
the `role="tree"` element, the keyboard model and the focus position; `renderItem` owns what a row
looks like. The element it renders as the row's `treeitem` spreads `state.getItemProps()`, which
carries the role, the `aria-level`/`-setsize`/`-posinset`/`-expanded`/`-selected` attributes, the
roving `tabIndex`, indentation, and the key, click and focus handlers.

```tsx
import { Tree } from "@vipengele/react-ui";

type Node = { id: string; name: string; children?: Node[] };

const getId = (node: Node) => node.id;
const getLabel = (node: Node) => node.name;
const getChildren = (node: Node) => node.children;

<Tree
  aria-label="Files"
  items={files}
  getId={getId}
  getLabel={getLabel}
  getChildren={getChildren}
  renderItem={(node, state) => (
    <div {...state.getItemProps()}>
      {state.hasChildren && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={state.expanded ? "Collapse" : "Expand"}
          onClick={(event) => {
            event.stopPropagation();
            state.toggle();
          }}
        >
          {state.expanded ? "−" : "+"}
        </button>
      )}
      {node.name}
    </div>
  )}
/>;
```

`getId`, `getLabel`, `getChildren` and `getDisabled` keep the same identity across renders —
module-level functions, or `useCallback` when they close over props or state. The tree recomputes
its row model whenever one of them, `items` or the expanded set changes, so an inline arrow
re-flattens every row on each render of the parent. The `accessors` the snippets below spread are
such hoisted functions: `const accessors = { getId, getLabel, getChildren }`.

Pass the row element's own props through `getItemProps(props)` rather than beside it: the tree's
`role`, `aria-*`, `tabIndex`, `onKeyDown`, `onClick` and `onFocus` win over the same props passed
there, `className` is joined with the tree's, `style` is laid over the tree's, and `ref` is merged
with the tree's own, which focus moves through — a row that does not spread `getItemProps` is never
focused. `state` also reports `id`, `level` (1 at the root), `hasChildren`, `expanded`,
`selected`, `focused` (this row holds the focus position while DOM focus is in the tree) and
`disabled`.

Clicking a row activates it rather than toggling it, so an expand affordance inside the row calls
`state.toggle()` from its click handler and stops the event's propagation if the click should not
also activate the row. `toggle` does nothing on a leaf or a disabled row. A disabled node is skipped
by keyboard navigation and is never expanded, selected or activated.

`selectionMode` is `none` (the default) or `single`. In `single`, a click, `Enter` or `Space` selects
a row. Selection is controlled through `selectedId` (`null` selects nothing) and
`onSelectedChange`, or left to the tree, seeded by `defaultSelectedId`. `onAction(id)` fires when a
row is activated — clicked, or `Enter` pressed on it — whatever the selection mode.
`onFocusChange(id)` fires whenever the focus position moves to another row.

Expansion is controlled through `expanded`, a `ReadonlySet` of open ids, and `onExpandedChange`, or
left to the tree, seeded by `defaultExpanded`:

```tsx
<Tree
  {...accessors}
  items={files}
  defaultExpanded={["src"]}
  selectionMode="single"
  onAction={(id) => open(id)}
  renderItem={renderFile}
/>
```

Exactly one row is tabbable: the one last focused, else the selected row, else the first enabled
row. Keyboard:

| Key                | Action                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| `Down` / `Up`      | Focus the next / previous enabled visible row                               |
| `Right`            | Open a closed node; on an open one, focus its first child                   |
| `Left`             | Close an open node; on a closed one or a leaf, focus its parent             |
| `Home` / `End`     | Focus the first / last enabled visible row                                  |
| `Enter`            | Activate the row, which selects it in `single` mode and calls `onAction`    |
| `Space`            | Select the row, in `single` mode                                            |
| `*`                | Open every sibling of the focused row that has children                     |
| a printable key    | Type-ahead: focus the next row whose label starts with what has been typed  |

Where the tree's computed `direction` is `rtl`, `Left` and `Right` swap.

`virtualized` mounts only the rows in view, plus overscan and the tabbable row, and requires
`rowHeight`, every row's height in CSS pixels. The tree element is then the scroll container, so it
needs a bounded height from `className` or `style`; without one it grows to hold every row and
mounts them all. The `Virtualized10k` story shows a ten-thousand-row tree.

```tsx
<Tree {...accessors} items={bigTree} virtualized rowHeight={28} style={{ height: 400 }} renderItem={renderRow} />
```

The tree implements no drag and drop. A consumer builds it on `getItemProps`, which passes
`draggable` and the `onDrag*` handlers through to the row; the `DragAndDrop` story shows one.

## Runtime dependencies

`@floating-ui/react` positions `Tooltip`'s bubble, `Popover`'s panel, `Menu`'s panel and
`Dropdown`'s listbox — and drives their list navigation and type-ahead. It travels only with the components
that need it — a bundle importing anything else does not pull it in, which `bundle-check/`
asserts.

`@tanstack/react-virtual` windows `Tree`'s rows when `virtualized` is set (see
`docs/adr/0025-tanstack-react-virtual-for-opt-in-tree-windowing.md`). Like `@floating-ui/react`, it
travels only with the component that needs it.

## Peer dependencies

React 19 and React DOM 19 — components render React and rely on `<style href precedence>`.

`@vipengele/react-tokens` — every component reads the `--vpg-*` properties it defines, and
`Grid`'s auto-fit mode needs a version that emits `--vpg-column-*`, and `Center` needs one that
emits `--vpg-width-*`.

`@vipengele/react-telemetry` — `Dropdown` runs `loadOptions` in the scope of the nearest enclosing
`ScopeProvider`. A peer rather than a dependency because an app holds one scope context, which a
second bundled copy would split.

```bash
pnpm add @vipengele/react-telemetry
```

**Breaking:** every consumer of `@vipengele/react-ui` must install `@vipengele/react-telemetry`
alongside it, whether or not it renders a `ScopeProvider`.
