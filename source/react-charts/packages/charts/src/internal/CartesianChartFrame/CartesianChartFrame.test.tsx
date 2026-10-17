import { fireEvent, render } from "@testing-library/react";
import { Bar, BarChart } from "recharts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartRow, ChartSeries } from "../types.js";
import { bandAxis, CartesianChartFrame, type CartesianChartFrameProps } from "./CartesianChartFrame.js";

/**
 * jsdom lays nothing out, so the responsive container would measure itself as zero-sized and
 * withhold the chart. Reporting a fixed size for that one element lets the chart render here;
 * geometry is the browser suite's.
 */
const WIDTH = 600;
const HEIGHT = 300;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const sized = this.classList.contains("recharts-responsive-container");
    const width = sized ? WIDTH : 0;
    const height = sized ? HEIGHT : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const series: ChartSeries[] = [{ key: "a", label: "Alpha" }];

const rows: ChartRow[] = [
  { t: 10, a: 1 },
  { t: 20, a: 2 },
  { t: 30, a: 3 },
  { t: 40, a: 4 },
];

function renderFrame(props: Partial<CartesianChartFrameProps> = {}) {
  return render(
    <CartesianChartFrame root={BarChart} chartClassName="vpg-chart-test" height={HEIGHT} data={rows} xKey="t" series={series} {...props}>
      <Bar dataKey="a" isAnimationActive={false} />
    </CartesianChartFrame>,
  );
}

const zoomLayer = () => document.querySelector(".vpg-chart-zoom");
const resetButton = () => document.querySelector<HTMLButtonElement>("button.vpg-chart-zoom-reset");
const bars = () => document.querySelectorAll(".recharts-bar-rectangle");
const xTicks = () =>
  [...document.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")].map((tick) => tick.textContent);
const markerLines = () => [...document.querySelectorAll<SVGLineElement>(".vpg-chart-marker line")];
const markerLabels = () => [...document.querySelectorAll(".vpg-chart-marker-label")].map((label) => label.textContent);
const gapRects = () => [...document.querySelectorAll<SVGPathElement>(".vpg-chart-gap path")];
const gapLabels = () => [...document.querySelectorAll(".vpg-chart-gap-label")].map((label) => label.textContent);
/** The plot's clip rectangle, which spans the plot area. */
const plotOf = () => {
  const clip = document.querySelector<SVGRectElement>(".recharts-surface clipPath rect") as SVGRectElement;
  return { x: Number(clip.getAttribute("x")), width: Number(clip.getAttribute("width")) };
};

describe("bandAxis", () => {
  it("ticks each distinct x value in ascending order and pads the domain by half the smallest step", () => {
    const data: ChartRow[] = [{ t: 30 }, { t: 0 }, { t: 10 }, { t: 30 }, { t: 15 }];

    expect(bandAxis(data, "t")).toStrictEqual({ domain: [-2.5, 32.5], ticks: [0, 10, 15, 30] });
  });

  it("skips rows without a finite x value", () => {
    const data: ChartRow[] = [{ t: 4 }, { t: null }, {}, { t: Number.NaN }, { t: Number.POSITIVE_INFINITY }, { t: 2 }];

    expect(bandAxis(data, "t")).toStrictEqual({ domain: [1, 5], ticks: [2, 4] });
  });

  it("centres a single value in a unit step", () => {
    expect(bandAxis([{ t: 7 }, { t: 7 }], "t")).toStrictEqual({ domain: [6.5, 7.5], ticks: [7] });
  });

  it("takes no step from a near-coincident pair of values", () => {
    const data: ChartRow[] = [{ t: 0 }, { t: 100 }, { t: 100.000_001 }, { t: 300 }];
    const axis = bandAxis(data, "t");

    expect(axis?.domain[0]).toBeCloseTo(-50);
    expect(axis?.domain[1]).toBeCloseTo(350);
  });

  it("takes no step from a gap exactly at the coincidence threshold", () => {
    // The gap of 1 is exactly 1e-4 of the widest gap, 10000, so the step is 10000.
    const data: ChartRow[] = [{ t: 0 }, { t: 10_000 }, { t: 10_001 }];

    expect(bandAxis(data, "t")).toStrictEqual({ domain: [-5000, 15_001], ticks: [0, 10_000, 10_001] });
  });

  it("is null when no row has a finite x value", () => {
    expect(bandAxis([{ t: null }, {}], "t")).toBeNull();
    expect(bandAxis([], "t")).toBeNull();
  });
});

describe("CartesianChartFrame", () => {
  describe("on a numeric axis", () => {
    it("mounts the zoom layer and, while zoomed, the reset control", () => {
      const onZoomChange = vi.fn();
      renderFrame({ zoom: { start: 20, end: 30 }, onZoomChange });

      expect(zoomLayer()).not.toBeNull();
      expect(bars()).toHaveLength(2);
      fireEvent.click(resetButton() as HTMLButtonElement);
      expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(null);
    });

    it("is the default axis", () => {
      renderFrame();

      expect(zoomLayer()).not.toBeNull();
      expect(resetButton()).toBeNull();
    });
  });

  describe("on a band axis", () => {
    it("ticks every category and mounts neither the zoom layer nor the reset control", () => {
      renderFrame({ axis: "band" });

      expect(xTicks()).toEqual(["10", "20", "30", "40"]);
      expect(zoomLayer()).toBeNull();
      expect(resetButton()).toBeNull();
    });

    it("ignores the zoom, drawing every row and never reporting a zoom change", () => {
      const onZoomChange = vi.fn();
      renderFrame({ axis: "band", zoom: { start: 20, end: 30 }, onZoomChange });

      expect(bars()).toHaveLength(rows.length);
      expect(zoomLayer()).toBeNull();
      expect(resetButton()).toBeNull();
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("draws data without a finite x value without failing", () => {
      const { container } = renderFrame({ axis: "band", data: [{ a: 1 }] });

      expect(container.querySelector(".vpg-chart-container")).toHaveClass("vpg-chart-test");
      expect(zoomLayer()).toBeNull();
    });

    // The rows sit at x = 10, 20, 30, 40, so the padded domain runs from 5 to 45.
    it("draws the markers within the padded domain beyond the first and last x value, and none beyond it", () => {
      renderFrame({
        axis: "band",
        markers: [
          { x: 4, label: "Before" },
          { x: 7, label: "First" },
          { x: 42, label: "Last" },
          { x: 46, label: "After" },
        ],
      });
      const plot = plotOf();
      const [first, last] = markerLines().map((line) => Number(line.getAttribute("x1")));

      expect(markerLabels()).toEqual(["First", "Last"]);
      expect(first).toBeCloseTo(plot.x + (plot.width * 2) / 40, 0);
      expect(last).toBeCloseTo(plot.x + (plot.width * 37) / 40, 0);
    });

    it("clips a gap reaching beyond either end of the data to the padded domain", () => {
      renderFrame({
        axis: "band",
        gaps: [
          { start: -10, end: 12, label: "Before" },
          { start: 38, end: 60, label: "After" },
        ],
      });
      const plot = plotOf();
      const [before, after] = gapRects().map((rect) => ({
        x: Number(rect.getAttribute("x")),
        width: Number(rect.getAttribute("width")),
      }));

      expect(gapLabels()).toEqual(["Before", "After"]);
      expect(before?.x).toBeCloseTo(plot.x, 0);
      expect(before?.width).toBeCloseTo((plot.width * 7) / 40, 0);
      expect(after?.x).toBeCloseTo(plot.x + (plot.width * 33) / 40, 0);
      expect((after?.x as number) + (after?.width as number)).toBeCloseTo(plot.x + plot.width, 0);
    });
  });
});
