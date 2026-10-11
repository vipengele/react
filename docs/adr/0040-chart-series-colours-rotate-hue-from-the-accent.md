# Chart series colours rotate hue from the accent

A chart with several series needs several colours that tell the series apart. `createTheme` emits
six role tokens for them, `--vpg-chart-1` to `--vpg-chart-6`, each derived from the accent by
rotating its hue:

```css
--vpg-chart-N: oklch(from var(--vpg-accent) calc(l ± 0.05) max(c, 0.07) calc(h + offset));
```

The offsets are 30, 90, 150, 210, 270 and 330 degrees for roles 1 to 6, and the lightness
alternates, `+ 0.05` on the odd roles and `- 0.05` on the even ones. Charts read them bare, as
`var(--vpg-chart-N)`, like every other role token (ADR-0009).

## Why they derive from the accent

`--vpg-accent` is stylesheet-owned: it resolves through `light-dark()` and flips with the colour
mode (ADR-0007, ADR-0008). A property is stylesheet-owned only when the cascade has to resolve
its declared value, and the chart roles do not: each is an expression that reads `--vpg-accent`
back through `var()`, so it re-derives itself when the mode changes. They are emitted by
`createTheme` and absent from the base stylesheet.

The seed gains no fields. A consumer who wants a different series colour overrides the role
through `ThemeOverrides`. An override applies in both colour modes unless its value is a
`light-dark()` or reads a mode-resolved property through `var()`.

## Why the numbers are what they are

- **Offsets start at +30, not 0.** No role equals the accent, which is the colour of buttons,
  links and the focus ring. A selection brush or a highlighted bar drawn in the accent would
  otherwise be indistinguishable from series 1. Six roles at 60-degree steps from +30 also leave
  the accent's own hue as the gap between series 6 and series 1.
- **A chroma floor of 0.07.** Two hues 60 degrees apart are separated by roughly their chroma.
  A near-grey or achromatic accent would pass its chroma to every role and collapse the six onto
  one grey. `max(c, 0.07)` keeps the roles apart for any seed, in the style of the
  `max(c * 3, 0.015)` in `--vpg-surface-dark`.
- **Lightness alternates by 0.05.** Hues of equal lightness are what colour-vision deficiency
  merges. Alternating lightness gives neighbouring series a second axis of difference that does
  not depend on hue.

## Measured separation

The minimum pairwise OKLab distance between the painted pixels of the six roles is between 0.1196
and 0.1789 across four seeds — the default, `oklch(0.6 0.2 150)`, a low-chroma
`oklch(0.6 0.03 250)` and an achromatic one — in light and dark mode. The Chromium test
`source/react-ui/packages/ui/src/theme-chart-roles.browser.test.ts` pins a threshold of 0.08,
which leaves the measured worst case well above it.

## Colour is never the only channel

A pairwise distance check cannot prove a palette colour-blind safe: it measures distance in a
model of typical vision and says nothing about how a given deficiency compresses it. Charts
therefore never rely on colour alone to identify a series. The series name stays in the legend
and the tooltip.

## Considered options

- **A fixed categorical palette.** Rejected: it does not follow the brand seed, so a themed
  product's charts look foreign next to its buttons. It needs its own light and dark values,
  which is a second mode-resolved set to maintain. For some brands one of its hues also lands on
  the accent's hue, which brings back the collision with the selection colour that the +30
  offset avoids.
- **New seed fields for series colours.** Rejected: the seed is the small set of values a
  consumer supplies, and six more fields would grow it for a result the accent already carries,
  since its chroma and lightness are the brand's own.
