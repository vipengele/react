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

An indeterminate loading indicator. Sizes `sm | md | lg` (from `--tandiko-spinner-size-*`, with
fallbacks baked into its own stylesheet), stroked in `var(--tandiko-accent)`, rotated by a CSS
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

### `Toggle`

A native `<input type="checkbox" role="switch">` styled as a switch. It forwards every
`<input>` prop except `type`/`role`, so `checked`/`onChange` (controlled) or `defaultChecked`
(uncontrolled), `disabled`, and `aria-label`/`aria-labelledby` all work exactly as they do on a
plain checkbox. No custom keyboard handling and no hand-set `aria-checked`: the native element
already exposes its checked state through the DOM, handles focus and keyboard interaction, and
participates in forms for free.

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

## Runtime dependencies

`@floating-ui/react` positions `Tooltip`'s bubble and `Popover`'s panel. It travels only with the
components that need it — a bundle importing anything else does not pull it in, which
`bundle-check/` asserts.

## Peer dependencies

React 19 and React DOM 19 — components render React and rely on `<style href precedence>`.
