import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Line, LineChart, XAxis, YAxis, type YAxisTickContentProps } from "recharts";
import type { ChartYFormatter } from "../types.js";
import { yAxisTick } from "./YAxisTick.js";

const rows = [
  { t: 1, v: 10 },
  { t: 2, v: 40 },
];

/** The y axis's tick label markup in a fixed-size chart whose y axis is `axis`. */
function tickLabels(axis: ReactElement) {
  const { container } = render(
    <LineChart width={300} height={200} data={rows}>
      <XAxis dataKey="t" type="number" />
      {axis}
      <Line dataKey="v" isAnimationActive={false} />
    </LineChart>,
  );
  const labels = container.querySelector(".recharts-yAxis-tick-labels");
  if (!labels) throw new Error("the chart drew no y tick labels");
  return labels;
}

/** Draws the tick for `value` at (40, 100) on its own, with the props the y axis gives a tick. */
function drawTick(format: ChartYFormatter, value = 5) {
  const props = {
    x: 40,
    y: 100,
    className: "recharts-yAxis yAxis",
    textAnchor: "end",
    verticalAnchor: "middle",
    fill: "currentColor",
    stroke: "none",
    angle: 0,
    index: 0,
    visibleTicksCount: 1,
    payload: { value, coordinate: 100, offset: 0, index: 0 },
  } as unknown as YAxisTickContentProps;
  const { container } = render(<svg aria-hidden="true">{yAxisTick(format)(props)}</svg>);
  return container.querySelector("svg > text") as SVGTextElement;
}

describe("yAxisTick", () => {
  it("draws a string tick exactly as the default tick draws the same label", () => {
    const format = (y: number) => `${y} ms`;
    const fallback = tickLabels(
      <YAxis width={48} tickFormatter={(y: number) => format(y)} stroke="currentColor" tick={{ fill: "currentColor" }} />,
    );
    const drawn = tickLabels(<YAxis width={48} stroke="currentColor" tick={yAxisTick(format)} />);

    expect(drawn.querySelectorAll("text").length).toBeGreaterThan(0);
    expect(drawn.innerHTML).toBe(fallback.innerHTML);
  });

  it("draws a string tick on one line", () => {
    const text = drawTick((y) => `${y} ms`);

    expect([...text.querySelectorAll("tspan")].map((line) => line.textContent)).toEqual(["5 ms"]);
    expect(text.getAttribute("text-anchor")).toBe("end");
  });

  it("draws a [value, unit] pair as two lines, the value above the unit", () => {
    const text = drawTick((y) => [String(y * 2), "Mbit/s"]);
    const lines = [...text.querySelectorAll("tspan")];

    expect(lines.map((line) => line.textContent)).toEqual(["10", "Mbit/s"]);
    expect(lines.map((line) => line.getAttribute("dy"))).toEqual(["-0.145em", "1em"]);
    expect(lines.map((line) => line.getAttribute("x"))).toEqual(["40", "40"]);
  });

  it("places a pair at the tick, right-aligned in the default tick's class, fill and stroke", () => {
    const text = drawTick(() => ["1", "kB"]);

    expect(text.getAttribute("x")).toBe("40");
    expect(text.getAttribute("y")).toBe("100");
    expect(text.getAttribute("text-anchor")).toBe("end");
    expect(text.getAttribute("class")).toBe("recharts-cartesian-axis-tick-value");
    expect(text.getAttribute("fill")).toBe("currentColor");
    expect(text.getAttribute("stroke")).toBe("none");
  });

  it("formats the tick's own value", () => {
    const seen: number[] = [];
    drawTick((y) => {
      seen.push(y);
      return ["", ""];
    }, 7);

    expect(seen).toEqual([7]);
  });
});
