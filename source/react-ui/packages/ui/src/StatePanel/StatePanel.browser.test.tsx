import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "../Button/Button.js";
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
});
