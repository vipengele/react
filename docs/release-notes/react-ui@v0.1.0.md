# react-ui v0.1.0

The first published version of the vipengele React design system: a themeable component library
whose entire visual surface is CSS custom properties derived from a small seed.

Three packages, all at `0.1.0`, all MIT:

| Package | What it is |
|---------|------------|
| `@vipengele/react-tokens` | `createTheme`, `ThemeProvider`, and the base stylesheet — the theming substrate |
| `@vipengele/react-icons` | Curated, tree-shakable `lucide-react` re-exports plus the `Icon` wrapper |
| `@vipengele/react-ui` | The components |

```sh
pnpm add @vipengele/react-ui @vipengele/react-tokens @vipengele/react-icons
```

## Theming is a seed, not a stylesheet

A consumer states seven values — accent, danger, ink, surface, radius and the font families —
and `createTheme` expands them into the full ladder: hover, press, wash and ring steps, light and
dark variants, the radius steps, the type and spacing scales. `ThemeProvider` applies the result
as inline custom properties on a scoped root and sets the colour mode.

```tsx
import { ThemeProvider, createTheme } from "@vipengele/react-tokens";
import { Button } from "@vipengele/react-ui";

const theme = createTheme({ accent: "oklch(0.58 0.19 264)" });

<ThemeProvider theme={theme}>
  <Button>Save</Button>
</ThemeProvider>;
```

Components never read the theme through a hook. They read `--vpg-*` custom properties in their
own stylesheets, with **no literal fallbacks**: a component outside a `ThemeProvider` is
unstyled rather than half-styled, which makes a missing provider obvious instead of subtle.

Colour mode, reduced motion and anything else the cascade resolves are owned by the base
stylesheet rather than emitted by `createTheme`, because an inline declaration cannot be
overridden by a mode rule or a media query.

## Components

`Avatar`, `Button`, `ButtonGroup`, `Card`, `Dropdown`, `FieldSet`, `FieldShell`, `FormField`,
`PasswordInput`, `Popover`, `Progress`, `RadioButton`, `RadioGroup`, `Skeleton`, `Slider`,
`Spinner`, `Tabs`, `TextField`, `Toggle`, `Tooltip`, `Typography`.

Every form control is built on one `FieldShell`, so a text input, a password input and a
dropdown trigger share a border, a focus ring and an error state rather than three that merely
resemble each other. `Dropdown` is the one combobox: selection, search and multi-select are modes
of it, not separate components.

They are demonstrated at <https://vipengele.github.io/react/react-ui/>.

## Requirements

**React 19 and React DOM 19**, as peer dependencies. Stylesheet injection uses
`<style href precedence>`, which React 18 does not have, so React 18 consumers are excluded
deliberately.

## Before 1.0

The API is not frozen. While the project is pre-1.0 a breaking change is a minor bump, and the
custom-property names are as much a part of the public surface as the component props — a
consumer that overrides `--vpg-accent` or targets `.vpg-button` is depending on something this
project can still change.
