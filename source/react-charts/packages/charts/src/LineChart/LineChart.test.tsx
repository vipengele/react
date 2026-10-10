import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart, type LineChartProps, type LineChartRow, type LineChartSeries } from "./LineChart.js";
import { lineChartStylesheet } from "./LineChart.stylesheet.js";

/**
 * jsdom lays nothing out, so the responsive container would measure itself as zero-sized and
 * withhold the chart. Reporting a fixed size for that one element lets the chart render here;
 * every other element still measures zero, so nothing below asserts geometry or resolved colour.
 * Those are the browser suite's.
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

const data: LineChartRow[] = [
  { t: 1, a: 10, b: 20 },
  { t: 2, a: null, b: 30 },
  { t: 3, a: 30, b: 10 },
];

const series: LineChartSeries[] = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
];

function renderChart(props: Partial<LineChartProps> = {}) {
  const { container } = render(<LineChart height={HEIGHT} data={data} xKey="t" series={series} {...props} />);
  const element = container.querySelector<HTMLElement>(".vpg-chart-container");
  if (!element) throw new Error("LineChart did not render a .vpg-chart-container element");
  return element;
}

function linePaths(element: HTMLElement) {
  return [...element.querySelectorAll<SVGPathElement>("path.recharts-line-curve")];
}

function tickTexts(element: HTMLElement, axis: "x" | "y") {
  return [...element.querySelectorAll(`.recharts-${axis}Axis-tick-labels .recharts-cartesian-axis-tick-value`)].map(
    (tick) => tick.textContent,
  );
}

/**
 * Activates the tooltip at the `position`th sample, counting from 1, the way a keyboard user does:
 * focusing the chart activates the first sample, and each right arrow steps to the next.
 */
function showTooltipAt(element: HTMLElement, position: number) {
  const surface = element.querySelector<SVGElement>(".recharts-surface");
  if (!surface) throw new Error("LineChart rendered no chart surface");
  act(() => surface.focus());
  for (let step = 1; step < position; step += 1) fireEvent.keyDown(surface, { key: "ArrowRight" });
  return element.querySelector<HTMLElement>(".vpg-chart-tooltip");
}

describe("LineChart", () => {
  it("renders into a themed chart container carrying the vpg-chart-line class", () => {
    expect(renderChart()).toHaveClass("vpg-chart-container", "vpg-chart-line");
  });

  it("draws one line per series", () => {
    expect(linePaths(renderChart())).toHaveLength(2);
  });

  describe("series colours", () => {
    it("rotates through the six chart roles by series position", () => {
      const seven = Array.from({ length: 7 }, (_, index) => ({ key: `s${index}`, label: `Series ${index}` }));
      const rows = [1, 2].map((t) => ({ t, ...Object.fromEntries(seven.map(({ key }) => [key, t])) }));
      const strokes = linePaths(renderChart({ data: rows, series: seven })).map((path) => path.getAttribute("stroke"));

      expect(strokes).toEqual([1, 2, 3, 4, 5, 6, 1].map((role) => `var(--vpg-chart-${role})`));
    });

    it("lets colorIndex pin a series to a role", () => {
      const strokes = linePaths(renderChart({ series: [{ key: "a", label: "Alpha", colorIndex: 5 }, series[1] as LineChartSeries] })).map(
        (path) => path.getAttribute("stroke"),
      );

      expect(strokes).toEqual(["var(--vpg-chart-5)", "var(--vpg-chart-2)"]);
    });
  });

  describe("legend", () => {
    it("names every series by its label, in the series' colour", () => {
      const items = [...renderChart().querySelectorAll(".vpg-chart-legend .vpg-chart-legend-item")];

      expect(items.map((item) => item.textContent)).toEqual(["Alpha", "Beta"]);
      expect(items.map((item) => item.querySelector(".vpg-chart-swatch line")?.getAttribute("stroke"))).toEqual([
        "var(--vpg-chart-1)",
        "var(--vpg-chart-2)",
      ]);
    });
  });

  describe("gaps", () => {
    // A path that breaks at a missing sample starts more than one subpath.
    const subpaths = (path: SVGPathElement | undefined) => path?.getAttribute("d")?.match(/M/g)?.length;

    it("leaves a gap where a sample is null", () => {
      const [alpha, beta] = linePaths(renderChart());

      expect(subpaths(alpha)).toBeGreaterThan(1);
      expect(subpaths(beta)).toBe(1);
    });

    it("leaves a gap where a sample is missing", () => {
      const [alpha] = linePaths(renderChart({ data: [{ t: 1, a: 1 }, { t: 2 }, { t: 3, a: 3 }] }));

      expect(subpaths(alpha)).toBeGreaterThan(1);
    });

    it("draws across the gap when connectGaps is set", () => {
      const [alpha] = linePaths(renderChart({ connectGaps: true }));

      expect(subpaths(alpha)).toBe(1);
    });
  });

  describe("axes", () => {
    it("formats x ticks with formatX, given each tick's x value", () => {
      const formatX = vi.fn((x: number) => `x=${x}`);
      const ticks = tickTexts(renderChart({ formatX }), "x");

      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every((tick) => tick?.startsWith("x="))).toBe(true);
      expect(formatX.mock.calls.every(([x]) => typeof x === "number")).toBe(true);
    });

    it("formats y ticks with formatY, given each tick's y value", () => {
      const formatY = vi.fn((y: number) => `${y} ms`);
      const ticks = tickTexts(renderChart({ formatY }), "y");

      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every((tick) => tick?.endsWith(" ms"))).toBe(true);
      expect(formatY.mock.calls.every(([y]) => typeof y === "number")).toBe(true);
    });

    it("writes numbers as they are by default", () => {
      const element = renderChart();

      expect(tickTexts(element, "x").every((tick) => /^-?\d+(\.\d+)?$/.test(tick ?? ""))).toBe(true);
      expect(tickTexts(element, "y").every((tick) => /^-?\d+(\.\d+)?$/.test(tick ?? ""))).toBe(true);
    });
  });

  describe("time axis", () => {
    const start = Date.UTC(2026, 0, 1, 9, 0);
    const timeOfDay = (x: number) => new Date(x).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    const dayOfYear = (x: number) => new Date(x).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    function timeTicks(rows: LineChartRow[]) {
      return tickTexts(renderChart({ xKind: "time", data: rows }), "x");
    }

    it("labels ticks with the time of day when the data spans a day or less", () => {
      const ticks = timeTicks([
        { t: start, a: 1 },
        { t: start + 3_600_000, a: 2 },
      ]);
      const day = new Set([start, start + 1_800_000, start + 3_600_000].map(dayOfYear));

      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.some((tick) => day.has(tick ?? ""))).toBe(false);
      expect(ticks).toContain(timeOfDay(start));
    });

    it("labels ticks with the date when the data spans more than a day", () => {
      const ticks = timeTicks([
        { t: start, a: 1 },
        { t: start + 10 * 86_400_000, a: 2 },
      ]);

      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks).toContain(dayOfYear(start));
    });

    it("labels ticks with the time of day for a single sample, and skips rows without an x value", () => {
      const ticks = timeTicks([{ t: start, a: 1 }, { a: 2 }]);

      expect(ticks).toContain(timeOfDay(start));
    });

    it("heads the tooltip with the full local date and time", () => {
      const element = renderChart({ xKind: "time", data: [{ t: start, a: 1 }] });

      expect(showTooltipAt(element, 1)?.querySelector(".vpg-chart-tooltip-label")?.textContent).toBe(new Date(start).toLocaleString());
    });

    it("heads the tooltip with formatX when one is given", () => {
      const element = renderChart({ xKind: "time", data: [{ t: start, a: 1 }], formatX: (x) => `at ${x}` });

      expect(showTooltipAt(element, 1)?.querySelector(".vpg-chart-tooltip-label")?.textContent).toBe(`at ${start}`);
    });
  });

  describe("tooltip", () => {
    const rows = (tooltip: HTMLElement | null) =>
      [...(tooltip?.querySelectorAll(".vpg-chart-tooltip-item") ?? [])].map((item) => [
        item.querySelector("span")?.textContent,
        item.querySelector(".vpg-chart-tooltip-value")?.textContent,
      ]);

    it("is hidden until a sample is active", () => {
      expect(renderChart().querySelector(".vpg-chart-tooltip")).toBeNull();
    });

    it("heads the active sample with its x value and lists each series by label", () => {
      const tooltip = showTooltipAt(renderChart(), 1);

      expect(tooltip?.querySelector(".vpg-chart-tooltip-label")?.textContent).toBe("1");
      expect(rows(tooltip)).toEqual([
        ["Alpha", "10"],
        ["Beta", "20"],
      ]);
      expect([...(tooltip?.querySelectorAll(".vpg-chart-swatch line") ?? [])].map((line) => line.getAttribute("stroke"))).toEqual([
        "var(--vpg-chart-1)",
        "var(--vpg-chart-2)",
      ]);
    });

    it("leaves out a series with no value at the active sample", () => {
      expect(rows(showTooltipAt(renderChart(), 2))).toEqual([["Beta", "30"]]);
    });

    it("shows nothing at a sample where every series has a gap", () => {
      const element = renderChart({ data: [{ t: 1, a: null, b: null }] });

      expect(showTooltipAt(element, 1)).toBeNull();
    });

    it("formats the heading with formatTooltipLabel, given the x value", () => {
      const formatTooltipLabel = vi.fn((x: number) => `sample ${x}`);
      const tooltip = showTooltipAt(renderChart({ formatX: () => "unused", formatTooltipLabel }), 3);

      expect(tooltip?.querySelector(".vpg-chart-tooltip-label")?.textContent).toBe("sample 3");
      expect(formatTooltipLabel).toHaveBeenLastCalledWith(3);
    });

    it("formats values with formatY when no tooltip value formatter is given", () => {
      expect(rows(showTooltipAt(renderChart({ formatY: (y) => `${y} ms` }), 1))).toEqual([
        ["Alpha", "10 ms"],
        ["Beta", "20 ms"],
      ]);
    });

    it("formats values with formatTooltipValue, given the value and its series", () => {
      const formatTooltipValue = vi.fn((value: number, entry: LineChartSeries) => `${entry.key}:${value}`);
      const tooltip = showTooltipAt(renderChart({ formatY: () => "unused", formatTooltipValue }), 1);

      expect(rows(tooltip)).toEqual([
        ["Alpha", "a:10"],
        ["Beta", "b:20"],
      ]);
      expect(formatTooltipValue).toHaveBeenCalledWith(10, series[0]);
      expect(formatTooltipValue).toHaveBeenCalledWith(20, series[1]);
    });
  });

  describe("size", () => {
    it("writes a pixel height onto the container", () => {
      expect(renderChart({ height: 240 }).style.height).toBe("240px");
    });

    it("derives the chart's height from the measured width over an aspect", () => {
      const element = renderChart({ height: undefined, aspect: 4 });

      expect(element.querySelector<HTMLElement>(".recharts-wrapper")?.style.height).toBe(`${WIDTH / 4}px`);
    });
  });

  describe("className", () => {
    it("keeps the chart's own classes alongside the caller's", () => {
      expect(renderChart({ className: "caller" })).toHaveClass("vpg-chart-container", "vpg-chart-line", "caller");
    });
  });

  describe("ref", () => {
    it("reaches the chart's outermost element", () => {
      const ref = createRef<HTMLDivElement>();
      const element = renderChart({ ref });

      expect(ref.current).toBe(element);
    });
  });

  describe("stylesheet", () => {
    it("is keyed by href and precedence, once however many charts render", () => {
      render(
        <>
          <LineChart height={100} data={data} xKey="t" series={series} />
          <LineChart height={100} data={data} xKey="t" series={series} />
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-chart-line']");

      expect(sheets).toHaveLength(1);
      expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-chart-line");
      expect(sheets[0]?.textContent).toBe(lineChartStylesheet);
    });

    it("draws the tooltip from the surface, border and ink roles", () => {
      expect(lineChartStylesheet).toContain("border: 1px solid var(--vpg-border);");
      expect(lineChartStylesheet).toContain("background-color: var(--vpg-surface-raised);");
      expect(lineChartStylesheet).toContain("color: var(--vpg-ink);");
    });
  });
});
