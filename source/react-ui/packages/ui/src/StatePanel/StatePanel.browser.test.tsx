import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "../Button/Button.js";
import type { StatePanelVariant } from "./StatePanel.js";
import { StatePanel } from "./StatePanel.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one panel.
afterEach(cleanup);

/** The panel is given a wrapper far wider than its copy, so a centred line and a leading-edge
 * line land at measurably different places. Text that filled the line would sit at the same
 * midpoint under either alignment. */
const PANEL_WIDTH = 600;

/** The midpoint of every line the element's text actually renders on, measured with a `Range`
 * over its contents: padding and alignment live inside an element's border box, so that box's
 * own edges never move with them, and comparing element boxes reads as a centring guard while
 * passing under any alignment. A block whose box is centred still starts each of its own wrapped
 * lines at the leading edge unless the text is aligned too, which only a line short of the full
 * width shows. */
function lineMidpoints(node: Element) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects(), (rect) => rect.left + rect.width / 2);
}

function midpointOf(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return box.left + box.width / 2;
}

function renderPanel(description: string = "Nothing yet.") {
  const result = render(
    <ThemeProvider>
      <div style={{ width: `${PANEL_WIDTH}px` }}>
        <StatePanel
          title="No orders"
          description={description}
          media={<div data-testid="media" style={{ width: "48px", height: "48px", background: "#eee" }} />}
        >
          <Button>Refresh</Button>
        </StatePanel>
      </div>
    </ThemeProvider>,
  );
  const panel = result.container.querySelector(".vpg-state-panel");
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

/** One painted shape per variant's default illustration, each a `<path>` whose paint the class
 * rules in `StatePanel.stylesheet.ts` derive from a role token. The empty box's inside and the
 * error triangle are filled; the magnifier's handle is stroked, so its paint is its stroke. */
const PAINTED_SHAPES: { variant: StatePanelVariant; selector: string; property: "fill" | "stroke" }[] = [
  { variant: "empty", selector: "path.vpg-state-panel-art-inside", property: "fill" },
  { variant: "error", selector: "path.vpg-state-panel-art-alert", property: "fill" },
  { variant: "not-found", selector: "path.vpg-state-panel-art-lens-handle", property: "stroke" },
];

function renderVariant(variant: StatePanelVariant, colorMode: "light" | "dark") {
  const { container } = render(
    <ThemeProvider colorMode={colorMode}>
      <StatePanel variant={variant} title="No orders" description="Nothing yet." />
    </ThemeProvider>,
  );
  return container;
}

/** The computed paint of one shape of a variant's default illustration. A `<path>` is read
 * rather than the `<svg>` because the class rules paint the shapes, not the root. */
function paintOf(variant: StatePanelVariant, selector: string, property: "fill" | "stroke", colorMode: "light" | "dark") {
  const container = renderVariant(variant, colorMode);
  const shape = container.querySelector(selector);
  expect(shape, `${variant} renders no ${selector}`).not.toBeNull();
  const paint = getComputedStyle(shape as SVGElement)[property];
  cleanup();
  return paint;
}

describe("StatePanel under a real ThemeProvider", () => {
  it("stacks the media, title, description and actions in that order", () => {
    renderPanel();

    const boxes = [
      screen.getByTestId("media"),
      screen.getByRole("heading", { name: "No orders" }),
      screen.getByText("Nothing yet."),
      screen.getByRole("button", { name: "Refresh" }),
    ].map((node) => node.getBoundingClientRect());

    boxes.reduce((previous, box) => {
      expect(box.top).toBeGreaterThanOrEqual(previous.bottom);
      return box;
    });
  });

  it("centres the title and description across the panel's width", () => {
    const panel = renderPanel();
    const panelMidpoint = midpointOf(panel);

    // Sub-pixel: a line of an odd width lands half a pixel to either side of the midpoint.
    for (const node of [screen.getByRole("heading", { name: "No orders" }), screen.getByText("Nothing yet.")]) {
      expect(lineMidpoints(node)).toEqual([expect.closeTo(panelMidpoint, 0)]);
    }
  });

  it("centres every line of a description that wraps", () => {
    const description = "Orders placed from this workspace show up here, together with their delivery status and a link to the invoice.";
    const panel = renderPanel(description);
    const panelMidpoint = midpointOf(panel);

    const midpoints = lineMidpoints(screen.getByText(description));
    expect(midpoints.length).toBeGreaterThan(1);
    for (const midpoint of midpoints) {
      expect(midpoint).toBeCloseTo(panelMidpoint, 0);
    }
  });

  it("stacks the default illustration above the text and centres it", () => {
    const container = renderVariant("empty", "light");
    const panel = container.querySelector(".vpg-state-panel") as HTMLElement;
    const art = container.querySelector(".vpg-state-panel-art") as SVGSVGElement;

    const artBox = art.getBoundingClientRect();
    expect(artBox.width).toBeGreaterThan(0);
    expect(artBox.bottom).toBeLessThanOrEqual(screen.getByRole("heading", { name: "No orders" }).getBoundingClientRect().top);
    expect(artBox.left + artBox.width / 2).toBeCloseTo(midpointOf(panel), 0);
  });
});

describe("the default illustrations' paint", () => {
  it.each(PAINTED_SHAPES)(
    "resolves the $variant illustration's $property to a concrete colour in both colour modes",
    ({ variant, selector, property }) => {
      for (const colorMode of ["light", "dark"] as const) {
        const paint = paintOf(variant, selector, property, colorMode);

        // An unresolved read serialises the token text; an unmatched class rule leaves the
        // SVG initial paint — black for a fill, `none` for a stroke.
        expect(paint).not.toMatch(/var\(|--vpg-/);
        expect(paint).not.toBe("none");
        expect(paint).not.toBe("");
        expect(paint).not.toBe("rgb(0, 0, 0)");
      }
    },
  );

  it.each(PAINTED_SHAPES)("moves the $variant illustration's $property between the two colour modes", ({ variant, selector, property }) => {
    // Every one of these paints derives from `--vpg-accent` or `--vpg-ink`, both of which are
    // `light-dark()` over two distinct values. Equal paints mean the drawing stayed in one mode's
    // palette while the panel around it switched.
    expect(paintOf(variant, selector, property, "light")).not.toBe(paintOf(variant, selector, property, "dark"));
  });

  it("paints the error triangle's body and its rounded corners the same accent", () => {
    // The corners are the stroke's round joins, so a stroke that parts company with the fill
    // draws a ring around the triangle rather than rounding it.
    for (const colorMode of ["light", "dark"] as const) {
      const fill = paintOf("error", "path.vpg-state-panel-art-alert", "fill", colorMode);
      expect(paintOf("error", "path.vpg-state-panel-art-alert", "stroke", colorMode)).toBe(fill);
    }
  });
});
