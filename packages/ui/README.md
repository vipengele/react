# @tandiko/ui

Tandiko's themeable React component library. Components read theme exclusively through
`--tandiko-*` CSS custom properties set by `@tandiko/tokens`' `ThemeProvider` — there is no
`useTheme()` hook (see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`).

```tsx
import { Spinner } from "@tandiko/ui";

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
element, so an inline `--tandiko-*` value would permanently shadow `ThemeProvider`'s dark-mode
reassignment and that instance would stop adapting to colour mode.

## Components

### `Spinner`

An indeterminate loading indicator. Sizes `sm | md | lg` (steps of the icon scale — a spinner is
glyph-sized), stroked in `var(--tandiko-accent)`, rotated by a CSS
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
`--tandiko-*` ink tokens — `primary | secondary | subtle | accent` — not an arbitrary CSS colour,
so text always tracks light/dark mode.

`variant` also chooses the rendered HTML element (`display`/`h1`–`h4` render their matching
heading tag, `body-*` renders `<p>`, `caption` renders `<span>`). `as` overrides only the tag,
never the visual style, so a heading-styled label can render as a `<div>` where an `<h1>` would
break the document outline.

### `ButtonGroup`

Groups plain `<Button>` children into a single attached control. `orientation` is
`horizontal | vertical`. Children render unmodified — no `cloneElement`, no context — the
segmented look comes entirely from `ButtonGroup`'s own stylesheet targeting `.tandiko-button` as
a descendant.

### `Avatar`

The library's person atom: an image, the person's initials, or a generic person glyph, in that
order of preference, framed as a `circle` or `square` (`shape`) at size `sm | md | lg | xl`.

`src` is the image to render; a failed load falls through to initials, then to the icon, so a
dead URL degrades instead of leaving a blank frame. `name` is the source of the initials — the
first character of the first word plus the first character of the last word, upper-cased — and
the accessible name unless `alt` overrides it.

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

### `FormField`

Labels exactly one focusable control — `label`/`hint`/`error`/`children`, flat props rather than
a compound component. `children` is a native input, `Toggle`, `RadioButton`, or (in a later
slice) `Dropdown`'s trigger / `Autocomplete`'s input — a single element whose component forwards
unknown props to its focusable root. Not a group-shaped component like `RadioGroup`, which gets
its accessible name from its own `aria-label` instead.

`FormField` generates ids via `useId` and clones onto the child: `id` (the child's own `id` wins
if it already has one), `aria-describedby` (built from whichever of `hint`/`error` render, merged
with any `aria-describedby` the child already carries rather than overwritten), `aria-invalid`
(set when `error` is non-empty), and `aria-labelledby` — applied unconditionally, regardless of
what element the child renders as. `<label htmlFor>` only associates with labelable elements
(`input`/`select`/`textarea`/`button`/`meter`/`output`/`progress`), so a future non-labelable
trigger (Dropdown's `<div role="combobox">`) would otherwise get no accessible name at all;
`aria-labelledby` works on both, so every control gets it uniformly.

`children` that isn't a single valid element — text, an array, a `Fragment`, `null` — throws:
there's no single node to attach the label and description to.

```tsx
<FormField label="Email" hint="We never share this" error={errors.email}>
  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</FormField>
```

### `FieldSet`

A native `<fieldset>` + `<legend>` pair with spacing between `children`, for grouping related
controls — typically one or more `FormField`s, though it isn't restricted to them. It carries no
form-state logic of its own, purely layout: `legend` renders in the native `<legend>`, which
names the `<fieldset>` automatically with no id/aria wiring needed. `disabled` forwards straight
to the native `<fieldset>`, which disables every descendant form control for free.

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

### `Toggle`

A native `<input type="checkbox" role="switch">` styled as a switch. It forwards every
`<input>` prop except `type`/`role`, so `checked`/`onChange` (controlled) or `defaultChecked`
(uncontrolled), `disabled`, and `aria-label`/`aria-labelledby` all work exactly as they do on a
plain checkbox. No custom keyboard handling and no hand-set `aria-checked`: the native element
already exposes its checked state through the DOM, handles focus and keyboard interaction, and
participates in forms for free.

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

The bubble portals into the nearest ancestor `.tandiko-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--tandiko-*` value. On a page with no
`.tandiko-root` ancestor it renders inline beside the trigger instead, positioned identically but
inheriting whatever theme surrounds it.

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

The panel portals into the nearest ancestor `.tandiko-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--tandiko-*` value. On a page with no
`.tandiko-root` ancestor it renders inline beside the trigger instead, positioned identically but
inheriting whatever theme surrounds it.

### `Dropdown`

A select-only combobox: `Dropdown` and `Dropdown.Option` children directly beneath it, with no
list layer — the floating listbox's positioning is `Dropdown`'s own business. The field fills its
container's width, the way `TextField` does, rather than shrinking to fit its selection — it never
widens as options are selected. Each
`Dropdown.Option` takes a `value`, a `label` (the string shown in the trigger, in its chip, matched
by the search query, and — with `searchable={false}` — by type-ahead on the trigger), an optional
leading `icon`, and `disabled`. A child that is neither a
`Dropdown.Option` nor falsy throws at render; falsy children — what `condition &&
<Dropdown.Option />` produces — are skipped.

A selection is a `DropdownValue` — `{ value, label, icon? }`, or `null` for none — controlled
through `value`/`onChange` or left to `Dropdown` itself, seeded by `defaultValue`. `multiple`
switches all three to arrays: each option gains a checkbox, each selected value a removable chip
beside the trigger, and selecting toggles the option without closing the listbox. `onChange` hands
back the whole object of the option that was picked.

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
delete removes the last selection — `multiple`'s alone, since single-select's `onChange` is
`(value: DropdownValue) => void` and has no empty selection to report. The query clears as the
popover closes, so the next open starts on the full list.

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
button nested in there could not be reliably intercepted before those ran.

The listbox — the whole panel, search row included — portals into the nearest ancestor
`.tandiko-root` — the subtree `ThemeProvider` establishes — rather than `document.body`, so it
keeps every `--tandiko-*` value. On a page with no `.tandiko-root` ancestor it renders inline
beside the trigger instead.

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
icon?, disabled?}` — is called with the search query after it settles for `debounceMs` (default
`300`), and `Dropdown` renders whatever it resolves to. Filtering the query is the API's job in
this mode: results are shown as returned, never matched again client-side. `loadingMessage`
(default `"Loading…"`) shows while a search is pending, `errorMessage` (default `"Something went
wrong."`) shows if the promise rejects, and a search that returns nothing says "No results". An
out-of-order response — a slow earlier search resolving after a faster later one — is discarded
rather than applied. `children` goes unread when `loadOptions` is set.

A selection carries its own `label`, so the trigger and a `multiple` chip render it with nothing
fetched, no search run and no option child to match against — including for a `value` or
`defaultValue` handed straight to `Dropdown`.

### `Autocomplete`

A filtering combobox: a text input, and a floating listbox of the `Autocomplete.Option` children
whose labels match what has been typed. Each `Autocomplete.Option` takes a `value`, a `label` (the
string the query is matched against, shown in the input for the current selection and in its chip),
an optional leading `icon`, and `disabled`. A child that is neither an `Autocomplete.Option` nor
falsy throws at render; falsy children — what `condition && <Autocomplete.Option />` produces — are
skipped.

Matching is case-insensitive and by substring, anywhere in the label. A query matching nothing
leaves the listbox open showing "No results" rather than closing it.

```tsx
<Autocomplete defaultValue="medium" onChange={(value) => setSize(value)}>
  <Autocomplete.Option value="small" label="Small" icon={Minus} />
  <Autocomplete.Option value="medium" label="Medium" />
  <Autocomplete.Option value="large" label="Large" disabled />
</Autocomplete>
```

The typed text is `Autocomplete`'s own: only the selection is exposed, controlled through
`value`/`onChange` or left to `Autocomplete` itself and seeded by `defaultValue`. Free text is never
a selected value — leaving the field reverts the input to the selected option's label, or clears it.
Selecting an option puts its label in the input; in `multiple` mode the input clears instead, so the
next query can be typed straight away, each option gains a checkbox and each selected value a
removable chip before the input. `Backspace` on an empty input removes the last chip.

The `<input>` itself carries `role="combobox"`, `aria-expanded`, `aria-controls` and
`aria-activedescendant` — real DOM focus never leaves it, and the highlighted option is tracked
virtually through that attribute. It forwards
`id`/`aria-label`/`aria-labelledby`/`aria-describedby`/`aria-invalid`, so an `Autocomplete` wrapped
in a `FormField` gets its accessible name and description on the element that actually takes focus.

Keyboard: the listbox opens on focus, on any keystroke and on `ArrowDown`; the arrow keys move the
highlight and wrap at both ends, `Enter` selects the highlighted option, and `Escape` closes.
`Home`/`End` move the text caret rather than the highlight — the input holds the query, and a
combobox with a text field owes those keys to it. Every keystroke re-highlights the top match, so `Enter`
takes it without an arrow key first. Typing never jumps the highlight to a matching label the way
`Dropdown`'s type-ahead does — it filters. Disabled options are skipped by all of it and cannot be
clicked.

The listbox portals into the nearest ancestor `.tandiko-root` — the subtree `ThemeProvider`
establishes — rather than `document.body`, so it keeps every `--tandiko-*` value. On a page with no
`.tandiko-root` ancestor it renders inline beside the input instead.

#### Async data source

Pass `loadOptions` instead of `children` to back `Autocomplete` with an API rather than a
declared list:

```tsx
<Autocomplete
  aria-label="Country"
  loadOptions={(query) => fetchCountries(query)}
/>
```

`loadOptions: (query: string) => Promise<{value, label, icon?, disabled?}[]>` is called with the
current query after it settles for `debounceMs` (default `300`), and `Autocomplete` renders
whatever it resolves to — filtering the query is the API's job in this mode, results are shown as
returned. `loadingMessage` (default `"Loading…"`) shows while a search is pending, and
`errorMessage` (default `"Something went wrong."`) shows if the promise rejects. An
out-of-order response — a slow earlier search resolving after a faster later one — is discarded
rather than applied. `children` is ignored entirely when `loadOptions` is set.

A `multiple` chip for a value the current search results no longer include keeps the label it
was selected with. An initial `value`/`defaultValue` has no label to seed the input or a chip
with until something is searched and selected — async mode has no way to resolve a label for a
value it was simply handed, so it falls back to showing the raw value.

## Runtime dependencies

`@floating-ui/react` positions `Tooltip`'s bubble, `Popover`'s panel and the `Dropdown`/
`Autocomplete` listboxes — and drives their virtual-focus list navigation and `Dropdown`'s
type-ahead. It travels only with the
components that need it — a bundle importing anything else does not pull it in, which
`bundle-check/` asserts.

## Peer dependencies

React 19 and React DOM 19 — components render React and rely on `<style href precedence>`.
