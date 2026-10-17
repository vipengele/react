import { cleanup, render } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Bar, BarChart } from "recharts";
import { afterEach, describe, expect, it } from "vitest";
import type { ChartRow } from "../types.js";
import { type CartesianChartAxis, CartesianChartFrame } from "./CartesianChartFrame.js";

/**
 * Whether a bar at the edge of the data fits inside the plot depends on the plot's real width and
 * the bar width derived from it, so it is only observable in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this
// every render after the first sits beside the previous one.
afterEach(cleanup);

const WIDTH = 360;
const HEIGHT = 300;

// Five categories at x = 0, 10, …, 40, given out of order and with one repeated.
const data: ChartRow[] = [
  { t: 20, a: 3 },
  { t: 0, a: 1 },
  { t: 40, a: 5 },
  { t: 10, a: 2 },
  { t: 30, a: 4 },
  { t: 20, a: 3 },
];

/** Resolves until `read` returns a value, or fails after the engine has had a second to lay out. */
async function waitFor<T>(read: () => T | null | undefined): Promise<T> {
  const deadline = performance.now() + 1000;
  for (;;) {
    const value = read();
    if (value != null) return value;
    if (performance.now() > deadline) throw new Error("timed out waiting for the chart");
    await new Promise(requestAnimationFrame);
  }
}

/** Mounts a bar chart in the frame and resolves once it has laid out, with the plot and every bar in client coordinates. */
async function renderBars(axis: CartesianChartAxis) {
  render(
    <ThemeProvider>
      <div style={{ width: WIDTH }}>
        <CartesianChartFrame
          root={BarChart}
          axis={axis}
          chartClassName="vpg-chart-test"
          height={HEIGHT}
          data={data}
          xKey="t"
          series={[{ key: "a", label: "Alpha" }]}
        >
          <Bar dataKey="a" isAnimationActive={false} />
        </CartesianChartFrame>
      </div>
    </ThemeProvider>,
  );
  // The plot's clip rectangle is the plot area in the surface's own coordinates.
  const clip = await waitFor(() => document.querySelector<SVGRectElement>(".recharts-surface clipPath rect"));
  await waitFor(() => (document.querySelectorAll("path.recharts-rectangle").length === data.length ? true : null));
  const box = (clip.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
  const left = box.left + clip.x.baseVal.value;
  const plot = { left, right: left + clip.width.baseVal.value };
  const bars = [...document.querySelectorAll("path.recharts-rectangle")]
    .map((bar) => bar.getBoundingClientRect())
    .sort((a, b) => a.left - b.left);
  return { plot, bars };
}

describe("CartesianChartFrame band axis in a real engine", () => {
  it("keeps the first and last bars wholly inside the plot", async () => {
    const { plot, bars } = await renderBars("band");
    const first = bars[0] as DOMRect;
    const last = bars.at(-1) as DOMRect;

    expect(first.width).toBeGreaterThan(0);
    expect(first.left).toBeGreaterThanOrEqual(plot.left);
    expect(last.right).toBeLessThanOrEqual(plot.right);
  });

  it("leaves as much room beyond each edge bar as between neighbouring bars", async () => {
    const { plot, bars } = await renderBars("band");
    const first = bars[0] as DOMRect;
    const second = bars[1] as DOMRect;
    const last = bars.at(-1) as DOMRect;
    const step = second.left - first.left;
    const centre = (bar: DOMRect) => bar.left + bar.width / 2;

    expect(centre(first) - plot.left).toBeCloseTo(step / 2, 0);
    expect(plot.right - centre(last)).toBeCloseTo(step / 2, 0);
  });

  it("spans the data edge to edge on a numeric axis, so the edge bars overhang the plot", async () => {
    const { plot, bars } = await renderBars("number");
    const first = bars[0] as DOMRect;
    const last = bars.at(-1) as DOMRect;

    expect(first.left).toBeLessThan(plot.left);
    expect(last.right).toBeGreaterThan(plot.right);
  });
});
