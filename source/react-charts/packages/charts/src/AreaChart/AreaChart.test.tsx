import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chartStylesheet } from "../internal/chartStylesheet.js";
import { LineChart } from "../LineChart/LineChart.js";
import { AreaChart, type AreaChartProps, type AreaChartRow, type AreaChartSeries } from "./AreaChart.js";

/**
 * jsdom lays nothing out, so the responsive container would measure itself as zero-sized and
 * withhold the chart. Reporting a fixed size for that one element lets the chart render here;
 * every other element still measures zero, so nothing below asserts resolved colour or the
 * areas' layout on the page. Those are the browser suite's.
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

// Download above zero and upload below it, the mirrored pair a throughput chart draws.
const data: AreaChartRow[] = [
  { t: 1, down: 10, up: -4 },
  { t: 2, down: null, up: -8 },
  { t: 3, down: 30, up: -6 },
];

const series: AreaChartSeries[] = [
  { key: "down", label: "Download" },
  { key: "up", label: "Upload" },
];

function renderChart(props: Partial<AreaChartProps> = {}) {
  const { container } = render(<AreaChart height={HEIGHT} data={data} xKey="t" series={series} {...props} />);
  const element = container.querySelector<HTMLElement>(".vpg-chart-container");
  if (!element) throw new Error("AreaChart did not render a .vpg-chart-container element");
  return element;
}

/** Each series' filled region, in series order. */
function fills(element: HTMLElement) {
  return [...element.querySelectorAll<SVGPathElement>("path.recharts-area-area")];
}

/** Each series' outline, in series order. */
function outlines(element: HTMLElement) {
  return [...element.querySelectorAll<SVGPathElement>("path.recharts-area-curve")];
}

function tickTexts(element: HTMLElement, axis: "x" | "y") {
  return [...element.querySelectorAll(`.recharts-${axis}Axis-tick-labels .recharts-cartesian-axis-tick-value`)].map(
    (tick) => tick.textContent,
  );
}

const zeroLines = (element: HTMLElement) => element.querySelectorAll(".vpg-chart-zero-line line");

/** Rows at x = 0, 1, … with the values given for series `a`. */
const rowsOf = (values: readonly (number | null)[]): AreaChartRow[] => values.map((a, t) => ({ t, a }));
const single: AreaChartSeries[] = [{ key: "a", label: "Alpha" }];

describe("AreaChart", () => {
  it("renders into a themed chart container carrying the vpg-chart-area class", () => {
    expect(renderChart()).toHaveClass("vpg-chart-container", "vpg-chart-area");
  });

  it("draws one filled area and one outline per series, named by label", () => {
    const element = renderChart();

    expect(fills(element)).toHaveLength(2);
    expect(outlines(element).map((path) => path.getAttribute("name"))).toEqual(["Download", "Upload"]);
  });

  it("draws each outline as a smooth curve 1.75px wide, without dots or animation", () => {
    const element = renderChart({ data: rowsOf([1, 3, 2, 5]), series: single });
    const [outline] = outlines(element);

    expect(outline?.getAttribute("d")).toContain("C");
    expect(outline?.getAttribute("stroke-width")).toBe("1.75");
    expect(element.querySelector(".recharts-area-dot, .recharts-area-dots")).toBeNull();
    expect(element.querySelector(".recharts-area clipPath")).toBeNull();
  });

  it("does not stack the areas: each fills from zero to its own values", () => {
    const element = renderChart({
      data: [
        { t: 1, a: 10, b: 10 },
        { t: 2, a: 10, b: 10 },
      ],
      series: [
        { key: "a", label: "Alpha" },
        { key: "b", label: "Beta" },
      ],
    });
    const [alpha, beta] = outlines(element).map((path) => path.getAttribute("d"));

    expect(beta).toBe(alpha);
    expect(tickTexts(element, "y").at(-1)).toBe("12");
  });

  describe("series colours", () => {
    const fillOf = (role: number) => `oklch(from var(--vpg-chart-${role}) l c h / 0.2)`;

    it("rotates through the six chart roles by series position, for the outline and the fill", () => {
      const seven = Array.from({ length: 7 }, (_, index) => ({ key: `s${index}`, label: `Series ${index}` }));
      const rows = [1, 2].map((t) => ({ t, ...Object.fromEntries(seven.map(({ key }) => [key, t])) }));
      const element = renderChart({ data: rows, series: seven });
      const roles = [1, 2, 3, 4, 5, 6, 1];

      expect(outlines(element).map((path) => path.getAttribute("stroke"))).toEqual(roles.map((role) => `var(--vpg-chart-${role})`));
      expect(fills(element).map((path) => path.getAttribute("fill"))).toEqual(roles.map(fillOf));
      expect(fills(element).map((path) => path.getAttribute("fill-opacity"))).toEqual(roles.map(() => "1"));
    });

    it("lets colorIndex pin a series' outline and fill to a role", () => {
      const element = renderChart({ series: [{ key: "down", label: "Download", colorIndex: 5 }, series[1] as AreaChartSeries] });

      expect(outlines(element).map((path) => path.getAttribute("stroke"))).toEqual(["var(--vpg-chart-5)", "var(--vpg-chart-2)"]);
      expect(fills(element).map((path) => path.getAttribute("fill"))).toEqual([fillOf(5), fillOf(2)]);
    });
  });

  describe("legend", () => {
    it("names every series by its label, in the series' colour", () => {
      const items = [...renderChart().querySelectorAll(".vpg-chart-legend .vpg-chart-legend-item")];

      expect(items.map((item) => item.textContent)).toEqual(["Download", "Upload"]);
      expect(items.map((item) => item.querySelector(".vpg-chart-swatch line")?.getAttribute("stroke"))).toEqual([
        "var(--vpg-chart-1)",
        "var(--vpg-chart-2)",
      ]);
    });
  });

  describe("tooltip", () => {
    it("lists each series by label with its signed value", () => {
      const element = renderChart();
      const surface = element.querySelector<SVGElement>(".recharts-surface") as SVGElement;
      act(() => surface.focus());
      const items = [...element.querySelectorAll(".vpg-chart-tooltip .vpg-chart-tooltip-item")].map((item) => [
        item.querySelector("span")?.textContent,
        item.querySelector(".vpg-chart-tooltip-value")?.textContent,
      ]);

      expect(items).toEqual([
        ["Download", "10"],
        ["Upload", "-4"],
      ]);
    });

    it("formats values with formatTooltipValue, given the value and its series", () => {
      const formatTooltipValue = vi.fn((value: number, entry: AreaChartSeries) => `${entry.label} ${Math.abs(value)}`);
      const element = renderChart({ formatTooltipValue });
      act(() => (element.querySelector(".recharts-surface") as SVGElement).focus());
      fireEvent.keyDown(element.querySelector(".recharts-surface") as SVGElement, { key: "ArrowRight" });

      expect(element.querySelector(".vpg-chart-tooltip")).toHaveTextContent("Upload 8");
      expect(formatTooltipValue).toHaveBeenCalledWith(-8, series[1]);
    });
  });

  describe("signed values", () => {
    it("extends the y axis below zero for negative values and above it for positive ones", () => {
      const ticks = tickTexts(renderChart(), "y").map(Number);

      expect(Math.min(...ticks)).toBeLessThan(0);
      expect(Math.max(...ticks)).toBeGreaterThanOrEqual(30);
    });

    it("formats y ticks with formatY, given each tick's signed value", () => {
      const formatY = vi.fn((y: number) => `${Math.abs(y)} B/s`);
      const ticks = tickTexts(renderChart({ formatY }), "y");

      expect(ticks.every((tick) => tick?.endsWith(" B/s"))).toBe(true);
      expect(formatY.mock.calls.some(([y]) => y < 0)).toBe(true);
    });
  });

  describe("gaps", () => {
    // A path that breaks at a missing sample starts more than one subpath.
    const subpaths = (path: SVGPathElement | undefined) => path?.getAttribute("d")?.match(/M/g)?.length;

    it("leaves a gap where a sample is null", () => {
      const [down, up] = outlines(renderChart());

      expect(subpaths(down)).toBeGreaterThan(1);
      expect(subpaths(up)).toBe(1);
    });

    it("leaves a gap where a sample is missing", () => {
      const [alpha] = outlines(renderChart({ data: [{ t: 1, a: 1 }, { t: 2 }, { t: 3, a: 3 }], series: single }));

      expect(subpaths(alpha)).toBeGreaterThan(1);
    });

    it("draws across the gap when connectGaps is set", () => {
      const element = renderChart({ connectGaps: true });

      expect(subpaths(outlines(element)[0])).toBe(1);
      expect(subpaths(fills(element)[0])).toBe(1);
    });
  });

  describe("zero line", () => {
    it("is drawn at zero in the strong border role while the y axis spans zero", () => {
      const lines = zeroLines(renderChart());

      expect(lines).toHaveLength(1);
      expect(lines[0]).toHaveAttribute("stroke", "var(--vpg-border-strong)");
      expect(lines[0]).toHaveAttribute("stroke-width", "1");
    });

    it("is drawn by default for values just either side of zero", () => {
      expect(zeroLines(renderChart({ data: rowsOf([-1, 1]), series: single }))).toHaveLength(1);
    });

    it.each([
      ["every value is positive", [5, 30]],
      ["the lowest value is exactly zero", [0, 7]],
      ["every value is negative", [-5, -30]],
      ["the highest value is exactly zero", [-5, 0]],
      ["every value is zero", [0, 0]],
      ["no sample has a value", [null, null]],
    ] as const)("is not drawn when %s, where zero is the axis' edge or outside it", (_, values) => {
      expect(zeroLines(renderChart({ data: rowsOf(values), series: single }))).toHaveLength(0);
    });

    it("sits on the edge of the y axis for data that does not cross zero", () => {
      expect(tickTexts(renderChart({ data: rowsOf([0, 7]), series: single }), "y")[0]).toBe("0");
      expect(tickTexts(renderChart({ data: rowsOf([-5, 0]), series: single }), "y").at(-1)).toBe("0");
    });

    it("is not drawn with zeroLine set to false", () => {
      expect(zeroLines(renderChart({ zeroLine: false }))).toHaveLength(0);
    });

    it("follows the zoom: only the zoomed samples decide whether the axis spans zero", () => {
      const rows = rowsOf([-5, -3, 2, 4, 6]);
      const props = { height: HEIGHT, data: rows, xKey: "t", series: single };
      const { container, rerender } = render(<AreaChart {...props} zoom={{ start: 2, end: 4 }} />);

      expect(zeroLines(container as HTMLElement)).toHaveLength(0);

      rerender(<AreaChart {...props} zoom={{ start: 1, end: 4 }} />);

      expect(zeroLines(container as HTMLElement)).toHaveLength(1);

      rerender(<AreaChart {...props} zoom={{ start: 0, end: 1 }} />);

      expect(zeroLines(container as HTMLElement)).toHaveLength(0);

      rerender(<AreaChart {...props} zoom={null} />);

      expect(zeroLines(container as HTMLElement)).toHaveLength(1);
    });
  });

  describe("zoom", () => {
    it("draws only the samples within the zoom, and shows a reset control", () => {
      const rows = rowsOf([1, 2, 3, 4, 5, 6]);
      const element = renderChart({ data: rows, series: single, zoom: { start: 2, end: 4 } });

      expect(outlines(element)[0]?.getAttribute("d")?.match(/[MC]/g)).toHaveLength(3);
      expect(element.querySelector("button.vpg-chart-zoom-reset")).toHaveTextContent("Reset zoom");
    });
  });

  describe("status", () => {
    it("shows the status message in place of the chart, and injects the shared stylesheet", () => {
      const { container } = render(<AreaChart data={data} xKey="t" series={series} status="error" />);

      expect(container.querySelector("[role='alert']")).toHaveTextContent("Could not load chart");
      expect(container.querySelector(".vpg-chart-container, .vpg-chart-zero-line")).toBeNull();
      expect(document.querySelectorAll("style[data-href='vpg-chart']")).toHaveLength(1);
    });
  });

  describe("className and ref", () => {
    it("keeps the chart's own classes alongside the caller's, and reaches the outermost element", () => {
      const ref = createRef<HTMLDivElement>();
      const element = renderChart({ className: "caller", ref });

      expect(element).toHaveClass("vpg-chart-container", "vpg-chart-area", "caller");
      expect(ref.current).toBe(element);
    });
  });

  describe("stylesheet", () => {
    it("injects the one shared chart stylesheet however many charts of either type render", () => {
      render(
        <>
          <AreaChart height={100} data={data} xKey="t" series={series} />
          <LineChart height={100} data={data} xKey="t" series={series} />
          <AreaChart height={100} data={data} xKey="t" series={series} />
          <LineChart height={100} data={data} xKey="t" series={series} status="loading" />
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-chart']");

      expect(sheets).toHaveLength(1);
      expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-chart");
      expect(sheets[0]?.textContent).toBe(chartStylesheet);
      expect([...document.querySelectorAll("style[data-href]")].map((sheet) => sheet.getAttribute("data-href")).sort()).toEqual([
        "vpg-chart",
        "vpg-chart-container",
      ]);
    });
  });
});
