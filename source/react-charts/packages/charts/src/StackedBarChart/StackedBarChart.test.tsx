import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chartStylesheet } from "../internal/chartStylesheet.js";
import { LineChart } from "../LineChart/LineChart.js";
import {
  StackedBarChart,
  type StackedBarChartMessages,
  type StackedBarChartProps,
  type StackedBarChartRow,
  type StackedBarChartSeries,
} from "./StackedBarChart.js";

/**
 * jsdom lays nothing out, so the responsive container would measure itself as zero-sized and
 * withhold the chart. Reporting a fixed size for that one element lets the chart render here, and
 * the bars' attributes are computed from that size; every other element still measures zero, so
 * nothing below asserts resolved colour or the bars' layout on the page. Those are the browser
 * suite's.
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

// Outcomes per run: three runs, each with its passed and failed counts.
const data: StackedBarChartRow[] = [
  { run: 1, passed: 8, failed: 2 },
  { run: 2, passed: 6, failed: 4 },
  { run: 3, passed: 9, failed: 1 },
];

const series: StackedBarChartSeries[] = [
  { key: "passed", label: "Passed", color: "success" },
  { key: "failed", label: "Failed", color: "danger" },
];

function renderChart(props: Partial<StackedBarChartProps> = {}) {
  const { container } = render(<StackedBarChart height={HEIGHT} data={data} xKey="run" series={series} {...props} />);
  const element = container.querySelector<HTMLElement>(".vpg-chart-container");
  if (!element) throw new Error("StackedBarChart did not render a .vpg-chart-container element");
  return element;
}

/** Every drawn segment, one per series value that draws one. */
const segments = (element: HTMLElement) => element.querySelectorAll(".recharts-bar-rectangle");

/** The drawn segments of the series named `label`, in x order. */
function segmentsOf(element: HTMLElement, label: string) {
  return [...element.querySelectorAll<SVGPathElement>(`.recharts-bar-rectangle path[name='${label}']`)];
}

function tickTexts(element: HTMLElement, axis: "x" | "y") {
  return [...element.querySelectorAll(`.recharts-${axis}Axis-tick-labels .recharts-cartesian-axis-tick-value`)].map(
    (tick) => tick.textContent,
  );
}

/**
 * Activates the tooltip at the `position`th category, counting from 1, the way a keyboard user
 * does: focusing the chart activates the first category, and each right arrow steps to the next.
 */
function showTooltipAt(element: HTMLElement, position: number) {
  const surface = element.querySelector<SVGElement>(".recharts-surface");
  if (!surface) throw new Error("StackedBarChart rendered no chart surface");
  act(() => surface.focus());
  for (let step = 1; step < position; step += 1) fireEvent.keyDown(surface, { key: "ArrowRight" });
  return element.querySelector<HTMLElement>(".vpg-chart-tooltip");
}

/** Each tooltip item's label and value, in order. */
function tooltipItems(tooltip: HTMLElement | null) {
  return [...(tooltip?.querySelectorAll(".vpg-chart-tooltip-item") ?? [])].map((item) => [
    item.querySelector("span")?.textContent,
    item.querySelector(".vpg-chart-tooltip-value")?.textContent,
  ]);
}

const pair: StackedBarChartSeries[] = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
];

describe("StackedBarChart", () => {
  it("renders into a themed chart container carrying the vpg-chart-stacked-bar class", () => {
    expect(renderChart()).toHaveClass("vpg-chart-container", "vpg-chart-stacked-bar");
  });

  it("draws one segment per series per category, named by label", () => {
    const element = renderChart();

    expect(segments(element)).toHaveLength(6);
    expect(segmentsOf(element, "Passed")).toHaveLength(3);
    expect(segmentsOf(element, "Failed")).toHaveLength(3);
  });

  it("stacks each series onto the one before it, in the series' order", () => {
    const element = renderChart();
    const passed = segmentsOf(element, "Passed");
    const failed = segmentsOf(element, "Failed");
    const attribute = (path: SVGPathElement | undefined, name: string) => Number(path?.getAttribute(name));

    passed.forEach((segment, index) => {
      const above = failed[index];
      expect(attribute(above, "x")).toBe(attribute(segment, "x"));
      expect(attribute(above, "width")).toBe(attribute(segment, "width"));
      expect(attribute(above, "y") + attribute(above, "height")).toBeCloseTo(attribute(segment, "y"));
    });
    expect(tickTexts(element, "y").at(-1)).toBe("12");
  });

  it("draws every segment at its full height on the first render, without animating", () => {
    const heights = [...segments(renderChart())].map((segment) => Number(segment.querySelector("path")?.getAttribute("height")));

    expect(heights).toHaveLength(6);
    expect(heights.every((height) => height > 0)).toBe(true);
  });

  describe("series colours", () => {
    it("rotates through the six chart roles by series position", () => {
      const seven = Array.from({ length: 7 }, (_, index) => ({ key: `s${index}`, label: `Series ${index}` }));
      const rows = [1, 2].map((run) => ({ run, ...Object.fromEntries(seven.map(({ key }) => [key, 1])) }));
      const element = renderChart({ data: rows, series: seven });
      const fills = seven.map(({ label }) => segmentsOf(element, label)[0]?.getAttribute("fill"));

      expect(fills).toEqual([1, 2, 3, 4, 5, 6, 1].map((role) => `var(--vpg-chart-${role})`));
    });

    it("draws a series in the colour role it names", () => {
      const element = renderChart();

      expect(segmentsOf(element, "Passed").map((path) => path.getAttribute("fill"))).toEqual(Array(3).fill("var(--vpg-success)"));
      expect(segmentsOf(element, "Failed").map((path) => path.getAttribute("fill"))).toEqual(Array(3).fill("var(--vpg-danger)"));
    });

    it("lets colorIndex pin a series to a role", () => {
      const element = renderChart({
        series: [
          { key: "passed", label: "Passed", colorIndex: 5 },
          { key: "failed", label: "Failed" },
        ],
      });

      expect(segmentsOf(element, "Passed")[0]).toHaveAttribute("fill", "var(--vpg-chart-5)");
      expect(segmentsOf(element, "Failed")[0]).toHaveAttribute("fill", "var(--vpg-chart-2)");
    });
  });

  describe("x axis", () => {
    it("ticks every category once, in ascending order whatever the rows' order", () => {
      const rows = [9, 3, 6].map((run) => ({ run, passed: 1 }));

      expect(tickTexts(renderChart({ data: rows }), "x")).toEqual(["3", "6", "9"]);
    });

    it("labels each category through formatX", () => {
      const formatX = vi.fn((x: number) => `#${x}`);

      expect(tickTexts(renderChart({ formatX }), "x")).toEqual(["#1", "#2", "#3"]);
    });

    it("labels timestamps as times with xKind time", () => {
      const day = 86_400_000;
      const rows = [0, 1, 2].map((index) => ({ run: Date.UTC(2026, 0, 1) + index * day, passed: index + 1 }));
      const ticks = tickTexts(renderChart({ data: rows, xKind: "time" }), "x");

      expect(ticks).toHaveLength(3);
      expect(ticks.every((tick) => Number.isNaN(Number(tick)))).toBe(true);
    });
  });

  describe("missing values", () => {
    const rowsOf = (first: Record<string, number | null>): StackedBarChartRow[] => [
      { run: 1, ...first },
      { run: 2, a: 3, b: 4 },
    ];

    it("draws a segment for every value of every series", () => {
      expect(segments(renderChart({ data: rowsOf({ a: 1, b: 2 }), series: pair }))).toHaveLength(4);
    });

    it("draws no segment for a null value, and keeps the category's other segments", () => {
      const element = renderChart({ data: rowsOf({ a: null, b: 2 }), series: pair });

      expect(segments(element)).toHaveLength(3);
      expect(segmentsOf(element, "Alpha")).toHaveLength(1);
      expect(segmentsOf(element, "Beta")).toHaveLength(2);
    });

    it("draws no segment for a missing value", () => {
      const element = renderChart({
        data: [
          { run: 1, b: 2 },
          { run: 2, a: 3, b: 4 },
        ],
        series: pair,
      });

      expect(segments(element)).toHaveLength(3);
      expect(segmentsOf(element, "Alpha")).toHaveLength(1);
    });

    it("draws no segment for a zero, which has no height to draw", () => {
      const element = renderChart({ data: rowsOf({ a: 0, b: 2 }), series: pair });

      expect(segments(element)).toHaveLength(3);
      expect(segmentsOf(element, "Alpha")).toHaveLength(1);
    });

    it("draws no bar for a category where every series is null, and still ticks it", () => {
      const element = renderChart({ data: rowsOf({ a: null, b: null }), series: pair });

      expect(segments(element)).toHaveLength(2);
      expect(tickTexts(element, "x")).toEqual(["1", "2"]);
    });

    it("draws no bar for a category where every series is zero", () => {
      expect(segments(renderChart({ data: rowsOf({ a: 0, b: 0 }), series: pair }))).toHaveLength(2);
    });
  });

  describe("tooltip", () => {
    it("lists each series by label with its own value, not its stacked total", () => {
      expect(tooltipItems(showTooltipAt(renderChart(), 2))).toEqual([
        ["Passed", "6"],
        ["Failed", "4"],
      ]);
    });

    it("heads the tooltip with the category's x value through formatX", () => {
      const tooltip = showTooltipAt(renderChart({ formatX: (x) => `Run ${x}` }), 3);

      expect(tooltip?.querySelector(".vpg-chart-tooltip-label")).toHaveTextContent("Run 3");
    });

    it("lists a zero, and leaves out a null", () => {
      const rows: StackedBarChartRow[] = [{ run: 1, a: 0, b: null }];

      expect(tooltipItems(showTooltipAt(renderChart({ data: rows, series: pair }), 1))).toEqual([["Alpha", "0"]]);
    });

    it("shows no tooltip at a category where every series is null", () => {
      const rows: StackedBarChartRow[] = [{ run: 1, a: null, b: null }];

      expect(showTooltipAt(renderChart({ data: rows, series: pair }), 1)).toBeNull();
    });

    it("formats values with formatTooltipValue, given the value and its series", () => {
      const formatTooltipValue = vi.fn((value: number, entry: StackedBarChartSeries) => `${value} ${entry.key}`);
      const tooltip = showTooltipAt(renderChart({ formatTooltipValue }), 1);

      expect(tooltip).toHaveTextContent("2 failed");
      expect(formatTooltipValue).toHaveBeenCalledWith(2, series[1]);
    });
  });

  describe("legend", () => {
    it("names every series by its label, in the series' colour", () => {
      const items = [...renderChart().querySelectorAll(".vpg-chart-legend .vpg-chart-legend-item")];

      expect(items.map((item) => item.textContent)).toEqual(["Passed", "Failed"]);
      expect(items.map((item) => item.querySelector(".vpg-chart-swatch line")?.getAttribute("stroke"))).toEqual([
        "var(--vpg-success)",
        "var(--vpg-danger)",
      ]);
    });

    it("is not rendered with legend set to false", () => {
      expect(renderChart({ legend: false }).querySelector(".vpg-chart-legend, .recharts-legend-wrapper")).toBeNull();
    });
  });

  describe("zoom", () => {
    it("mounts no zoom layer and no reset control", () => {
      const element = renderChart();

      expect(element.querySelector(".vpg-chart-zoom")).toBeNull();
      expect(element.querySelector("button.vpg-chart-zoom-reset")).toBeNull();
    });

    it("takes no zoom props", () => {
      const props: StackedBarChartProps = {
        data,
        xKey: "run",
        series,
        // @ts-expect-error a stacked bar chart does not zoom
        zoom: { start: 1, end: 2 },
      };

      expect(renderChart(props).querySelector("button.vpg-chart-zoom-reset")).toBeNull();
    });

    it("takes no reset control label among its messages", () => {
      // @ts-expect-error a stacked bar chart has no reset control to label
      const messages: StackedBarChartMessages = { resetZoom: "Reset" };

      expect(renderChart({ messages }).querySelector("button.vpg-chart-zoom-reset")).toBeNull();
    });
  });

  describe("status", () => {
    function renderMessage(props: Partial<StackedBarChartProps> = {}) {
      const { container } = render(<StackedBarChart data={data} xKey="run" series={series} height={HEIGHT} {...props} />);
      return container.firstElementChild as HTMLElement;
    }

    it.each([
      ["loading", "status", "Loading chart"],
      ["empty", "status", "No data to show"],
      ["error", "alert", "Could not load chart"],
    ] as const)("shows a %s message with the %s role in place of the chart", (status, role, text) => {
      const element = renderMessage({ status });

      expect(element.querySelector(`[role='${role}']`)).toHaveTextContent(text);
      expect(document.querySelector(".vpg-chart-container, .recharts-wrapper")).toBeNull();
    });

    it("lets messages override the default per status", () => {
      expect(renderMessage({ status: "empty", messages: { empty: "No runs yet" } })).toHaveTextContent("No runs yet");
    });

    it("draws the chart for empty data unless the caller sets the empty status", () => {
      const element = renderChart({ data: [] });

      expect(element).toHaveClass("vpg-chart-stacked-bar");
      expect(segments(element)).toHaveLength(0);
      expect(document.querySelector(".vpg-chart-message")).toBeNull();
    });
  });

  describe("className and ref", () => {
    it("keeps the chart's own classes alongside the caller's, and reaches the outermost element", () => {
      const ref = createRef<HTMLDivElement>();
      const element = renderChart({ className: "caller", ref });

      expect(element).toHaveClass("vpg-chart-container", "vpg-chart-stacked-bar", "caller");
      expect(ref.current).toBe(element);
    });
  });

  describe("stylesheet", () => {
    it("injects the one shared chart stylesheet alongside the other chart types", () => {
      render(
        <>
          <StackedBarChart height={100} data={data} xKey="run" series={series} />
          <LineChart height={100} data={data} xKey="run" series={series} />
          <StackedBarChart height={100} data={data} xKey="run" series={series} status="loading" />
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-chart']");

      expect(sheets).toHaveLength(1);
      expect(sheets[0]?.textContent).toBe(chartStylesheet);
    });
  });
});
