import { cleanup, render } from "@testing-library/react";
import { type ColorMode, ThemeProvider } from "@vipengele/react-tokens";
import { afterEach, describe, expect, it } from "vitest";
import { StackedBarChart, type StackedBarChartProps, type StackedBarChartRow, type StackedBarChartSeries } from "./StackedBarChart.js";

/**
 * A bar's width comes from the plot's real width and how many categories share it, and its fill is
 * a `light-dark()` role. jsdom neither lays out the one nor resolves the other, so both are only
 * observable in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this
// every render after the first sits beside the previous one.
afterEach(cleanup);

const WIDTH = 360;
const HEIGHT = 300;

const series: StackedBarChartSeries[] = [
  { key: "passed", label: "Passed", colorIndex: 3 },
  { key: "failed", label: "Failed", color: "danger" },
];

/** Runs 1 to `count`, each with passed and failed counts. */
const runs = (count: number): StackedBarChartRow[] =>
  Array.from({ length: count }, (_, index) => ({ run: index + 1, passed: 3 + (index % 4), failed: 1 + (index % 3) }));

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

/**
 * Mounts the chart in `colorMode` and resolves once it has drawn `segmentCount` segments, with the
 * plot and each series' segments in client coordinates, in x order.
 */
async function renderChart(
  props: Partial<StackedBarChartProps> & Pick<StackedBarChartProps, "data">,
  segmentCount: number,
  colorMode?: ColorMode,
) {
  render(
    <ThemeProvider colorMode={colorMode}>
      <div style={{ width: WIDTH }}>
        <StackedBarChart height={HEIGHT} xKey="run" series={series} {...props} />
      </div>
    </ThemeProvider>,
  );
  // The plot's clip rectangle is the plot area in the surface's own coordinates.
  const clip = await waitFor(() => document.querySelector<SVGRectElement>(".recharts-surface clipPath rect"));
  await waitFor(() => (document.querySelectorAll("path.recharts-rectangle").length === segmentCount ? true : null));
  const box = (clip.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
  const left = box.left + clip.x.baseVal.value;
  const plot = { left, right: left + clip.width.baseVal.value };
  const segmentsOf = (label: string) =>
    [...document.querySelectorAll<SVGPathElement>(`path.recharts-rectangle[name='${label}']`)].sort(
      (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
    );
  return { plot, passed: segmentsOf("Passed"), failed: segmentsOf("Failed") };
}

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

const rect = (segment: SVGPathElement | undefined) => (segment as SVGPathElement).getBoundingClientRect();
const centre = (box: DOMRect) => box.left + box.width / 2;

describe("StackedBarChart layout in a real engine", () => {
  it("draws a lone category's bar visibly wide, centred in the plot", async () => {
    const { plot, passed, failed } = await renderChart({ data: runs(1) }, 2);
    const bar = rect(passed[0]);

    expect(bar.width).toBeGreaterThanOrEqual(24);
    expect(bar.width).toBeLessThanOrEqual(48);
    expect(rect(failed[0]).width).toBe(bar.width);
    expect(centre(bar)).toBeCloseTo((plot.left + plot.right) / 2, 0);
  });

  it("caps the bars' width when few categories share the plot", async () => {
    const { passed } = await renderChart({ data: runs(2) }, 4);

    expect(passed.map((segment) => rect(segment).width)).toEqual([48, 48]);
  });

  it("narrows the bars as categories crowd the plot, keeping them inside it", async () => {
    const { plot, passed } = await renderChart({ data: runs(30) }, 60);
    const boxes = passed.map(rect);

    expect(boxes[0]?.width).toBeGreaterThan(0);
    expect(boxes[0]?.width).toBeLessThan(48);
    expect(boxes[0]?.left).toBeGreaterThanOrEqual(plot.left);
    expect(boxes.at(-1)?.right).toBeLessThanOrEqual(plot.right);
  });

  it("stacks each category's segments into one bar, the later series on top", async () => {
    const { passed, failed } = await renderChart({ data: runs(5) }, 10);

    passed.forEach((segment, index) => {
      const below = rect(segment);
      const above = rect(failed[index]);
      expect(above.left).toBeCloseTo(below.left, 0);
      expect(above.width).toBeCloseTo(below.width, 0);
      expect(above.bottom).toBeCloseTo(below.top, 0);
    });
  });
});

describe("StackedBarChart colour in a real engine", () => {
  it.each(["light", "dark"] as const)("fills each series with the role its colorIndex or color names, in %s mode", async (colorMode) => {
    const { passed, failed } = await renderChart({ data: runs(2) }, 4, colorMode);

    expect(getComputedStyle(passed[0] as SVGPathElement).fill).toBe(resolvedColour("--vpg-chart-3"));
    expect(getComputedStyle(failed[0] as SVGPathElement).fill).toBe(resolvedColour("--vpg-danger"));
  });

  it("follows the colour mode", async () => {
    const fillIn = async (colorMode: ColorMode) => {
      const { passed } = await renderChart({ data: runs(2) }, 4, colorMode);
      const fill = getComputedStyle(passed[0] as SVGPathElement).fill;
      cleanup();
      return fill;
    };

    expect(await fillIn("dark")).not.toBe(await fillIn("light"));
  });
});
