import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { baseStylesheet } from "./base-stylesheet.js";
import { type ColorMode, createTheme, type Theme } from "./theme.js";

const DEFAULT_THEME = createTheme();

export interface ThemeProviderProps extends ComponentPropsWithoutRef<"div"> {
  /** The `Theme` to scope to this subtree. Defaults to `createTheme()`. */
  theme?: Theme;
  /**
   * Forces a mode for this subtree. Omitted, no `data-vpg-mode` attribute is written
   * at all, which is what lets the host page's `[data-theme]` or `prefers-color-scheme`
   * fall through via the base stylesheet.
   */
  colorMode?: ColorMode;
}

/**
 * Applies a `Theme` as inline custom properties on a `.vpg-root` element of its own.
 *
 * Nothing is written to `:root` or `document.documentElement`, so two providers on one
 * page are independently themed and neither can leak into the other or into the host.
 * Components consume the result through CSS custom properties in their own stylesheets —
 * there is deliberately no `useTheme()` hook (ADR-0001).
 */
export function ThemeProvider({ theme = DEFAULT_THEME, colorMode, className, style, children, ...rest }: ThemeProviderProps) {
  return (
    <div
      {...rest}
      className={className ? `vpg-root ${className}` : "vpg-root"}
      data-vpg-mode={colorMode}
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
  );
}
