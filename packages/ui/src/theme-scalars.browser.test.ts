import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Guards the invariant of ADR-0007 for the three ramp scalars: a `--tandiko-*` property whose
 * value depends on colour mode is assigned by the base stylesheet and is absent from
 * `createTheme`'s output.
 *
 * The fixture is a real `<ThemeProvider colorMode="dark">`, not a hand-written stylesheet rule
 * carrying the light values. That distinction is the whole test: `ThemeProvider` spreads the
 * theme into an inline `style`, and an inline declaration beats any non-`!important` rule for
 * the same property on the same element — which is the element the dark selectors match. A
 * rule-based fixture assigns the light values at a level the dark rule can beat, so it stays
 * green whether or not the shipped theme emits these properties inline.
 *
 * jsdom resolves no custom properties, so these assertions only mean anything in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its root mounted.
afterEach(cleanup);

/** The dark values the base stylesheet's dark block declares. */
const DARK_SCALARS = {
  "--tandiko-state-shift": "0.05",
  "--tandiko-lift": "0.055",
  "--tandiko-sink": "0.025",
} as const;

/** The light values the base stylesheet's `.tandiko-root` rule declares. */
const LIGHT_SCALARS = {
  "--tandiko-state-shift": "-0.05",
  "--tandiko-lift": "0.02",
  "--tandiko-sink": "0.04",
} as const;

/** Renders a provider in `mode` and reads the scalars computed on its `.tandiko-root`. */
function resolveScalars(mode: "light" | "dark"): Record<string, string> {
  const { container } = render(
    createElement(ThemeProvider, { colorMode: mode }),
  );

  const root = container.querySelector(".tandiko-root");
  if (!root) {
    throw new Error("ThemeProvider rendered no .tandiko-root");
  }

  const computed = getComputedStyle(root);
  return Object.fromEntries(
    Object.keys(DARK_SCALARS).map((name) => [
      name,
      computed.getPropertyValue(name).trim(),
    ]),
  );
}

describe("the ramp scalars under a ThemeProvider", () => {
  it("resolves each scalar to its dark value in dark mode", () => {
    const scalars = resolveScalars("dark");

    for (const [name, value] of Object.entries(DARK_SCALARS)) {
      expect(scalars[name], name).toBe(value);
    }
  });

  it("resolves each scalar to its light value in light mode", () => {
    const scalars = resolveScalars("light");

    for (const [name, value] of Object.entries(LIGHT_SCALARS)) {
      expect(scalars[name], name).toBe(value);
    }
  });

  it("shifts state lightness in opposite directions in the two modes", () => {
    const light = Number(resolveScalars("light")["--tandiko-state-shift"]);
    const dark = Number(resolveScalars("dark")["--tandiko-state-shift"]);

    expect(light).toBeLessThan(0);
    expect(dark).toBeGreaterThan(0);
  });
});
