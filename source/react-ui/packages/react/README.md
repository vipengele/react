# @vipengele/react

vipengele for React: one provider that mounts the design system's theme, locale and telemetry scope.

```bash
pnpm add @vipengele/react @vipengele/react-tokens @vipengele/react-telemetry
```

React 19 and React DOM 19 are peer dependencies, as are `@vipengele/react-tokens` and
`@vipengele/react-telemetry`. `@vipengele/ts` is a dependency of `@vipengele/react`; a project that
imports from it directly, as the server rendering example does, lists it in its own dependencies.

## `<Vipengele>`

`<Vipengele>` mounts `ThemeProvider` and `LocaleProvider` from `@vipengele/react-tokens` and
`ScopeProvider` from `@vipengele/react-telemetry`, nested in that order, for its subtree.

```tsx
import { Vipengele } from "@vipengele/react";
import { createTheme } from "@vipengele/react-tokens";

const theme = createTheme({ accent: "oklch(0.62 0.2 255)" });

<Vipengele theme={theme} colorMode="dark" scope={{ tag: "app", attributes: { "tenant.id": tenant.id } }}>
  <App />
</Vipengele>;
```

`ThemeProvider` renders the one DOM element, `div.vpg-root`. `LocaleProvider` and `ScopeProvider`
render none.

### Props

| Prop                | Type                                                | Default                | Description                                                                                          |
| ------------------- | --------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `theme`             | `Theme`                                             | `createTheme()`        | Applied to `div.vpg-root`.                                                                           |
| `colorMode`         | `ColorModePreference`                               |                        | Controls the mode preference: `'light'`, `'dark'` or `'system'`. `'light'` and `'dark'` write `data-vpg-mode`; `'system'` writes no attribute, so the host page's `[data-theme]` or `prefers-color-scheme` applies. `setColorMode` from `useColorMode()` then only reports through `onColorModeChange`. |
| `defaultColorMode`  | `ColorModePreference`                               | `'system'`             | The initial mode preference when `colorMode` is omitted.                                             |
| `onColorModeChange` | `(colorMode: ColorModePreference) => void`          |                        | Called with every preference `setColorMode` from `useColorMode()` is given.                          |
| `locale`            | `Locale`                                            | `Locale.default()`     | What `useLocale()` returns in the subtree. The default is read once and kept for the component's lifetime. |
| `scope`             | `VipengeleScopeProps`                               |                        | `{ attributes?, tag?, isolate? }`: the `ScopeProvider` props for the subtree's scope. `tag` and `isolate` are read once, at mount. |
| `children`          | `ReactNode`                                         |                        |                                                                                                      |

`Theme` and `ColorModePreference` are exported from `@vipengele/react-tokens`, `Locale` from
`@vipengele/ts`, and `VipengeleScopeProps` from `@vipengele/react`.

Every other `div` prop lands on `div.vpg-root`. The scope props are nested under `scope` so that
`tag` and `attributes` are not read as props of that element.

A `<Vipengele>` inside another provider's subtree parents its scope on the enclosing scope; with
`scope={{ isolate: true }}` it parents on the root instead.

### Server rendering

A server render has no browser language to read. A server-rendered site passes `locale`:

```tsx
import { Vipengele } from "@vipengele/react";
import { Locale } from "@vipengele/ts";

<Vipengele locale={new Locale(request.locale)}>
  <App />
</Vipengele>
```

## The providers stay usable alone

`<Vipengele>` composes the providers and nothing more, besides defaulting the locale. Mount
`ThemeProvider`, `LocaleProvider` and `ScopeProvider` individually for a subtree that overrides one
of them. No component requires `<Vipengele>`: one that works under it works under the providers it
composes.

## Publishing prerequisite

npm enrols a trusted publisher only on a name the registry holds, and `@vipengele/react` is a
brand-new package name. A human makes a one-time manual `0.0.0`
placeholder publish with a token and enrols the trusted publisher before a `react-ui@v...` release
tag can publish the package (ADR-0015, ADR-0055).
