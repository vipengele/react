import { type ComponentPropsWithoutRef, type CSSProperties, useCallback, useMemo, useState } from "react";
import { baseStylesheet } from "./base-stylesheet.js";
import { ColorModeContext, type ColorModeContextValue } from "./color-mode.js";
import { type ColorModePreference, createTheme, type Theme } from "./theme.js";

const DEFAULT_THEME = createTheme();

export interface ThemeProviderProps extends ComponentPropsWithoutRef<"div"> {
  /** The `Theme` to scope to this subtree. Defaults to `createTheme()`. */
  theme?: Theme;
  /**
   * Controls the mode preference for this subtree; `setColorMode` from `useColorMode()` then
   * only reports through `onColorModeChange`. `'light'` and `'dark'` write `data-vpg-mode`;
   * `'system'` writes no attribute at all, which is what lets the host page's `[data-theme]`
   * or `prefers-color-scheme` fall through via the base stylesheet. Omitted, the provider
   * holds the preference itself, starting from `defaultColorMode`.
   */
  colorMode?: ColorModePreference;
  /** The initial mode preference when `colorMode` is omitted. Defaults to `'system'`. */
  defaultColorMode?: ColorModePreference;
  /** Called with every preference `setColorMode` from `useColorMode()` is given. */
  onColorModeChange?: (colorMode: ColorModePreference) => void;
}

/**
 * Applies a `Theme` as inline custom properties on a `.vpg-root` element of its own, and owns
 * the mode preference `useColorMode()` reads and sets for its subtree.
 *
 * Nothing is written to `:root` or `document.documentElement`, so two providers on one
 * page are independently themed and neither can leak into the other or into the host.
 * Components consume the theme through CSS custom properties in their own stylesheets —
 * there is deliberately no `useTheme()` hook, and the context the provider shares carries
 * the mode preference only, never the `Theme` (ADR-0001).
 */
export function ThemeProvider({
  theme = DEFAULT_THEME,
  colorMode,
  defaultColorMode = "system",
  onColorModeChange,
  className,
  style,
  children,
  ...rest
}: ThemeProviderProps) {
  const [uncontrolledColorMode, setUncontrolledColorMode] = useState<ColorModePreference>(defaultColorMode);
  const isControlled = colorMode !== undefined;
  const preference = isControlled ? colorMode : uncontrolledColorMode;

  const setColorMode = useCallback(
    (next: ColorModePreference) => {
      if (!isControlled) setUncontrolledColorMode(next);
      onColorModeChange?.(next);
    },
    [isControlled, onColorModeChange],
  );

  const context = useMemo<ColorModeContextValue>(() => ({ colorMode: preference, setColorMode }), [preference, setColorMode]);

  return (
    <ColorModeContext value={context}>
      <div
        {...rest}
        className={className ? `vpg-root ${className}` : "vpg-root"}
        data-vpg-mode={preference === "system" ? undefined : preference}
        style={{ ...theme, ...style } as CSSProperties}
      >
        {/*
          React 19 hoists and de-duplicates this by `href`, so N providers on a page inject
          one stylesheet. Injecting the CSS as a string rather than importing a `.css` file
          keeps the package free of the import side effect that `"sideEffects": false` would
          otherwise have to carve an exception for.
        */}
        <style href="vpg-base" precedence="vpg-base">
          {baseStylesheet}
        </style>
        {children}
      </div>
    </ColorModeContext>
  );
}
