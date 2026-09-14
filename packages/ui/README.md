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

## Peer dependencies

React 19 and React DOM 19 — components render React and rely on `<style href precedence>`.
