import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Separator } from "./Separator.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one separator.
afterEach(cleanup);

const ROW_WIDTH = 300;
const ROW_HEIGHT = 80;

/** Serialisations of a colour that paints nothing. */
const TRANSPARENT = ["rgba(0, 0, 0, 0)", "transparent", ""];

/** What `--vpg-border` computes to under the provider, read off a probe's `color`. An unresolved
 * `var()` in the separator's `border` falls back to `currentcolor`, which is opaque, so the line
 * is compared against the token itself and against its own text colour. */
function themeBorderColour() {
  render(
    <ThemeProvider>
      <div data-testid="probe" style={{ color: "var(--vpg-border)" }} />
    </ThemeProvider>,
  );
  return getComputedStyle(screen.getByTestId("probe")).color;
}

function renderHorizontal() {
  render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${ROW_WIDTH}px` }}>
        <Separator />
      </div>
    </ThemeProvider>,
  );
  return { container: screen.getByTestId("container"), separator: screen.getByRole("separator") };
}

/** A vertical separator has no intrinsic length; it takes the row's height from
 * `align-self: stretch`, which only resolves inside a flex or grid container. */
function renderVertical() {
  render(
    <ThemeProvider>
      <div data-testid="row" style={{ display: "flex", width: `${ROW_WIDTH}px`, height: `${ROW_HEIGHT}px` }}>
        <span>Left</span>
        <Separator orientation="vertical" />
        <span>Right</span>
      </div>
    </ThemeProvider>,
  );
  return { row: screen.getByTestId("row"), separator: screen.getByRole("separator") };
}

describe("Separator under a real ThemeProvider", () => {
  it("draws a horizontal separator as a 1px line across its container's full width", () => {
    const { container, separator } = renderHorizontal();

    const box = separator.getBoundingClientRect();
    expect(box.height).toBe(1);
    expect(box.width).toBe(container.getBoundingClientRect().width);
  });

  it("draws a vertical separator as a 1px line spanning its flex row's full height", () => {
    const { row, separator } = renderVertical();

    const box = separator.getBoundingClientRect();
    expect(box.width).toBe(1);
    expect(box.height).toBe(row.getBoundingClientRect().height);
  });

  it("paints a horizontal separator's line in the theme's border colour", () => {
    const { separator } = renderHorizontal();

    const colour = getComputedStyle(separator).borderTopColor;
    expect(TRANSPARENT).not.toContain(colour);
    expect(colour).not.toBe(getComputedStyle(separator).color);
    expect(colour).toBe(themeBorderColour());
  });

  it("paints a vertical separator's line in the theme's border colour", () => {
    const { separator } = renderVertical();

    const colour = getComputedStyle(separator).borderLeftColor;
    expect(TRANSPARENT).not.toContain(colour);
    expect(colour).not.toBe(getComputedStyle(separator).color);
    expect(colour).toBe(themeBorderColour());
  });
});
