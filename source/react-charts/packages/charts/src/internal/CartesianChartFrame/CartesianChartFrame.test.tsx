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
  });
});
