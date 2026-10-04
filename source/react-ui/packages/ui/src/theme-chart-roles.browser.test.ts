import { createTheme, type Theme, ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The six chart series roles are `oklch(from var(--vpg-accent) …)` expressions, so whether they
 * read as six distinguishable colours depends on the accent they resolve against — and that
 * accent is a `light-dark()` only the cascade picks an arm of. A string comparison in a unit test
 * proves the expression; only the engine's resolved colour proves the separation.
 *
 * The separation is measured on painted pixels, not on the computed value. The computed value of
 * an `oklch()` colour keeps its unclamped chroma, but a role outside sRGB is gamut-mapped when it
 * is drawn, and two roles can sit far apart as expressions and land close together on screen.
 *
 * jsdom resolves no custom properties, so these assertions only mean anything in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its root mounted.
afterEach(cleanup);

const ROLES = ["--vpg-chart-1", "--vpg-chart-2", "--vpg-chart-3", "--vpg-chart-4", "--vpg-chart-5", "--vpg-chart-6"] as const;

const MODES = ["light", "dark"] as const;

/** The smallest OKLab distance at which two series still read as different colours. */
const MIN_DISTANCE = 0.08;

/** The accents the separation must hold for, from fully saturated down to achromatic. */
const SEEDS = {
  default: undefined,
  green: "oklch(0.6 0.2 150)",
  "low-chroma": "oklch(0.6 0.03 250)",
  achromatic: "oklch(0.6 0 0)",
} as const;

/**
 * Renders a provider in `mode` around one probe per chart role and reads back the colour each
 * probe's `color` computes to.
 *
 * The colours come off `color` rather than off the property itself: the computed value of an
 * unregistered custom property is its substituted token stream, so reading the property back
 * hands over the `oklch(from light-dark(…) …)` expression unresolved. Consumed as a colour, the
 * same expression is resolved by the engine — which is how a chart consumes it.
 */
function resolveRoles(mode: "light" | "dark", theme: Theme = createTheme()): string[] {
  const { container } = render(
    createElement(
      ThemeProvider,
      { colorMode: mode, theme },
      ROLES.map((name) => createElement("div", { key: name, "data-role": name, style: { color: `var(${name})` } })),
    ),
  );

  const colours = ROLES.map((name) => {
    const probe = container.querySelector(`[data-role="${name}"]`);
    if (!probe) {
      throw new Error(`ThemeProvider rendered no probe for ${name}`);
    }
    return getComputedStyle(probe).color;
  });
  cleanup();
  return colours;
}

/** Paints `colour` onto an sRGB canvas and returns the pixel's 8-bit channels. */
function paint(colour: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("the engine provided no 2D canvas context");
  }
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Converts 8-bit sRGB channels to OKLab, per Björn Ottosson's reference matrices. */
function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const linear = (channel: number) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** The smallest Euclidean OKLab distance between any two of `colours`, as painted. */
function minPairwiseDistance(colours: string[]): number {
  const points = colours.map((colour) => toOklab(paint(colour)));
  let min = Number.POSITIVE_INFINITY;
  points.forEach(([l1, a1, b1], i) => {
    for (const [l2, a2, b2] of points.slice(i + 1)) {
      min = Math.min(min, Math.hypot(l1 - l2, a1 - a2, b1 - b2));
    }
  });
  return min;
}

describe("the chart series roles under a ThemeProvider", () => {
  for (const [label, accent] of Object.entries(SEEDS)) {
    for (const mode of MODES) {
      it(`resolves six distinct roles at least ${MIN_DISTANCE} apart in OKLab for the ${label} accent in ${mode} mode`, () => {
        const colours = resolveRoles(mode, createTheme(accent ? { accent } : {}));

        expect(new Set(colours).size).toBe(ROLES.length);
        expect(minPairwiseDistance(colours)).toBeGreaterThanOrEqual(MIN_DISTANCE);
      });
    }
  }

  it("resolves every role to a different colour in each mode", () => {
    const light = resolveRoles("light");
    const dark = resolveRoles("dark");

    for (const [index, name] of ROLES.entries()) {
      expect(light[index], name).not.toBe(dark[index]);
    }
  });
});

describe("a chart role override under a ThemeProvider", () => {
  it("resolves the overridden role to the override and leaves the others derived", () => {
    const derived = resolveRoles("light");
    const overridden = resolveRoles("light", createTheme({}, { "--vpg-chart-3": "oklch(0.7 0.15 40)" }));

    expect(overridden[2]).toBe("oklch(0.7 0.15 40)");
    expect(overridden.filter((_, index) => index !== 2)).toEqual(derived.filter((_, index) => index !== 2));
  });

  it("follows the colour mode when the override is a light-dark() expression", () => {
    const theme = createTheme({}, { "--vpg-chart-3": "light-dark(oklch(0.7 0.15 40), oklch(0.8 0.1 40))" });

    expect(resolveRoles("light", theme)[2]).toBe("oklch(0.7 0.15 40)");
    expect(resolveRoles("dark", theme)[2]).toBe("oklch(0.8 0.1 40)");
  });
});
