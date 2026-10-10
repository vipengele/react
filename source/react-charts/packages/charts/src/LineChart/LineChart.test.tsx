import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart, type LineChartProps, type LineChartRow, type LineChartSeries } from "./LineChart.js";
import { lineChartStylesheet } from "./LineChart.stylesheet.js";
import { MIN_DRAG_PX, type UseZoomOptions, useZoom } from "./useZoom.js";

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

  describe("status", () => {
    function renderMessage(props: Partial<LineChartProps> = {}) {
      const { container } = render(<LineChart data={data} xKey="t" series={series} height={HEIGHT} {...props} />);
      return container.firstElementChild as HTMLElement;
    }

    it.each([
      ["loading", "status", "Loading chart"],
      ["empty", "status", "No data to show"],
      ["error", "alert", "Could not load chart"],
    ] as const)("shows a %s message with the %s role in place of the chart", (status, role, text) => {
      const element = renderMessage({ status });
      const message = element.querySelector(`[role='${role}']`);

      expect(message).toHaveTextContent(text);
      expect(element).toHaveClass("vpg-chart-message");
      expect(element.querySelector(".recharts-wrapper, .recharts-responsive-container")).toBeNull();
      expect(document.querySelector(".vpg-chart-container")).toBeNull();
    });

    it("lets messages override the default per status", () => {
      const element = renderMessage({ status: "empty", messages: { empty: "Nothing yet" } });

      expect(element).toHaveTextContent("Nothing yet");
    });

    it("keeps the default for a status messages leaves out", () => {
      expect(renderMessage({ status: "loading", messages: { empty: "Nothing yet" } })).toHaveTextContent("Loading chart");
    });

    it("sizes the message like the chart: a pixel height", () => {
      expect(renderMessage({ status: "empty", height: 240 }).style.height).toBe("240px");
    });

    it("sizes the message like the chart: a percentage height", () => {
      expect(renderMessage({ status: "empty", height: "50%" }).style.height).toBe("50%");
    });

    it("sizes the message like the chart: an aspect", () => {
      const element = renderMessage({ status: "empty", height: undefined, aspect: 4 });

      expect(element.style.aspectRatio).toBe("4 / 1");
      expect(element.style.height).toBe("");
    });

    it("fills the parent's height when given neither height nor aspect", () => {
      expect(renderMessage({ status: "empty", height: undefined }).style.height).toBe("100%");
    });

    it("applies className and ref to the outer element", () => {
      const ref = createRef<HTMLDivElement>();
      const element = renderMessage({ status: "error", className: "caller", ref });

      expect(element).toHaveClass("vpg-chart-message", "caller");
      expect(ref.current).toBe(element);
    });

    it("injects the stylesheet", () => {
      renderMessage({ status: "loading" });

      expect(document.querySelectorAll("style[data-href='vpg-chart-line']")).toHaveLength(1);
    });

    it("draws the message from the muted ink role", () => {
      expect(lineChartStylesheet).toContain("color: var(--vpg-ink-muted);");
    });
  });

  describe("zoom", () => {
    const rows: LineChartRow[] = Array.from({ length: 11 }, (_, index) => ({ t: index * 10, a: index, b: 10 - index }));
    // One vertex per sample: the move that opens the path, then one cubic per segment.
    const vertices = (path: SVGPathElement | undefined) => path?.getAttribute("d")?.match(/[MC]/g)?.length;
    const resetButton = () => document.querySelector<HTMLButtonElement>("button.vpg-chart-zoom-reset");

    it("draws every sample and shows no reset control without a zoom", () => {
      const [alpha] = linePaths(renderChart({ data: rows, zoom: null }));

      expect(vertices(alpha)).toBe(11);
      expect(resetButton()).toBeNull();
    });

    it("draws only the samples within the zoom, inclusive", () => {
      const [alpha] = linePaths(renderChart({ data: rows, zoom: { start: 30, end: 60 } }));

      expect(vertices(alpha)).toBe(4);
    });

    it("follows the zoom prop as it changes", () => {
      const props = { height: HEIGHT, data: rows, xKey: "t", series };
      const { container, rerender } = render(<LineChart {...props} zoom={{ start: 30, end: 60 }} />);
      rerender(<LineChart {...props} zoom={{ start: 0, end: 20 }} />);

      expect(vertices(linePaths(container as HTMLElement)[0])).toBe(3);

      rerender(<LineChart {...props} zoom={null} />);

      expect(vertices(linePaths(container as HTMLElement)[0])).toBe(11);
      expect(resetButton()).toBeNull();
    });

    it("skips rows without an x value when zoomed", () => {
      const [alpha] = linePaths(renderChart({ data: [...rows, { a: 5 }], zoom: { start: 0, end: 100 } }));

      expect(vertices(alpha)).toBe(11);
    });

    it("labels time ticks from the zoomed span", () => {
      const start = Date.UTC(2026, 0, 1, 9, 0);
      const days = Array.from({ length: 10 }, (_, day) => ({ t: start + day * 86_400_000, a: day }));
      const ticks = tickTexts(renderChart({ xKind: "time", data: days, zoom: { start, end: start + 3_600_000 } }), "x");
      const timeOfDay = new Date(start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

      expect(ticks).toContain(timeOfDay);
    });

    it("shows a reset control labelled Reset zoom while zoomed", () => {
      renderChart({ data: rows, zoom: { start: 30, end: 60 } });

      expect(resetButton()).toHaveTextContent("Reset zoom");
      expect(resetButton()).toHaveAttribute("type", "button");
    });

    it("lets messages relabel the reset control", () => {
      renderChart({ data: rows, zoom: { start: 30, end: 60 }, messages: { resetZoom: "Show all" } });

      expect(resetButton()).toHaveTextContent("Show all");
    });

    it("reports a null zoom when the reset control is pressed", () => {
      const onZoomChange = vi.fn();
      renderChart({ data: rows, zoom: { start: 30, end: 60 }, onZoomChange });
      fireEvent.click(resetButton() as HTMLButtonElement);

      expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(null);
    });

    it("accepts a reset press with no onZoomChange", () => {
      renderChart({ data: rows, zoom: { start: 30, end: 60 } });

      expect(() => fireEvent.click(resetButton() as HTMLButtonElement)).not.toThrow();
    });

    it("mounts no reset control in a non-ready status", () => {
      render(<LineChart height={HEIGHT} data={rows} xKey="t" series={series} status="loading" zoom={{ start: 30, end: 60 }} />);

      expect(resetButton()).toBeNull();
      expect(document.querySelector(".vpg-chart-zoom")).toBeNull();
    });

    it("draws the selection from the accent role, made translucent", () => {
      expect(lineChartStylesheet).toContain("fill: var(--vpg-accent);");
      expect(lineChartStylesheet).toContain("fill-opacity: 0.15;");
    });
  });

  describe("useZoom", () => {
    const dataset = [{ t: 1 }];
    // A scale of 1px to 0.5 x units.
    const toX = (px: number) => px / 2;

    function renderZoom(options: Partial<UseZoomOptions> = {}) {
      const onZoomChange = vi.fn();
      const view = renderHook((props: UseZoomOptions) => useZoom(props), {
        initialProps: { data: dataset, toX, onZoomChange, ...options },
      });
      return { ...view, onZoomChange };
    }

    it("holds no band until a drag begins", () => {
      const { result } = renderZoom();

      expect(result.current.band).toBeNull();
      expect(result.current.dragging).toBe(false);
    });

    it("tracks the dragged span in order, whichever way the drag goes", () => {
      const { result } = renderZoom();
      act(() => result.current.begin(80));
      act(() => result.current.move(20));

      expect(result.current.band).toEqual({ from: 20, to: 80 });
      expect(result.current.dragging).toBe(true);
    });

    it("reports the range once on commit, in x values with start before end, and nothing else", () => {
      const { result, onZoomChange } = renderZoom();
      act(() => result.current.begin(80));
      act(() => result.current.move(20));
      act(() => result.current.commit());
      act(() => result.current.commit());

      expect(onZoomChange).toHaveBeenCalledTimes(1);
      const [zoom] = onZoomChange.mock.calls[0] as [object];
      expect(zoom).toStrictEqual({ start: 10, end: 40 });
      expect(Object.keys(zoom)).toEqual(["start", "end"]);
      expect(result.current.band).toBeNull();
    });

    it("reports the last move even when released before re-rendering", () => {
      const { result, onZoomChange } = renderZoom();
      act(() => {
        result.current.begin(0);
        result.current.move(40);
        result.current.commit();
      });

      expect(onZoomChange).toHaveBeenCalledExactlyOnceWith({ start: 0, end: 20 });
    });

    it("reports nothing for a drag shorter than the threshold", () => {
      const { result, onZoomChange } = renderZoom();
      act(() => result.current.begin(10));
      act(() => result.current.move(10 + MIN_DRAG_PX - 1));
      act(() => result.current.commit());

      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("reports nothing for a drag spanning no x range", () => {
      const { result, onZoomChange } = renderZoom({ toX: () => 5 });
      act(() => result.current.begin(0));
      act(() => result.current.move(50));
      act(() => result.current.commit());

      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("reports nothing after a cancel", () => {
      const { result, onZoomChange } = renderZoom();
      act(() => result.current.begin(0));
      act(() => result.current.move(50));
      act(() => result.current.cancel());
      act(() => result.current.commit());

      expect(result.current.band).toBeNull();
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("ignores a move and a commit with no drag in progress", () => {
      const { result, onZoomChange } = renderZoom();
      act(() => result.current.move(50));
      act(() => result.current.commit());

      expect(result.current.band).toBeNull();
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("discards the drag when the data changes", () => {
      const { result, rerender, onZoomChange } = renderZoom();
      act(() => result.current.begin(0));
      act(() => result.current.move(50));
      rerender({ data: [{ t: 2 }], toX, onZoomChange });

      expect(result.current.band).toBeNull();
      expect(result.current.dragging).toBe(false);

      act(() => result.current.move(60));
      act(() => result.current.commit());

      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("commits without an onZoomChange", () => {
      const { result } = renderZoom({ onZoomChange: undefined });
      act(() => result.current.begin(0));
      act(() => result.current.move(50));

      expect(() => act(() => result.current.commit())).not.toThrow();
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
