import { createContext, useContext, useSyncExternalStore } from "react";
import type { ColorMode, ColorModePreference } from "./theme.js";

/**
 * What the nearest `ThemeProvider` shares with `useColorMode()`: its mode preference and the
 * setter for it. It carries no `Theme` — theme values reach components only through `--vpg-*`
 * custom properties (ADR-0001).
 */
export interface ColorModeContextValue {
  colorMode: ColorModePreference;
  setColorMode: (colorMode: ColorModePreference) => void;
}

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

/** What `useColorMode()` returns. */
export interface UseColorModeResult extends ColorModeContextValue {
  /**
   * The mode the nearest `ThemeProvider` paints in. An explicit preference resolves to itself.
   * `"system"` resolves the way the base stylesheet does — the host page's `<html data-theme>`
   * when it is `"light"` or `"dark"`, otherwise `prefers-color-scheme` — and is `undefined` on
   * the server and on the first hydration pass, where neither can be read.
   */
  resolvedColorMode: ColorMode | undefined;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemMediaQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : undefined;
}

// Mirrors the base stylesheet's mode rules: `[data-theme="dark"]` paints dark under any media,
// `[data-theme="light"]` excludes the media rule, and any other value falls through to it.
function getSystemColorMode(): ColorMode {
  const dataTheme = document.documentElement.getAttribute("data-theme");
  if (dataTheme === "dark" || dataTheme === "light") return dataTheme;
  return systemMediaQuery()?.matches ? "dark" : "light";
}

function getServerSystemColorMode(): undefined {
  return undefined;
}

function subscribeToSystemColorMode(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const query = systemMediaQuery();
  query?.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    query?.removeEventListener("change", onChange);
  };
}

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Reads and sets the mode preference of the nearest `ThemeProvider`. Nested providers are
 * independent: the hook binds to the closest one only, and setting it leaves every other
 * provider's mode alone.
 *
 * Throws when called outside a `ThemeProvider`, since there is no mode to read or set.
 */
export function useColorMode(): UseColorModeResult {
  const context = useContext(ColorModeContext);
  if (context === null) {
    throw new Error("useColorMode() must be called inside a ThemeProvider.");
  }
  const { colorMode, setColorMode } = context;
  const explicit = colorMode === "system" ? undefined : colorMode;

  // An explicit preference needs no subscription and resolves identically on the server, so
  // only "system" reads the document and the media query.
  const resolvedColorMode = useSyncExternalStore<ColorMode | undefined>(
    explicit === undefined ? subscribeToSystemColorMode : subscribeToNothing,
    explicit === undefined ? getSystemColorMode : () => explicit,
    explicit === undefined ? getServerSystemColorMode : () => explicit,
  );

  return { colorMode, setColorMode, resolvedColorMode };
}
