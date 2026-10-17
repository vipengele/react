import { cleanup, render } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { LineChart, type LineChartProps, type LineChartRow } from "./LineChart.js";

/**
 * Drag-to-zoom turns pointer positions into x values through the plot's real layout, so the drag
 * itself, the preview band's geometry and the zoomed lines' extent are only observable in a real
 * engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this
// every render after the first sits beside the previous one.
afterEach(cleanup);

// Narrow enough that the whole chart sits inside the default test viewport, where
// `elementFromPoint` finds what a press lands on.
const WIDTH = 360;
const HEIGHT = 300;

// Eleven samples at x = 0, 10, …, 100.
const data: LineChartRow[] = Array.from({ length: 11 }, (_, index) => ({ t: index * 10, a: index % 3 }));

interface Plot {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

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

const nextFrame = () => new Promise(requestAnimationFrame);

/** Mounts the chart and resolves once it has laid out, with the plot area in client coordinates. */
async function renderChart(props: Partial<LineChartProps> = {}, offset = { left: 0, top: 0 }) {
  const onZoomChange = vi.fn();
  const view = render(
    <ThemeProvider>
      <div style={{ width: WIDTH, marginLeft: offset.left, marginTop: offset.top }}>
        <LineChart height={HEIGHT} data={data} xKey="t" series={[{ key: "a", label: "Alpha" }]} onZoomChange={onZoomChange} {...props} />
      </div>
    </ThemeProvider>,
  );
  // The plot's clip rectangle is the plot area in the surface's own coordinates.
  const clip = await waitFor(() => document.querySelector<SVGRectElement>(".recharts-surface clipPath rect"));
  await waitFor(() => document.querySelector("path.recharts-line-curve"));
  const surface = clip.ownerSVGElement as SVGSVGElement;
  const box = surface.getBoundingClientRect();
  const plot: Plot = {
    left: box.left + clip.x.baseVal.value,
    top: box.top + clip.y.baseVal.value,
    width: clip.width.baseVal.value,
    height: clip.height.baseVal.value,
  };
  return { ...view, onZoomChange, plot };
}

/** The client point at `fraction` of the plot's width, halfway down it. */
function at(plot: Plot, fraction: number) {
  return { clientX: plot.left + plot.width * fraction, clientY: plot.top + plot.height / 2 };
}

/** Which pointer an event comes from; a touchscreen gives each finger its own id. */
type PointerInit = Pick<PointerEventInit, "pointerId" | "pointerType">;

/** Presses at a client point on whatever element the engine draws there, as a real press does. */
function press(point: { clientX: number; clientY: number }, button = 0, pointer: PointerInit = {}) {
  const target = document.elementFromPoint(point.clientX, point.clientY) as Element;
  target.dispatchEvent(new PointerEvent("pointerdown", { ...point, ...pointer, button, bubbles: true }));
}

function moveTo(point: { clientX: number; clientY: number }, pointer: PointerInit = {}) {
  window.dispatchEvent(new PointerEvent("pointermove", { ...point, ...pointer, bubbles: true }));
}

function release(point: { clientX: number; clientY: number }, pointer: PointerInit = {}) {
  window.dispatchEvent(new PointerEvent("pointerup", { ...point, ...pointer, bubbles: true }));
}

const selection = () => document.querySelector<SVGRectElement>(".vpg-chart-zoom-selection");

/** The x of every vertex of the first line's path, in client coordinates. */
function lineVertices() {
  const path = document.querySelector<SVGPathElement>("path.recharts-line-curve") as SVGPathElement;
  const box = (path.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
  // Each segment of the monotone curve is one cubic, ending at the next vertex.
  const commands = path.getAttribute("d")?.match(/[MC][^MC]*/g) ?? [];
  return commands.map((command) => {
    const numbers = command
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    return box.left + (numbers.at(-2) as number);
  });
}

describe("LineChart zoom in a real engine", () => {
  it("reports the dragged range once, in ordered x values within the data", async () => {
    const { onZoomChange, plot } = await renderChart();

    press(at(plot, 0.75));
    moveTo(at(plot, 0.5));
    moveTo(at(plot, 0.25));
    release(at(plot, 0.25));

    expect(onZoomChange).toHaveBeenCalledTimes(1);
    const [zoom] = onZoomChange.mock.calls[0] as [{ start: number; end: number }];
    expect(zoom.start).toBeLessThan(zoom.end);
    expect(zoom.start).toBeCloseTo(25, 0);
    expect(zoom.end).toBeCloseTo(75, 0);
  });

  it("reads the pointer relative to the chart's position on the page", async () => {
    const offset = { left: 40, top: 120 };
    const { onZoomChange, plot } = await renderChart({}, offset);
    const surface = (document.querySelector(".recharts-surface") as SVGSVGElement).getBoundingClientRect();

    expect(surface.left).toBeGreaterThanOrEqual(offset.left);
    expect(surface.top).toBeGreaterThanOrEqual(offset.top);

    // Near the bottom of the plot, so a pointer read without subtracting the surface's top falls
    // below it.
    const low = (fraction: number) => ({ ...at(plot, fraction), clientY: plot.top + plot.height * 0.9 });
    press(low(0.25));
    moveTo(low(0.75));
    const band = (await waitFor(selection)).getBoundingClientRect();

    expect(band.left).toBeCloseTo(plot.left + plot.width * 0.25, 0);
    expect(band.width).toBeCloseTo(plot.width * 0.5, 0);

    release(low(0.75));

    expect(onZoomChange).toHaveBeenCalledTimes(1);
    const [zoom] = onZoomChange.mock.calls[0] as [{ start: number; end: number }];
    expect(zoom.start).toBeCloseTo(25, 0);
    expect(zoom.end).toBeCloseTo(75, 0);
  });

  it("reports epoch milliseconds on a time axis", async () => {
    const start = Date.UTC(2026, 0, 1);
    const rows = data.map((row) => ({ ...row, t: start + (row.t as number) * 60_000 }));
    const { onZoomChange, plot } = await renderChart({ data: rows, xKind: "time" });

    press(at(plot, 0));
    moveTo(at(plot, 1));
    release(at(plot, 1));

    expect(onZoomChange).toHaveBeenCalledWith({ start, end: start + 100 * 60_000 });
  });

  it("shows a translucent accent band over the dragged span, and removes it on release", async () => {
    const { plot } = await renderChart();

    press(at(plot, 0.2));
    moveTo(at(plot, 0.6));
    const band = await waitFor(selection);
    const box = band.getBoundingClientRect();
    const style = getComputedStyle(band);
    const probe = document.createElement("span");
    probe.style.color = "var(--vpg-accent)";
    (document.querySelector(".vpg-root") as HTMLElement).append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();

    expect(box.left).toBeCloseTo(plot.left + plot.width * 0.2, 0);
    expect(box.width).toBeCloseTo(plot.width * 0.4, 0);
    expect(box.top).toBeCloseTo(plot.top, 0);
    expect(box.height).toBeCloseTo(plot.height, 0);
    expect(style.fill).toBe(accent);
    expect(Number(style.fillOpacity)).toBeGreaterThan(0);
    expect(Number(style.fillOpacity)).toBeLessThan(1);
    expect(style.pointerEvents).toBe("none");

    release(at(plot, 0.6));
    await nextFrame();

    expect(selection()).toBeNull();
  });

  it("reports nothing for a press without a drag", async () => {
    const { onZoomChange, plot } = await renderChart();

    press(at(plot, 0.5));
    release(at(plot, 0.5));
    press(at(plot, 0.5));
    moveTo({ ...at(plot, 0.5), clientX: at(plot, 0.5).clientX + 2 });
    release(at(plot, 0.5));

    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("cancels the drag on Escape", async () => {
    const { onZoomChange, plot } = await renderChart();

    press(at(plot, 0.2));
    moveTo(at(plot, 0.6));
    await waitFor(selection);
    // Any other key leaves the drag alone.
    await userEvent.keyboard("{Shift}");
    expect(selection()).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await nextFrame();
    release(at(plot, 0.6));

    expect(selection()).toBeNull();
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("cancels the drag when the pointer leaves the plot", async () => {
    const { onZoomChange, plot } = await renderChart();

    press(at(plot, 0.2));
    moveTo(at(plot, 0.6));
    await waitFor(selection);
    moveTo({ clientX: plot.left + plot.width / 2, clientY: plot.top + plot.height + 20 });
    await nextFrame();
    moveTo(at(plot, 0.8));
    release(at(plot, 0.8));

    expect(selection()).toBeNull();
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("cancels the drag when the engine cancels the pointer", async () => {
    const { onZoomChange, plot } = await renderChart();

    press(at(plot, 0.2));
    moveTo(at(plot, 0.6));
    await waitFor(selection);
    window.dispatchEvent(new PointerEvent("pointercancel"));
    await nextFrame();
    release(at(plot, 0.6));

    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("leaves a drag to the finger that started it, and lets another finger drag once it lifts", async () => {
    const { onZoomChange, plot } = await renderChart();
    const first = { pointerId: 11, pointerType: "touch" };
    const second = { pointerId: 12, pointerType: "touch" };

    press(at(plot, 0.2), 0, first);
    moveTo(at(plot, 0.6), first);
    const band = (await waitFor(selection)).getBoundingClientRect();
    press(at(plot, 0.8), 0, second);
    moveTo(at(plot, 0.9), second);
    release(at(plot, 0.9), second);
    window.dispatchEvent(new PointerEvent("pointercancel", second));
    await nextFrame();
    const held = (selection() as SVGRectElement).getBoundingClientRect();

    expect(held.left).toBeCloseTo(band.left, 0);
    expect(held.width).toBeCloseTo(band.width, 0);
    expect(onZoomChange).not.toHaveBeenCalled();

    release(at(plot, 0.6), first);

    expect(onZoomChange).toHaveBeenCalledTimes(1);
    const [zoom] = onZoomChange.mock.calls[0] as [{ start: number; end: number }];
    expect(zoom.start).toBeCloseTo(20, 0);
    expect(zoom.end).toBeCloseTo(60, 0);

    press(at(plot, 0.3), 0, second);
    moveTo(at(plot, 0.7), second);
    release(at(plot, 0.7), second);

    expect(onZoomChange).toHaveBeenCalledTimes(2);
    const [next] = onZoomChange.mock.calls[1] as [{ start: number; end: number }];
    expect(next.start).toBeCloseTo(30, 0);
    expect(next.end).toBeCloseTo(70, 0);
  });

  it("starts no drag from a press outside the plot or with another button", async () => {
    const { onZoomChange, plot } = await renderChart();

    press({ clientX: plot.left + plot.width / 2, clientY: plot.top + plot.height + 12 });
    moveTo(at(plot, 0.8));
    release(at(plot, 0.8));
    press(at(plot, 0.2), 2);
    moveTo(at(plot, 0.8));
    release(at(plot, 0.8));

    expect(selection()).toBeNull();
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("draws only the samples within the zoom, across the plot's full width", async () => {
    await renderChart({ zoom: { start: 30, end: 60 } });
    const clip = document.querySelector<SVGRectElement>(".recharts-surface clipPath rect") as SVGRectElement;
    const box = (clip.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const left = box.left + clip.x.baseVal.value;
    const vertices = lineVertices();

    expect(vertices).toHaveLength(4);
    expect(vertices[0]).toBeCloseTo(left, 0);
    expect(vertices.at(-1)).toBeCloseTo(left + clip.width.baseVal.value, 0);
  });

  it("reports a range within the zoom when dragging a zoomed chart", async () => {
    const { onZoomChange, plot } = await renderChart({ zoom: { start: 30, end: 60 } });

    press(at(plot, 0));
    moveTo(at(plot, 0.5));
    release(at(plot, 0.5));

    const [zoom] = onZoomChange.mock.calls[0] as [{ start: number; end: number }];
    expect(zoom.start).toBeCloseTo(30, 0);
    expect(zoom.end).toBeCloseTo(45, 0);
  });

  it("places the reset control inside the chart and clears the zoom when pressed", async () => {
    const { onZoomChange, getByRole } = await renderChart({ zoom: { start: 30, end: 60 } });
    const button = getByRole("button", { name: "Reset zoom" });
    const chart = (document.querySelector(".vpg-chart-container") as HTMLElement).getBoundingClientRect();
    const box = button.getBoundingClientRect();

    expect(box.top).toBeGreaterThanOrEqual(chart.top);
    expect(box.right).toBeLessThanOrEqual(chart.right);

    await userEvent.click(button);

    expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(null);
  });
});

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

describe("LineChart reference lines in a real engine", () => {
  const limit = { referenceLines: [{ y: 5, label: "Limit" }] };
  const referenceLine = () => document.querySelector<SVGLineElement>(".vpg-chart-reference-line line") as SVGLineElement;
  const referenceLabel = () => document.querySelector<SVGTextElement>(".vpg-chart-reference-label") as SVGTextElement;

  it("draws a line above every sample across the plot, above the series, with its label inside the plot", async () => {
    const { plot } = await renderChart(limit);
    const line = referenceLine().getBoundingClientRect();
    const label = referenceLabel().getBoundingClientRect();
    const series = (document.querySelector("path.recharts-line-curve") as SVGPathElement).getBoundingClientRect();

    expect(line.left).toBeCloseTo(plot.left, 0);
    expect(line.width).toBeCloseTo(plot.width, 0);
    expect(line.top).toBeGreaterThanOrEqual(plot.top - 1);
    expect(line.bottom).toBeLessThan(series.top);
    expect(label.width).toBeGreaterThan(0);
    expect(label.top).toBeGreaterThanOrEqual(plot.top);
    expect(label.bottom).toBeLessThanOrEqual(plot.top + plot.height);
    expect(label.left).toBeGreaterThanOrEqual(plot.left);
  });

  it("dashes the line in the strong border role and sets its label in the muted ink role", async () => {
    await renderChart(limit);
    const line = getComputedStyle(referenceLine());
    const label = getComputedStyle(referenceLabel());

    expect(line.stroke).toBe(resolvedColour("--vpg-border-strong"));
    expect(line.strokeDasharray).not.toBe("none");
    expect(label.fill).toBe(resolvedColour("--vpg-ink-muted"));
    expect(line.pointerEvents).toBe("none");
    expect(label.pointerEvents).toBe("none");
  });

  it("lets a drag that starts on a line or its label zoom the chart", async () => {
    const { onZoomChange, plot } = await renderChart(limit);
    const label = referenceLabel().getBoundingClientRect();
    const onLabel = { clientX: label.left + label.width / 2, clientY: label.top + label.height / 2 };
    const onLine = { clientX: plot.left + plot.width * 0.75, clientY: referenceLine().getBoundingClientRect().top };

    press(onLabel);
    moveTo(onLine);
    release(onLine);

    expect(onZoomChange).toHaveBeenCalledTimes(1);
  });
});

describe("LineChart gaps in a real engine", () => {
  const gapRects = () => [...document.querySelectorAll<SVGPathElement>(".vpg-chart-gap path")].map((rect) => rect.getBoundingClientRect());
  const gapLabel = () => document.querySelector<SVGTextElement>(".vpg-chart-gap-label") as SVGTextElement;

  it("shades a gap inside the data across its x range and the plot's full height, labelled inside it", async () => {
    const { plot } = await renderChart({ gaps: [{ start: 20, end: 40, label: "Outage" }] });
    const [band] = gapRects() as [DOMRect];
    const label = gapLabel().getBoundingClientRect();

    expect(band.left).toBeCloseTo(plot.left + plot.width * 0.2, 0);
    expect(band.width).toBeCloseTo(plot.width * 0.2, 0);
    expect(band.top).toBeCloseTo(plot.top, 0);
    expect(band.height).toBeCloseTo(plot.height, 0);
    expect(label.width).toBeGreaterThan(0);
    expect(label.top).toBeGreaterThanOrEqual(plot.top);
    expect(label.left).toBeGreaterThanOrEqual(band.left - 1);
  });

  it("clips a gap straddling an edge to the plot, and draws none wholly outside the data", async () => {
    const { plot } = await renderChart({
      gaps: [
        { start: -50, end: 30, label: "Before" },
        { start: 90, end: 500, label: "After" },
        { start: 200, end: 300, label: "Outside" },
      ],
    });
    const [before, after] = gapRects() as [DOMRect, DOMRect];

    expect(gapRects()).toHaveLength(2);
    expect(before.left).toBeCloseTo(plot.left, 0);
    expect(before.right).toBeCloseTo(plot.left + plot.width * 0.3, 0);
    expect(after.left).toBeCloseTo(plot.left + plot.width * 0.9, 0);
    expect(after.right).toBeCloseTo(plot.left + plot.width, 0);
  });

  it("clips a gap to the zoomed range", async () => {
    const { plot } = await renderChart({ zoom: { start: 40, end: 80 }, gaps: [{ start: 20, end: 50, label: "Outage" }] });
    const [band] = gapRects() as [DOMRect];

    expect(gapRects()).toHaveLength(1);
    expect(band.left).toBeCloseTo(plot.left, 0);
    expect(band.right).toBeCloseTo(plot.left + plot.width * 0.25, 0);
  });

  it("shades the gap in the translucent muted ink role, beneath the series, and sets its label in the muted ink role", async () => {
    await renderChart({ gaps: [{ start: 20, end: 40, label: "Outage" }] });
    const rect = document.querySelector<SVGPathElement>(".vpg-chart-gap path") as SVGPathElement;
    const band = getComputedStyle(rect);
    const series = document.querySelector("path.recharts-line-curve") as SVGPathElement;

    expect(band.fill).toBe(resolvedColour("--vpg-ink-muted"));
    expect(Number(band.fillOpacity)).toBeLessThan(0.15);
    expect(getComputedStyle(gapLabel()).fill).toBe(resolvedColour("--vpg-ink-muted"));
    expect(band.pointerEvents).toBe("none");
    expect(getComputedStyle(gapLabel()).pointerEvents).toBe("none");
    expect(rect.compareDocumentPosition(series) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets a drag that starts on a gap's band or its label zoom the chart", async () => {
    const { onZoomChange, plot } = await renderChart({ gaps: [{ start: 20, end: 40, label: "Outage" }] });
    const label = gapLabel().getBoundingClientRect();
    const onLabel = { clientX: label.left + label.width / 2, clientY: label.top + label.height / 2 };

    press(at(plot, 0.3));
    moveTo(at(plot, 0.7));
    release(at(plot, 0.7));
    press(onLabel);
    moveTo(at(plot, 0.8));
    release(at(plot, 0.8));

    expect(onZoomChange).toHaveBeenCalledTimes(2);
  });
});

describe("LineChart markers in a real engine", () => {
  const markerLines = () => [...document.querySelectorAll<SVGLineElement>(".vpg-chart-marker line")];
  const markerLabels = () => [...document.querySelectorAll<SVGTextElement>(".vpg-chart-marker-label")];
  const inside = (box: DOMRect, plot: Plot) => {
    expect(box.width).toBeGreaterThan(0);
    expect(box.left).toBeGreaterThanOrEqual(plot.left);
    expect(box.right).toBeLessThanOrEqual(plot.left + plot.width);
    expect(box.top).toBeGreaterThanOrEqual(plot.top);
    expect(box.bottom).toBeLessThanOrEqual(plot.top + plot.height);
  };

  it("draws a marker across the plot's full height at its x, above the series, with its label inside the plot", async () => {
    const { plot } = await renderChart({ markers: [{ x: 30, label: "Deploy" }] });
    const [line] = markerLines() as [SVGLineElement];
    const box = line.getBoundingClientRect();
    const series = document.querySelector("path.recharts-line-curve") as SVGPathElement;

    expect(box.left).toBeCloseTo(plot.left + plot.width * 0.3, 0);
    expect(box.top).toBeCloseTo(plot.top, 0);
    expect(box.height).toBeCloseTo(plot.height, 0);
    inside((markerLabels()[0] as SVGTextElement).getBoundingClientRect(), plot);
    expect(series.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the label of a marker on either edge inside the plot, on the side away from that edge", async () => {
    const { plot } = await renderChart({
      markers: [
        { x: 0, label: "First" },
        { x: 100, label: "Last" },
      ],
    });
    const [first, last] = markerLines().map((line) => line.getBoundingClientRect()) as [DOMRect, DOMRect];
    const [firstLabel, lastLabel] = markerLabels().map((label) => label.getBoundingClientRect()) as [DOMRect, DOMRect];

    expect(first.left).toBeCloseTo(plot.left, 0);
    expect(last.left).toBeCloseTo(plot.left + plot.width, 0);
    inside(firstLabel, plot);
    inside(lastLabel, plot);
    expect(firstLabel.left).toBeGreaterThan(first.left);
    expect(lastLabel.right).toBeLessThan(last.left);
  });

  it("sets the label apart from a reference line's label and a gap's label", async () => {
    await renderChart({
      referenceLines: [{ y: 5, label: "Limit" }],
      gaps: [{ start: 0, end: 40, label: "Outage" }],
      markers: [{ x: 10, label: "Deploy" }],
    });
    const label = (markerLabels()[0] as SVGTextElement).getBoundingClientRect();
    const others = [".vpg-chart-reference-label", ".vpg-chart-gap-label"].map((selector) =>
      (document.querySelector(selector) as SVGTextElement).getBoundingClientRect(),
    );

    for (const other of others) {
      const overlaps = label.left < other.right && other.left < label.right && label.top < other.bottom && other.top < label.bottom;
      expect(overlaps).toBe(false);
    }
  });

  it("draws no marker outside the data, and only those within the zoomed range", async () => {
    const { plot } = await renderChart({
      zoom: { start: 40, end: 80 },
      markers: [
        { x: 20, label: "Before" },
        { x: 60, label: "Inside" },
        { x: 200, label: "Outside" },
      ],
    });
    const [line] = markerLines() as [SVGLineElement];

    expect(markerLines()).toHaveLength(1);
    expect(markerLabels().map((label) => label.textContent)).toEqual(["Inside"]);
    expect(line.getBoundingClientRect().left).toBeCloseTo(plot.left + plot.width * 0.5, 0);
  });

  it("dashes the marker in the strong border role and sets its label in the muted ink role", async () => {
    await renderChart({ markers: [{ x: 30, label: "Deploy" }] });
    const line = getComputedStyle(markerLines()[0] as SVGLineElement);
    const label = getComputedStyle(markerLabels()[0] as SVGTextElement);

    expect(line.stroke).toBe(resolvedColour("--vpg-border-strong"));
    expect(line.strokeDasharray).not.toBe("none");
    expect(label.fill).toBe(resolvedColour("--vpg-ink-muted"));
    expect(line.pointerEvents).toBe("none");
    expect(label.pointerEvents).toBe("none");
  });

  it("lets a drag through a marker, or one that starts on its label, zoom the chart", async () => {
    const { onZoomChange, plot } = await renderChart({ markers: [{ x: 50, label: "Deploy" }] });
    const label = (markerLabels()[0] as SVGTextElement).getBoundingClientRect();
    const onLabel = { clientX: label.left + label.width / 2, clientY: label.top + label.height / 2 };

    press(at(plot, 0.3));
    moveTo(at(plot, 0.5));
    moveTo(at(plot, 0.7));
    release(at(plot, 0.7));
    press(onLabel);
    moveTo(at(plot, 0.9));
    release(at(plot, 0.9));

    expect(onZoomChange).toHaveBeenCalledTimes(2);
    const [zoom] = onZoomChange.mock.calls[0] as [{ start: number; end: number }];
    expect(zoom.start).toBeCloseTo(30, 0);
    expect(zoom.end).toBeCloseTo(70, 0);
  });
});
