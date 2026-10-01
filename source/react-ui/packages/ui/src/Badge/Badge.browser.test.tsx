import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { BadgeVariant } from "./Badge.js";
import { Badge } from "./Badge.js";

/**
 * A subtle badge's fill is a `var()` read of a token that is itself a relative colour derived
 * from a `light-dark()` role, which jsdom never resolves. Only a real engine shows whether the
 * token reaches the badge, and whether it follows the colour mode the provider forces.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByText` starts matching more than one badge.
afterEach(cleanup);

type ColorMode = "light" | "dark";

/** The token each subtle variant fills with. */
const SUBTLE_FILLS: { variant: BadgeVariant; token: string }[] = [
  { variant: "neutral", token: "--vpg-surface-sunken" },
  { variant: "accent", token: "--vpg-accent-wash" },
  { variant: "danger", token: "--vpg-danger-wash" },
];

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.backgroundColor = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
}

/** Mounts a subtle badge of `variant` under a provider forcing `colorMode`, and reads its
 * computed fill alongside what `token` resolves to in the same subtree. */
function fillOf(variant: BadgeVariant, token: string, colorMode: ColorMode) {
  render(
    <ThemeProvider colorMode={colorMode}>
      <Badge variant={variant} emphasis="subtle">
        Status
      </Badge>
    </ThemeProvider>,
  );
  const fill = getComputedStyle(screen.getByText("Status")).backgroundColor;
  const expected = resolvedColour(token);
  cleanup();
  return { fill, expected };
}

describe("a subtle Badge's fill under a real ThemeProvider", () => {
  it.each(SUBTLE_FILLS)("fills the $variant badge with $token in both colour modes", ({ variant, token }) => {
    for (const colorMode of ["light", "dark"] as const) {
      const { fill, expected } = fillOf(variant, token, colorMode);

      // An unresolved read serialises the token text; a rule that never matched, or a token
      // that resolved to nothing, leaves the initial transparent fill.
      expect(fill).not.toMatch(/var\(|--vpg-/);
      expect(fill).not.toBe("");
      expect(fill).not.toBe("rgba(0, 0, 0, 0)");
      expect(fill).not.toBe("transparent");
      expect(fill).toBe(expected);
    }
  });

  it.each(SUBTLE_FILLS)("moves the $variant badge's fill between the two colour modes", ({ variant, token }) => {
    // Every one of these fills derives from a `light-dark()` role over two distinct values, so
    // equal fills mean the badge stayed in one mode's palette while the provider switched.
    expect(fillOf(variant, token, "light").fill).not.toBe(fillOf(variant, token, "dark").fill);
  });
});
