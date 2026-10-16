import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StatTileStatusTone } from "./StatTile.js";
import { StatTile } from "./StatTile.js";

/**
 * The value's family comes from a `var()` read of `--vpg-font-mono`, and each tone's glyph disc
 * reads a status colour and its `-contrast` ink from tokens derived from `light-dark()` roles.
 * jsdom resolves none of that; only a real engine shows whether the tokens reach the tile.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous one.
afterEach(cleanup);

const STATUS_TONES: StatTileStatusTone[] = ["success", "warning", "info", "danger"];

/** Resolves a token to the value the engine computes for `property` inside the mounted root. */
function resolved(property: "color" | "backgroundColor" | "fontFamily", token: string): string {
  const probe = document.createElement("span");
  probe.style[property] = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

function mount(colorMode: "light" | "dark", tone?: StatTileStatusTone) {
  const { container } = render(
    <ThemeProvider colorMode={colorMode}>
      {tone === undefined ? (
        <StatTile label="Coverage" value="92%" />
      ) : (
        <StatTile label="Coverage" value="92%" tone={tone} toneLabel="Meaning" />
      )}
    </ThemeProvider>,
  );
  return container;
}

describe("a StatTile's value under a real ThemeProvider", () => {
  it("sets the value in the resolved monospace family", () => {
    const container = mount("light");
    const value = container.querySelector(".vpg-stat-tile-value") as HTMLElement;
    const family = getComputedStyle(value).fontFamily;
    expect(family).not.toMatch(/var\(|--vpg-/);
    expect(family).not.toBe("");
    expect(family).toBe(resolved("fontFamily", "--vpg-font-mono"));
  });

  it("sets the value in tabular figures", () => {
    const container = mount("light");
    const value = container.querySelector(".vpg-stat-tile-value") as HTMLElement;
    expect(getComputedStyle(value).fontVariantNumeric).toBe("tabular-nums");
  });

  it("gives the value no animation or transition", () => {
    const container = mount("light");
    const style = getComputedStyle(container.querySelector(".vpg-stat-tile-value") as HTMLElement);
    expect(style.animationName).toBe("none");
    expect(Number.parseFloat(style.transitionDuration)).toBe(0);
    expect(style.transitionProperty).toMatch(/^(none|all)$/);
  });

  it("gives the placeholder the value's font metrics", () => {
    render(
      <ThemeProvider colorMode="light">
        <StatTile label="Coverage" value={null} />
      </ThemeProvider>,
    );
    const placeholder = getComputedStyle(screen.getByText("—"));
    expect(placeholder.fontFamily).toBe(resolved("fontFamily", "--vpg-font-mono"));
    expect(placeholder.fontVariantNumeric).toBe("tabular-nums");
  });
});

describe("a StatTile's glyph disc under a real ThemeProvider", () => {
  it.each(STATUS_TONES)("fills the %s disc with its status colour in its contrast ink in both colour modes", (tone) => {
    for (const colorMode of ["light", "dark"] as const) {
      const container = mount(colorMode, tone);
      const glyph = container.querySelector(".vpg-stat-tile-icon") as SVGElement;
      const style = getComputedStyle(glyph);
      const fill = style.backgroundColor;
      const ink = style.color;
      const expectedFill = resolved("backgroundColor", `--vpg-${tone}`);
      const expectedInk = resolved("color", `--vpg-${tone}-contrast`);
      cleanup();

      // An unresolved read serialises the token text; a rule that never matched leaves the
      // initial transparent fill.
      expect(fill).not.toMatch(/var\(|--vpg-/);
      expect(fill).not.toBe("rgba(0, 0, 0, 0)");
      expect(fill).toBe(expectedFill);
      expect(ink).toBe(expectedInk);
      expect(ink).not.toBe(fill);
    }
  });
});
