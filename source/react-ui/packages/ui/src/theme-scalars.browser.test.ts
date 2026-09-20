import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Guards the invariant of ADR-0007 for the three ramp scalars: a `--vpg-*` property whose
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
  "--vpg-state-shift": "0.05",
  "--vpg-lift": "0.055",
  "--vpg-sink": "0.025",
} as const;

/** The light values the base stylesheet's `.vpg-root` rule declares. */
const LIGHT_SCALARS = {
  "--vpg-state-shift": "-0.05",
  "--vpg-lift": "0.02",
  "--vpg-sink": "0.04",
} as const;

/** Renders a provider in `mode` and reads the scalars computed on its `.vpg-root`. */
function resolveScalars(mode: "light" | "dark"): Record<string, string> {
  const { container } = render(createElement(ThemeProvider, { colorMode: mode }));

  const root = container.querySelector(".vpg-root");
  if (!root) {
    throw new Error("ThemeProvider rendered no .vpg-root");
  }

  const computed = getComputedStyle(root);
  return Object.fromEntries(Object.keys(DARK_SCALARS).map((name) => [name, computed.getPropertyValue(name).trim()]));
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
    const light = Number(resolveScalars("light")["--vpg-state-shift"]);
    const dark = Number(resolveScalars("dark")["--vpg-state-shift"]);

    expect(light).toBeLessThan(0);
    expect(dark).toBeGreaterThan(0);
  });
});

/**
 * The pixel lengths the default `0.5rem` radius seed derives to at the document's 16px root
 * font size: the seed itself, then its ×0.75 inner step and its ×1.5 outer step.
 *
 * These are the measured design target — 6–8px inner, 10–12px outer — and a `calc()` string in
 * a unit test proves only the expression. Reading the resolved length is what proves the target
 * is met.
 */
const DEFAULT_RADII = {
  "--vpg-radius": "8px",
  "--vpg-radius-sm": "6px",
  "--vpg-radius-lg": "12px",
} as const;

/**
 * Renders a default-seed provider around one probe per radius token and reads back the length
 * each probe's `border-radius` resolves to.
 *
 * The lengths come off `border-radius` rather than off the property itself: the computed value
 * of an unregistered custom property is its substituted token stream, so reading the property
 * back hands over the `calc()` expression and says nothing about pixels. Consumed as a length,
 * the same expression is resolved by the engine — which is how a component consumes it.
 */
function resolveRadii(): Record<string, string> {
  const names = Object.keys(DEFAULT_RADII);
  const { container } = render(
    createElement(
      ThemeProvider,
      null,
      names.map((name) => createElement("div", { key: name, "data-radius": name, style: { borderRadius: `var(${name})` } })),
    ),
  );

  return Object.fromEntries(
    names.map((name) => {
      const probe = container.querySelector(`[data-radius="${name}"]`);
      if (!probe) {
        throw new Error(`ThemeProvider rendered no probe for ${name}`);
      }
      return [name, getComputedStyle(probe).borderTopLeftRadius];
    }),
  );
}

describe("the radius ladder under a ThemeProvider", () => {
  it("resolves each step to the pixel length the default seed derives", () => {
    const radii = resolveRadii();

    for (const [name, length] of Object.entries(DEFAULT_RADII)) {
      expect(radii[name], name).toBe(length);
    }
  });
});
