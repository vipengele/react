# Components read role tokens with no literal fallback

Every sizing, type, elevation and status value in `packages/ui` is written as a `var()` read of a
component-scoped name — `--tandiko-button-height-md`, `--tandiko-avatar-text-sm`,
`--tandiko-popover-shadow` — with a literal second argument. Nothing assigns any of those names,
so the literal is the value that renders, and the read is decoration around a hardcoded number.
Fifty-four such names exist across twenty component directories, and because each one is declared
nowhere, two components that should agree on a measurement agree only by coincidence: a button is
36px tall while the size scale's default control step is 32px, a field's own text is 16px while
the type scale calls 14px the label size, and a popover's shadow is a single flat
`rgb(0 0 0 / 0.18)` that all but vanishes on a dark ground.

This decision fixes, for each of those fifty-four names, the scale step it takes.

**The invariant: a component reads a role token — a step of the size, icon, spacing, type,
elevation, stacking or status family — and no `var()` read in `packages/ui` carries a literal
fallback.** A fallback is what lets an undefined name look defined; without one, a name nothing
assigns renders as nothing, and the gap is visible the first time the component is rendered
rather than invisible forever.

A measurement that no family carries is not given a component-scoped property either. It is
written as a literal in the component's own stylesheet, because a `--tandiko-*` name the theme
never assigns advertises a theming hook the system does not support: `CONTEXT.md` already settles
that per-component style overrides are out of the theming system's scope and that a consumer
wanting one composes through `className`.

## The mapping

`Read at` distinguishes the sites where one name is read in two different roles. `Change` is what
a reviewer sees: `—` is pixel-for-pixel identical.

| Token                               | Read at                                                                                | Fallback                                | Takes                                        | Change            |
| ----------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------- | ----------------- |
| `--tandiko-avatar-size-sm`          | Avatar                                                                                 | `1.5rem`                                | `--tandiko-size-xs`                          | —                 |
| `--tandiko-avatar-size-md`          | Avatar                                                                                 | `2rem`                                  | `--tandiko-size-md`                          | —                 |
| `--tandiko-avatar-size-lg`          | Avatar                                                                                 | `2.5rem`                                | `--tandiko-size-xl`                          | —                 |
| `--tandiko-avatar-size-xl`          | Avatar                                                                                 | `3.5rem`                                | `--tandiko-size-2xl`                         | 56px → 48px       |
| `--tandiko-avatar-text-sm`          | Avatar                                                                                 | `0.625rem`                              | `--tandiko-font-size-xs`                     | 10px → 12px       |
| `--tandiko-avatar-text-md`          | Avatar                                                                                 | `0.75rem`                               | `--tandiko-font-size-xs`                     | —                 |
| `--tandiko-avatar-text-lg`          | Avatar                                                                                 | `0.875rem`                              | `--tandiko-font-size-sm`                     | —                 |
| `--tandiko-avatar-text-xl`          | Avatar                                                                                 | `1.125rem`                              | `--tandiko-font-size-lg`                     | —                 |
| `--tandiko-button-height-sm`        | Button height and icon-only min-width                                                  | `1.75rem`                               | `--tandiko-size-sm`                          | —                 |
| `--tandiko-button-height-md`        | Button height and icon-only min-width                                                  | `2.25rem`                               | `--tandiko-size-md`                          | 36px → 32px       |
| `--tandiko-button-height-lg`        | Button height and icon-only min-width                                                  | `2.75rem`                               | `--tandiko-size-xl`                          | 44px → 40px       |
| `--tandiko-button-pad-sm`           | Button                                                                                 | `0.625rem`                              | `--tandiko-space-3`                          | 10px → 12px       |
| `--tandiko-button-pad-md`           | Button                                                                                 | `0.875rem`                              | `--tandiko-space-4`                          | 14px → 16px       |
| `--tandiko-button-pad-lg`           | Button                                                                                 | `1.25rem`                               | `--tandiko-space-5`                          | —                 |
| `--tandiko-button-font-sm`          | Button                                                                                 | `0.8125rem`                             | `--tandiko-font-size-xs`                     | 13px → 12px       |
| `--tandiko-button-font-md`          | Button                                                                                 | `0.875rem`                              | `--tandiko-font-size-sm`                     | —                 |
| `--tandiko-button-font-lg`          | Button                                                                                 | `1rem`                                  | `--tandiko-font-size-md`                     | —                 |
| `--tandiko-button-gap`              | Button                                                                                 | `0.5rem`                                | `--tandiko-space-2`                          | —                 |
| `--tandiko-danger`                  | Button danger, TextField, Dropdown, Autocomplete, FormField                            | `oklch(0.55 0.21 27)`                   | `--tandiko-danger`                           | dark mode only    |
| `--tandiko-danger-ring`             | TextField                                                                              | `oklch(0.55 0.21 27 / 0.35)`            | `--tandiko-danger-ring`                      | alpha 0.35 → 0.45 |
| `--tandiko-danger-contrast`         | Button danger                                                                          | `oklch(0.99 0 0)`                       | `--tandiko-danger-contrast`                  | L 0.99 → 1        |
| `--tandiko-spinner-size-sm`         | Spinner                                                                                | `1rem`                                  | `--tandiko-icon-md`                          | —                 |
| `--tandiko-spinner-size-md`         | Spinner                                                                                | `1.25rem`                               | `--tandiko-icon-lg`                          | —                 |
| `--tandiko-spinner-size-lg`         | Spinner                                                                                | `1.75rem`                               | `--tandiko-icon-xl`                          | 28px → 24px       |
| `--tandiko-toggle-height`           | Toggle track                                                                           | `1.25rem`                               | `--tandiko-icon-lg`                          | —                 |
| `--tandiko-toggle-width`            | Toggle track                                                                           | `2.25rem`                               | `calc(var(--tandiko-icon-lg) * 1.8)`         | —                 |
| `--tandiko-toggle-thumb-size`       | Toggle thumb                                                                           | `0.875rem`                              | `--tandiko-icon-sm`                          | —                 |
| `--tandiko-toggle-thumb-color`      | Toggle thumb                                                                           | `oklch(0.99 0 0)`                       | `--tandiko-accent-contrast`                  | seed-dependent    |
| `--tandiko-radio-size`              | RadioButton                                                                            | `1.125rem`                              | `--tandiko-icon-md`                          | 18px → 16px       |
| `--tandiko-radio-dot-size`          | RadioButton                                                                            | `0.5rem`                                | `calc(var(--tandiko-icon-md) * 0.5)`         | —                 |
| `--tandiko-slider-track-height`     | Slider                                                                                 | `0.25rem`                               | `--tandiko-space-1`                          | —                 |
| `--tandiko-slider-thumb-size`       | Slider                                                                                 | `1rem`                                  | `--tandiko-icon-md`                          | —                 |
| `--tandiko-tooltip-text`            | Tooltip                                                                                | `0.75rem`                               | `--tandiko-font-size-xs`                     | —                 |
| `--tandiko-tooltip-max-width`       | Tooltip                                                                                | `16rem`                                 | literal `16rem`                              | —                 |
| `--tandiko-tooltip-z`               | Tooltip                                                                                | `1000`                                  | `--tandiko-layer-tooltip`                    | stacking order    |
| `--tandiko-popover-text`            | Popover                                                                                | `0.875rem`                              | `--tandiko-font-size-sm`                     | —                 |
| `--tandiko-popover-max-width`       | Popover                                                                                | `20rem`                                 | literal `20rem`                              | —                 |
| `--tandiko-popover-shadow`          | Popover                                                                                | `rgb(0 0 0 / 0.18)`                     | `--tandiko-shadow-high` (whole `box-shadow`) | both modes        |
| `--tandiko-popover-z`               | Popover                                                                                | `1000`                                  | `--tandiko-layer-popover`                    | stacking order    |
| `--tandiko-listbox-min-width`       | Dropdown and Autocomplete listbox                                                      | `12rem`                                 | literal `12rem`                              | —                 |
| `--tandiko-listbox-max-height`      | Dropdown and Autocomplete listbox                                                      | `16rem`                                 | literal `16rem`                              | —                 |
| `--tandiko-listbox-shadow`          | Dropdown and Autocomplete listbox                                                      | `rgb(0 0 0 / 0.08)`, `rgb(0 0 0 / 0.1)` | `--tandiko-shadow-med` (whole `box-shadow`)  | both modes        |
| `--tandiko-listbox-z`               | Dropdown and Autocomplete listbox                                                      | `1000`                                  | `--tandiko-layer-listbox`                    | —                 |
| `--tandiko-dropdown-min-width`      | Dropdown control                                                                       | `12rem`                                 | literal `12rem`                              | —                 |
| `--tandiko-autocomplete-min-width`  | Autocomplete control                                                                   | `12rem`                                 | literal `12rem`                              | —                 |
| `--tandiko-typography-display-size` | Typography `display`                                                                   | `3.5rem`                                | `--tandiko-font-size-5xl`                    | 56px → 48px       |
| `--tandiko-typography-h1-size`      | Typography `h1`                                                                        | `2.5rem`                                | `--tandiko-font-size-4xl`                    | 40px → 36px       |
| `--tandiko-typography-h2-size`      | Typography `h2`                                                                        | `2rem`                                  | `--tandiko-font-size-3xl`                    | 32px → 30px       |
| `--tandiko-typography-h3-size`      | Typography `h3`                                                                        | `1.5rem`                                | `--tandiko-font-size-2xl`                    | —                 |
| `--tandiko-typography-h4-size`      | Typography `h4`                                                                        | `1.25rem`                               | `--tandiko-font-size-xl`                     | —                 |
| `--tandiko-typography-body-lg-size` | Typography `body-lg`                                                                   | `1.125rem`                              | `--tandiko-font-size-lg`                     | —                 |
| `--tandiko-typography-body-md-size` | Typography `body-md`                                                                   | `1rem`                                  | `--tandiko-font-size-md`                     | —                 |
| `--tandiko-typography-body-md-size` | TextField, Dropdown, Autocomplete, listbox option, Tabs tab                            | `1rem`                                  | `--tandiko-font-size-sm`                     | 16px → 14px       |
| `--tandiko-typography-body-sm-size` | Typography `body-sm`, FormField label, FieldSet legend, listbox empty and loading rows | `0.875rem`                              | `--tandiko-font-size-sm`                     | —                 |
| `--tandiko-typography-caption-size` | Typography `caption`, FormField help and error                                         | `0.75rem`                               | `--tandiko-font-size-xs`                     | —                 |

Fifty-five rows over fifty-four names. Thirty-four are pixel-for-pixel identical — six of them
because the measurement becomes a literal rather than a step. Of the twenty-one that change
something, thirteen move geometry, four change a colour, two change a shadow and two change
stacking order.

### Why the non-obvious rows go where they do

**A button's `md` is the size scale's `md`.** The scale's `md` step is the default control height
and the measured target for the whole library; a button that renders 4px taller than it is the
only control that does not sit on the ladder the rest of the system aligns to. The same argument
takes `lg` to `size-xl` (40px, the largest pointer target) rather than inventing a step above it.
The paddings follow the heights: 12/16/20px is `space-3`/`-4`/`-5`, a clean step per size, where
the literals were 10/14/20px and only the largest landed on the spacing scale at all.

**A control's own text is the type scale's `sm`, not its `md`.** `--tandiko-typography-body-md-size`
is read in two roles. In `Typography`, `body-md` is a prose size and keeps its 16px. In a field, a
dropdown control, an option row and a tab, the same name sizes the control's own label, which the
type scale defines as `sm`. Keying the table by call site rather than by name is what makes that
expressible; keying it by name alone would force one of the two roles to be wrong.

**The toggle's track is a glyph, not a control.** Its 20px height and 14px thumb sit below the
size scale's smallest step because a switch's pointer target is the label row around it, not the
track. Both land exactly on the icon scale (`icon-lg`, `icon-sm`). The track's width is written as
a ratio of its own height rather than as `--tandiko-size-lg`, which happens to equal 36px:
binding a switch's width to a button-height step means a future adjustment to that step silently
restretches every switch, and the width is a function of thumb travel, not of a control height.
The radio's dot is written the same way, as half its indicator.

**The spinner is on the icon scale.** Its `sm` and `md` land on `icon-md` and `icon-lg` exactly,
which is evidence that a spinner is glyph-sized; its `lg` at 28px is above every icon step. The
scale is missing a fourth step rather than the spinner being special, so the spinner's `lg` takes
a new `--tandiko-icon-xl` at 24px and shrinks 4px.

**The avatar rides the control scale and needs one step past it.** 24/32/40px land on
`size-xs`/`-md`/`-xl` exactly. The fourth, 56px, is above the largest pointer target, so it takes
a new `--tandiko-size-2xl` at 48px — a display step, explicitly past the range a pointer targets —
and shrinks 8px. Its `sm` initials at 10px are below the type scale's 12px floor and rise to it: a
scale with a floor means initials do not go under it, and 12px in a 24px circle fits.

**The heading ramp is the type scale's top four steps.** `h4`/`h3`/`h2`/`h1` become
20/24/30/36px through `xl`/`2xl`/`3xl`/`4xl`, moving `h2` down 2px and `h1` down 4px, and
`display` takes a new `--tandiko-font-size-5xl` at 48px, 8px down from its literal. Snapping
`display` onto `4xl` instead would collide it with `h1`, and the two roles have to be
distinguishable.

**Six container measurements take no token.** The three 12rem min-widths, the listbox's 16rem
max-height, the tooltip's 16rem max-width and the popover's 20rem max-width are the size of a
container, not a step of anything: no family carries a 192px, and putting them on the spacing
scale would mean inventing a meaning for a step eight times larger than its neighbours. They are
written as literals in the component's own stylesheet and nothing about them renders differently.

## What this changes on screen

Fifteen changes, in the order a reviewer can check them.

1. **Every default button is 4px shorter** — 36px to 32px — and every large button is 4px shorter,
   44px to 40px. Icon-only buttons narrow by the same amounts, being square.
2. **Small and default buttons gain 2px of horizontal padding each side** (10→12px, 14→16px).
3. **Small button text drops 1px**, 13px to 12px.
4. **Field, dropdown, option-row and tab text drops from 16px to 14px.** This is the widest change
   in the slice: it touches `TextField`, `Dropdown`, `Autocomplete`, every listbox option and every
   tab, and it is what brings the library's control text to the measured target.
5. **The `xl` avatar shrinks from 56px to 48px**; its `sm` initials grow from 10px to 12px.
6. **The large spinner shrinks from 28px to 24px.**
7. **The radio indicator shrinks from 18px to 16px**, its dot staying at 8px.
8. **`display` drops from 56px to 48px, `h1` from 40px to 36px, `h2` from 32px to 30px.** `h3`,
   `h4`, the three body sizes and the caption are unmoved.
9. **The popover's shadow becomes the two-layer `--tandiko-shadow-high`** — a tight contact layer
   plus a wide ambient one — in place of a single flat blur. In light mode it reads as a crisper
   edge with the same weight; in dark mode it becomes visible at all, where an 0.18 light-mode
   alpha is close to invisible against a dark ground.
10. **The listbox's shadow becomes `--tandiko-shadow-med`**, with the same before and after in both
    modes.
11. **The danger red is mode-resolved.** Light mode renders the same `oklch(0.55 0.21 27)`; dark
    mode renders the derived lighter, slightly less saturated variant, as the accent already does.
    Button's danger hover and press steps derive from it rather than from an inline expression, so
    they keep their current appearance in light mode and gain a correct one in dark. The danger
    button's label runs through the same lightness clamp as the accent's contrast: at the default
    seed's `l` of 0.55, `clamp(0, (0.68 - 0.55) * 1000, 1)` saturates to 1, so the label renders
    `oklch(1 0 27)` where the literal read `oklch(0.99 0 0)` — a ΔL of 0.01, imperceptible on
    screen, and white sits marginally higher in contrast against the red than 0.99 did. Expected
    and benign, not something to chase as a defect.
12. **TextField's error ring strengthens** from alpha 0.35 to 0.45, matching the accent ring.
13. **The toggle's thumb follows the accent's contrast colour.** With the default seed it stays
    near-white in both modes; with a light accent it becomes dark, which is the point — a
    near-white thumb on a light-accent track is invisible today.
14. **A tooltip draws over a popover, and a popover over a listbox.** All three currently declare
    `z-index: 1000` and portal into the same `.tandiko-root`, so which one wins is whichever React
    mounted last.
15. **Focus rings are uniform**: 2px at a 2px offset everywhere. The rings drawn as a box-shadow on
    `TextField`, `Dropdown` and `Autocomplete` narrow from 3px to 2px, and the listbox option's
    offset grows from 1px to 2px.

## The substrate this needs

Three families do not exist, and three scales are a step short. Each addition is placed by
ADR-0007's line: a property whose value depends on the colour mode or the reduced-motion
preference is assigned by the base stylesheet and absent from `createTheme`'s output; everything
else is a theme entry.

**Status colour — one, `danger`.** `danger` becomes a `ThemeSeed` field defaulting to
`oklch(0.55 0.21 27)`, the value rendering today, so light mode is unchanged. It mirrors the
accent exactly: `createTheme` emits `--tandiko-danger-light` and `--tandiko-danger-dark`, the
ramp steps `--tandiko-danger-hover` and `--tandiko-danger-press` reading `--tandiko-state-shift`
back through `var()`, `--tandiko-danger-ring` at alpha 0.45 and `--tandiko-danger-contrast`
through the same lightness clamp. `--tandiko-danger` itself is mode-resolved — a red that reads as
an error on a near-white ground is muddy on a dark one — so it is stylesheet-owned: it joins
`STYLESHEET_OWNED_PROPERTIES`, is assigned on `.tandiko-root` as
`light-dark(var(--tandiko-danger-light), var(--tandiko-danger-dark))`, and needs no declaration in
the dark rules, which move it through `color-scheme` (ADR-0008). The contract tests in
`packages/tokens/src/theme.test.ts` fail if it is emitted inline instead. No `success`, `warning`
or `info` joins it: nothing in `packages/ui` reads one, and a status colour chosen ahead of the
component that needs it is a guess no rendering checks.

**Stacking — `--tandiko-layer-listbox: 1000`, `--tandiko-layer-popover: 1100`,
`--tandiko-layer-tooltip: 1200`.** Every floating surface portals into `.tandiko-root`, so all
four are siblings in one stacking context and a single shared value leaves the order to DOM
order. The order is forced by containment: a listbox belongs to the control that opened it, a
popover is a surface over the page that can contain that control, and a tooltip can be triggered
from inside either and must never be occluded by what triggered it. The 100-step gaps leave room
for a consumer's own content between two adjacent Tandiko surfaces. None of the three depends on
an environment condition, so all three are theme entries.

**Focus ring — `--tandiko-focus-ring-width: 2px` and `--tandiko-focus-ring-offset: 2px`.** Ten
stylesheets draw a ring and each states its geometry as a literal, which is how three of them came
to draw 3px and one to offset by 1px. The family carries no colour: `--tandiko-accent-ring` is
already that colour, and a second name for it is a second thing to keep in agreement. An inset
ring is written as a negated offset. Both entries are invariant across colour mode and reduced
motion, so both come from `createTheme`.

**`--tandiko-size-2xl: 3rem`, `--tandiko-icon-xl: 1.5rem`, `--tandiko-font-size-5xl: 3rem`.** One
step each for the display avatar, the large spinner and the display type role, for the reasons
given with their rows. Each extends its family's own ladder and is available to anything, which is
what separates a missing step from a bespoke per-component value.

## The radius steps are a separate decision

`--tandiko-radius-sm` and `--tandiko-radius-lg` are `calc()` multiples of the seed radius, ×0.5 and
×2, giving 4px and 16px at the default 8px seed against a measured target of 6–8px inner and
10–12px outer. Correcting them is a change to the multipliers — ×0.75 and ×1.5 lands on 6px and
12px while keeping both steps seed-derived — and it belongs to its own decision, not this one.

Both properties are defined and every component reads them without a fallback, so nothing in this
mapping depends on their values: the two changes are independent, and running them together puts
every corner in the library in the same screenshot diff as every height, padding and shadow, where
no reviewer can attribute a difference to either.

## Considered options

- **Assign the fifty-four component-scoped names in `createTheme`**, keeping
  `--tandiko-button-height-md` as a real property with `2rem` behind it. This preserves every
  consumer's ability to restyle one component through one property and is the smallest change to
  the components. Rejected because it makes the theme a registry of component knobs that grows
  with every component, and it defeats the point of a scale: two components agreeing on a
  measurement would still be two properties that happen to hold the same value, so the next
  component's `md` can drift from the scale's `md` exactly as this one did, with the drift now
  blessed by being in the theme.
- **Keep the fallbacks and assign the names as well**, so an unthemed consumer still renders. This
  is the safest migration and breaks nothing. Rejected because the fallback is precisely what hid
  the problem: with a literal behind every read, a name that is never assigned and a name assigned
  the wrong value render identically, and there is no moment at which anybody notices. Removing
  them makes an unassigned token a blank component, which is loud.
- **Preserve every pixel, mapping each fallback to whichever step is nearest and adding a step
  wherever none is within a rounding.** Rejected because it produces a scale with steps at 10, 13,
  14 and 18px that exist only because one component once wanted them, which is the bespoke value
  the family was introduced to remove. The thirteen geometry changes are the value of doing this
  at all; a migration that moves nothing on screen has only renamed the literals.
- **Snap the off-scale values down to the nearest existing step and add nothing**, putting the
  display avatar at 40px, the large spinner at 20px and `display` at 36px. Rejected on collisions
  and on ramp collapse: `display` would land on `h1`, and the avatar's `lg` and `xl` on the same
  step, leaving a component with two size props that render identically. A ramp whose top two
  steps are indistinguishable is worse than a ramp one step longer.
