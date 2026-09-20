import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";

/**
 * Guards the invariant of ADR-0007 for the motion durations: a `--vpg-*` property whose
 * value depends on an environment condition the cascade resolves is assigned by the base
 * stylesheet and is absent from `createTheme`'s output.
 *
 * The fixture is a real `<ThemeProvider>` with the preference emulated in the engine, because
 * that is the only arrangement the defect shows up in. `ThemeProvider` spreads the theme into
 * an inline `style`, and an inline declaration beats any non-`!important` rule for the same
 * property on the same element — a media query included, since a media query is still a
 * stylesheet rule. A duration emitted by `createTheme` would therefore read 120ms under a
 * `prefers-reduced-motion: reduce` block that parses, matches, and never applies.
 *
 * jsdom resolves no custom properties and emulates no media features, so these assertions only
 * mean anything in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its root mounted.
afterEach(cleanup);

const DURATIONS = ["--vpg-duration-fast", "--vpg-duration-normal", "--vpg-duration-slow"] as const;

/** The durations the base stylesheet's `.vpg-root` rule declares. */
const FULL_MOTION = {
  "--vpg-duration-fast": "120ms",
  "--vpg-duration-normal": "200ms",
  "--vpg-duration-slow": "320ms",
} as const;

/**
 * Drives Chromium's own media emulation over CDP, which is what makes
 * `(prefers-reduced-motion: reduce)` match for real: the page is queried by the engine exactly
 * as it would be on a machine whose owner has asked for reduced motion. Passing no feature
 * clears the override and returns the page to the host's preference.
 */
async function emulateReducedMotion(value: "reduce" | "no-preference" | null) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-reduced-motion", value }],
  });
}

afterEach(async () => {
  await emulateReducedMotion(null);
});

/** Renders a provider and reads the durations computed on its `.vpg-root`. */
function resolveDurations(): Record<string, string> {
  const { container } = render(createElement(ThemeProvider, null));

  const root = container.querySelector(".vpg-root");
  if (!root) {
    throw new Error("ThemeProvider rendered no .vpg-root");
  }

  const computed = getComputedStyle(root);
  return Object.fromEntries(DURATIONS.map((name) => [name, computed.getPropertyValue(name).trim()]));
}

describe("the motion durations under a ThemeProvider", () => {
  it("resolves each duration to its full-motion value when no reduced motion is asked for", async () => {
    await emulateReducedMotion("no-preference");

    const durations = resolveDurations();

    for (const [name, value] of Object.entries(FULL_MOTION)) {
      expect(durations[name], name).toBe(value);
    }
  });

  it("collapses every duration to an imperceptible one under prefers-reduced-motion: reduce", async () => {
    await emulateReducedMotion("reduce");

    const durations = resolveDurations();

    for (const name of DURATIONS) {
      expect(durations[name], name).toBe("0.01ms");
    }
  });

  it("keeps a collapsed duration non-zero, so a transition still fires transitionend", async () => {
    await emulateReducedMotion("reduce");

    for (const value of Object.values(resolveDurations())) {
      expect(Number.parseFloat(value)).toBeGreaterThan(0);
    }
  });
});
