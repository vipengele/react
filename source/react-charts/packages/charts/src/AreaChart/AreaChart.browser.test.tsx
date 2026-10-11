import { cleanup, render } from "@testing-library/react";
import { type ColorMode, ThemeProvider } from "@vipengele/react-tokens";
import { afterEach, describe, expect, it } from "vitest";
import { AreaChart, type AreaChartProps, type AreaChartRow, type AreaChartSeries } from "./AreaChart.js";

/**
 * The areas' fills are relative colours over `light-dark()` roles, and the mirrored pair's place
 * either side of the zero line is layout. jsdom neither resolves the one nor lays out the other,
 * so both are only observable in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this
// every render after the first sits beside the previous one.
afterEach(cleanup);

const WIDTH = 360;
const HEIGHT = 300;

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

/** Mounts the chart in `colorMode` and resolves once its areas are drawn. */
async function renderChart(props: Partial<AreaChartProps> & Pick<AreaChartProps, "data" | "series">, colorMode?: ColorMode) {
  render(
    <ThemeProvider colorMode={colorMode}>
      <div style={{ width: WIDTH }}>
        <AreaChart height={HEIGHT} xKey="t" {...props} />
      </div>
    </ThemeProvider>,
  );
  await waitFor(() => document.querySelector("path.recharts-area-area"));
  return {
    fills: [...document.querySelectorAll<SVGPathElement>("path.recharts-area-area")],
    outlines: [...document.querySelectorAll<SVGPathElement>("path.recharts-area-curve")],
  };
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

interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
  readonly alpha: number;
}

/** Reads a computed `oklch()` colour, whose alpha is 1 when it names none. */
function oklch(colour: string): Oklch {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(colour);
  if (!match) throw new Error(`not an oklch() colour: ${colour}`);
  const [, l, c, h, alpha = "1"] = match;
  return { l: Number(l), c: Number(c), h: Number(h), alpha: Number(alpha) };
}

describe("AreaChart colour in a real engine", () => {
  // Seven series, so the seventh wraps round to the first role.
  const seven: AreaChartSeries[] = Array.from({ length: 7 }, (_, index) => ({ key: `s${index}`, label: `Series ${index}` }));
  const rows: AreaChartRow[] = [0, 1].map((t) => ({ t, ...Object.fromEntries(seven.map(({ key }, index) => [key, index + t])) }));

  async function seriesColours(colorMode: ColorMode, series = seven) {
    const { fills, outlines } = await renderChart({ data: rows, series }, colorMode);
    const colours = fills.map((fill, index) => ({
      fill: oklch(getComputedStyle(fill).fill),
      outline: oklch(getComputedStyle(outlines[index] as SVGPathElement).stroke),
    }));
    const roles = [1, 2, 3, 4, 5, 6].map((role) => oklch(resolvedColour(`--vpg-chart-${role}`)));
    cleanup();
    return { colours, roles };
  }

  it.each(["light", "dark"] as const)("fills each area with its series colour made translucent, in %s mode", async (colorMode) => {
    const { colours, roles } = await seriesColours(colorMode);

    expect(colours).toHaveLength(7);
    colours.forEach(({ fill, outline }, index) => {
      const role = roles[index % 6] as Oklch;
      expect(outline).toEqual({ ...role, alpha: 1 });
      expect(fill).toEqual({ l: role.l, c: role.c, h: role.h, alpha: 0.2 });
    });
    expect(colours[6]).toEqual(colours[0]);
    expect(new Set(roles.map(({ h }) => h)).size).toBe(6);
  });

  it("follows the colour mode", async () => {
    const light = await seriesColours("light");
    const dark = await seriesColours("dark");

    expect(dark.colours[0]?.fill.alpha).toBe(0.2);
    expect(dark.colours[0]?.fill).not.toEqual(light.colours[0]?.fill);
  });

  it.each(["light", "dark"] as const)("fills a series pinned by colorIndex with its role, in %s mode", async (colorMode) => {
    const pinned: AreaChartSeries[] = [{ ...(seven[0] as AreaChartSeries), colorIndex: 4 }];
    const { colours, roles } = await seriesColours(colorMode, pinned);
    const role = roles[3] as Oklch;

    expect(colours[0]?.fill).toEqual({ l: role.l, c: role.c, h: role.h, alpha: 0.2 });
  });
});

describe("AreaChart signed values in a real engine", () => {
  // Download as positive values and upload negated, the mirrored throughput layout.
  const mirrored: AreaChartRow[] = Array.from({ length: 6 }, (_, t) => ({ t, down: 10 + t * 4, up: -(5 + (t % 3) * 6) }));
  const pair: AreaChartSeries[] = [
    { key: "down", label: "Download" },
    { key: "up", label: "Upload" },
  ];

  it("draws a mirrored pair either side of the zero line", async () => {
    const { fills } = await renderChart({ data: mirrored, series: pair });
    const zero = (document.querySelector(".vpg-chart-zero-line line") as SVGLineElement).getBoundingClientRect();
    const [down, up] = fills.map((fill) => fill.getBoundingClientRect()) as [DOMRect, DOMRect];

    expect(zero.width).toBeGreaterThan(0);
    expect(down.height).toBeGreaterThan(0);
    expect(up.height).toBeGreaterThan(0);
    expect(down.bottom).toBeCloseTo(zero.top, 0);
    expect(down.top).toBeLessThan(zero.top);
    expect(up.top).toBeCloseTo(zero.top, 0);
    expect(up.bottom).toBeGreaterThan(zero.top);
  });

  it("strokes the zero line in the strong border role", async () => {
    await renderChart({ data: mirrored, series: pair }, "dark");
    const line = document.querySelector(".vpg-chart-zero-line line") as SVGLineElement;

    expect(getComputedStyle(line).stroke).toBe(resolvedColour("--vpg-border-strong"));
  });

  it("fills an all-positive series down to the x axis, with no zero line over it", async () => {
    const { fills } = await renderChart({ data: mirrored, series: [pair[0] as AreaChartSeries] });
    const clip = document.querySelector<SVGRectElement>(".recharts-surface clipPath rect") as SVGRectElement;
    const surface = (clip.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const plotBottom = surface.top + clip.y.baseVal.value + clip.height.baseVal.value;

    expect((fills[0] as SVGPathElement).getBoundingClientRect().bottom).toBeCloseTo(plotBottom, 0);
    expect(document.querySelector(".vpg-chart-zero-line")).toBeNull();
  });
});

describe("AreaChart two-line y ticks in a real engine", () => {
  const mirrored: AreaChartRow[] = Array.from({ length: 6 }, (_, t) => ({ t, down: 10 + t * 4, up: -(5 + (t % 3) * 6) }));
  const pair: AreaChartSeries[] = [
    { key: "down", label: "Download" },
    { key: "up", label: "Upload" },
  ];

  /** Each y tick's value and unit lines, with the horizontal gridline at the tick's own y. */
  async function twoLineTicks() {
    await renderChart({ data: mirrored, series: pair, formatY: (y) => [String(Math.abs(y)), "Mbit/s"] });
    const gridlines = [...document.querySelectorAll<SVGLineElement>(".recharts-cartesian-grid-horizontal line")];
    const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-yAxis-tick-labels text")];
    return ticks.map((tick) => {
      const gridline = gridlines.find((line) => line.getAttribute("y1") === tick.getAttribute("y"));
      if (!gridline) throw new Error(`no gridline at y=${tick.getAttribute("y")}`);
      const [value, unit] = [...tick.querySelectorAll("tspan")].map((line) => line.getBoundingClientRect()) as [DOMRect, DOMRect];
      return { text: tick.getBoundingClientRect(), value, unit, gridline: gridline.getBoundingClientRect() };
    });
  }

  it("centres each two-line tick on its gridline", async () => {
    const ticks = await twoLineTicks();

    expect(ticks.length).toBeGreaterThan(2);
    for (const { text, value, unit, gridline } of ticks) {
      const gridY = (gridline.top + gridline.bottom) / 2;
      expect(Math.abs((text.top + text.bottom) / 2 - gridY)).toBeLessThanOrEqual(1);
      expect(Math.abs((value.top + unit.bottom) / 2 - gridY)).toBeLessThanOrEqual(1);
    }
  });

  it("draws the unit one line below the value", async () => {
    const ticks = await twoLineTicks();
    const fontSize = Number.parseFloat(getComputedStyle(document.querySelector(".recharts-yAxis-tick-labels text") as Element).fontSize);

    expect(fontSize).toBeGreaterThan(0);
    for (const { value, unit } of ticks) {
      expect(unit.top).toBeGreaterThan(value.top);
      expect(unit.bottom).toBeGreaterThan(value.bottom);
      expect(Math.abs(unit.top - value.top - fontSize)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps both lines right-aligned against the axis within its 48px", async () => {
    const ticks = await twoLineTicks();
    const axis = (document.querySelector(".recharts-yAxis .recharts-cartesian-axis-line") as SVGLineElement).getBoundingClientRect();

    for (const { value, unit } of ticks) {
      expect(Math.abs(value.right - unit.right)).toBeLessThanOrEqual(1);
      expect(value.right).toBeLessThan(axis.left);
      expect(unit.left).toBeGreaterThan(axis.left - 48);
    }
  });
});
