# Vipengele Design System

The monorepo's design-system context: the themeable component library consumers use to build
Vipengele-branded UI, the tooling that packages it, and the sites that showcase it.

## Language

**Project**:
A self-contained pnpm workspace under `source/<project>/` whose packages share one version and are
released together by one tag `<project>@vX.Y.Z` (ADR-0015). `react-ui` is the first.
_Avoid_: package (a project holds several), repo, module

**vpg**:
The short alias of `vipengele`, used only as the prefix on identifiers in code, CSS and markup
(`--vpg-*`, `.vpg-*`, `data-vpg-mode`). Names read in prose or typed into an install command spell
`vipengele` out (ADR-0014).
_Avoid_: vp, using vpg as a product or package name

**Seed**:
The small set of user-supplied values (accent colour, danger colour, ink, surface, radius, font
families) that
`createTheme` expands into a full `Theme`. A consumer customizes a theme by overriding seeds, not
by hand-authoring every derived value.
_Avoid_: theme input, config

**Theme**:
The frozen, complete set of `--vpg-*` CSS custom properties produced by `createTheme` from a
seed — ramps (hover/press/wash states, dark variants) included. What `ThemeProvider` applies to
its root element.
_Avoid_: theme object, tokens (tokens is the package name, not this value)

**ThemeProvider**:
The composition-root component from `@vipengele/react-tokens` that applies a `Theme` as inline CSS custom
properties on a scoped root element and sets `colorMode`. Components never read theme via a hook —
only via CSS custom properties in their own stylesheets.
_Avoid_: VipengeleProvider (rejected — see below), useTheme (no such hook exists)

**ColorMode**:
`'light' | 'dark'`, applied as `data-vpg-mode` on `ThemeProvider`'s root. Omitted, it inherits
the host page's own `[data-theme]` attribute or `prefers-color-scheme`.
_Avoid_: theme mode, dark mode flag

**Stylesheet-owned property**:
A `--vpg-*` custom property whose value depends on an environment condition the cascade
resolves — the active `ColorMode`, the user's `prefers-reduced-motion` setting. The base
stylesheet assigns every one of them and `createTheme` emits none, because `ThemeProvider`
applies a `Theme` inline and an inline declaration cannot be overridden by a mode rule or a
media query (ADR-0007). Colour mode governs `--vpg-accent`, `--vpg-ink`,
`--vpg-surface`, `--vpg-danger`, the ramp scalars
`--vpg-state-shift`/`--vpg-lift`/`--vpg-sink` and the shadow inks
`--vpg-shadow-contact`/`--vpg-shadow-ambient`; the reduced-motion preference governs the
durations `--vpg-duration-fast|normal|slow`.
_Avoid_: mode-resolved property (colour mode is one condition of several), dark-mode variable,
overridable token

**Ramp scalar**:
One of the three unitless numbers — `--vpg-state-shift`, `--vpg-lift`,
`--vpg-sink` — the accent and surface ramps read inside `calc()` to size a hover, press,
raised or sunken step. Stylesheet-owned, resolved by colour mode: `--vpg-state-shift`
changes sign between modes, `--vpg-lift` and `--vpg-sink` change magnitude.
_Avoid_: ramp constant, shift token

**Status colour**:
A colour naming an outcome rather than a brand or a surface. The family is `--vpg-danger-*`,
seeded and derived exactly as the accent is: `--vpg-danger-light`/`-dark` from the `danger`
seed, the ramp steps `-hover`/`-press`, the `-ring` and the `-contrast`. `--vpg-danger` itself
is stylesheet-owned, because a red that reads as an error on a near-white ground is muddy on a
dark one. There is one status colour — a `success` or `warning` chosen before a component reads
it is a value nothing checks.
_Avoid_: semantic colour, error colour (error is one use of danger, not the token), red

**Focus ring**:
The ring a component draws on `:focus-visible`, sized by `--vpg-focus-ring-width` and
`--vpg-focus-ring-offset` and drawn in `--vpg-accent-ring`. The family carries no colour
of its own: a second name for the ring colour is a second thing to keep in agreement with the
first. An inset ring negates the offset rather than declaring its own.
_Avoid_: focus outline, focus style, highlight

**Size scale**:
The `--vpg-size-*` steps (`xs`–`2xl`) giving the outer height of anything a pointer targets —
button, field, option row, toggle — plus the `--vpg-icon-*` steps (`sm`–`xl`) for a glyph
sitting inside one. `md` is the default control height and `xl` the largest pointer target; `2xl`
is a display step past that range, for something sized like a large avatar rather than aimed at.
An icon is sized from its own step rather than scaled off the control, so a dense row does not
crowd — a switch track and a spinner take icon steps for the same reason.
_Avoid_: control size, height scale, dimension token

**Spacing scale**:
The `--vpg-space-N` steps, each `N * 0.25rem`. Every gap, padding and inset a component
takes comes from a step, which is what makes two components placed side by side align without
either knowing the other's measurements.
_Avoid_: gutter, padding token, space unit

**Type scale**:
The typography family: `--vpg-font-size-*` (`xs`–`5xl`, with `sm` the body and label size —
the size a control's own text takes, prose in `Typography` being the one role that reads larger),
`--vpg-font-weight-*`, the unitless `--vpg-line-height-*` and the `em`-based
`--vpg-letter-spacing-*`. A component picks a step per axis rather than declaring a
measurement, so text at the same role reads the same size everywhere.
_Avoid_: font scale, text token, typography role (a role names a heading level, not a step)

**Motion token**:
One of `--vpg-duration-fast|normal|slow` and `--vpg-ease-standard|entrance|exit`. Every
transition in the system is one duration paired with one easing: `fast` for a state change under
a pointer already on the control, `normal` for an element entering or leaving the layout, `slow`
for a surface crossing the viewport. The durations are stylesheet-owned — under
`prefers-reduced-motion: reduce` they collapse to `0.01ms`, short enough to be imperceptible and
long enough that a transition still fires `transitionend`. The easings come from `createTheme`:
a curve shapes a transition's progress and says nothing at a collapsed duration.
_Avoid_: animation token, timing variable

**Elevation**:
The `--vpg-shadow-low|med|high` compositions that lift a surface off its ground. Each is two
layers — a tight contact shadow anchoring the element, a wide ambient one carrying the height —
drawn in the two stylesheet-owned shadow inks, `--vpg-shadow-contact` and
`--vpg-shadow-ambient`. The inks come from the base stylesheet because the alphas that read
as depth over a light surface disappear against a dark one; the compositions come from
`createTheme` because they read the inks back through `var()` (ADR-0007).
_Avoid_: shadow scale, depth token, z-level (z-level is stacking order, not elevation)

**Stacking scale**:
The `--vpg-layer-*` steps — `listbox`, `popover`, `tooltip` — giving the `z-index` of a
floating surface. Every such surface portals into the same `.vpg-root`, so all of them are
siblings in one stacking context and a shared value leaves the order to DOM order. The order is
containment: a listbox belongs to the control that opened it, a popover is a surface over the page
that can contain that control, a tooltip can be triggered from inside either. The gaps between
steps are where a consumer's own content goes.
_Avoid_: z-scale, elevation (elevation is shadow depth, not stacking order), layer token

**Layout primitive**:
A component that arranges other components and draws nothing of its own — `Stack`, `Inline`,
`Grid`, `Center`, `AspectRatio`. Its per-instance values reach one static stylesheet as
component-scoped custom properties set inline, and every length it takes is a token name, never a
measurement (ADR-0019).
_Avoid_: layout utility, box (a box suggests arbitrary style props), spacer

**Field shell**:
The chrome a field's control sits in — a text input, or the trigger of a `Dropdown`: the bordered,
rounded, surface-filled box that takes the focus ring, turns its border to the danger colour when
the control it holds is invalid, dims when that control is disabled, and spans the width of
whatever contains it. It is the boundary a user
reads as "the field", distinct from the control inside it and from the label, hint and error
`FormField` arranges around it (ADR-0011).
_Avoid_: field wrapper, input container, control box (a control's box may be a track or an
indicator; a shell is specifically a field's)

**Control**:
The element a field collects its value from — a text input, a `Dropdown` trigger, a Slider's
track, a Toggle's indicator — distinct from the shell around it and the adornments beside it.
Inside a field shell, the composer marks the control with `.vpg-field-shell-control`; a control
outside a shell, like a Slider's track, carries no such marker and is a control all the same
(ADR-0017).
_Avoid_: marked element, shell child (the marker identifies the control inside a shell; it is not
what makes something a control)

**Adornment**:
Something placed inside a field shell alongside the control but not part of it — a leading search
or currency glyph, a trailing clear button, spinner or unit label. An adornment is decoration or
an affordance within the field's boundary; it is never the control the field exists to collect a
value from.
_Avoid_: icon (an icon is one kind of adornment, and an adornment need not be one), prefix/suffix,
slot content

**Search row**:
The first row of a searchable `Dropdown`'s popover: a magnifier glyph and a text input, above a
divider and the options. It is where typing goes while the popover is open, and it filters the
options — or, with `loadOptions`, requests them. A `Dropdown` has one only when `searchable`.
_Avoid_: filter input, autocomplete input, search box (the field itself is never typed into)

**Overflow chip**:
The "and N more" chip a multi-select `Dropdown` shows in place of the selection chips that do not
fit on its one row, counting them. It is not a selection and has nothing to remove; the selections
it stands for are named in a tooltip and remain checked in the popover.
_Avoid_: more chip, count badge, summary chip

**Slice**:
One landable, independently mergeable pull request in the design-system feature's build order.
Each slice ships its own components' Storybook stories in the same PR — Storybook is never left
behind a component that already exists.
_Avoid_: phase, milestone (this repo's usage is specifically about PR-sized, CI-green units)

## Flagged ambiguities

**"Themeable"** — the request asked for controls to be themeable via "a theme provider that allows
easy ui colors, sizes, etc to be customized." Resolved as: consumers override `ThemeSeed` values
(not individual component styles) and everything else derives. Per-component style overrides are
out of scope for the theming system itself; consumers wanting that reach for `className`/CSS
Modules composition as usual.

**Namespaced JSX (`<vipengele:card>`)** — raised and rejected: JSX does not support colon-namespaced
custom component tags. The closest equivalent, a namespace-import barrel (`import * as Vipengele
from '@vipengele/react-ui'`), was also rejected because it conflicts with the tree-shaking requirement on
`@vipengele/react-ui`. Resolution: plain named exports, direct imports only
(`import { Button } from '@vipengele/react-ui'`).

**"Autocomplete", "Select", "Combobox"** — used interchangeably for a field whose popover
offers options to pick. Resolution: there is one such component, `Dropdown`. It is searchable by
default (a **Search row**) and not when `searchable={false}`; "autocomplete" names that behaviour,
never a separate component.

## Example dialogue

> **Dev:** Does a consumer who wants a different accent colour write CSS overriding
> `--vpg-accent`, or pass a seed?
> **Design-system owner:** They pass a seed — `<ThemeProvider theme={createTheme({ accent: '...' })}>`.
> Overriding the CSS variable directly works too since it's just a custom property, but the
> supported path is the seed, because that's what keeps hover/press/dark ramps coherent with it.
> **Dev:** And if two `<ThemeProvider>`s are nested with different seeds?
> **Design-system owner:** Each is scoped to its own root element via inline styles, so the inner
> one's subtree gets its own theme — they don't merge.
