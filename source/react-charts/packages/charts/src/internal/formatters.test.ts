import { describe, expect, it } from "vitest";
import { chartFormatters, yTickText } from "./formatters.js";

describe("yTickText", () => {
  it("writes a string tick as it is", () => {
    expect(yTickText("12 ms")).toBe("12 ms");
  });

  it("writes a [value, unit] pair as the value, one space and the unit", () => {
    expect(yTickText(["12", "Mbit/s"])).toBe("12 Mbit/s");
  });
});

describe("chartFormatters", () => {
  const options = { isTime: false, rows: [], xKey: "t", formatX: undefined, formatTooltipLabel: undefined } as const;
  const series = { key: "a", label: "Alpha" };

  it("writes the tooltip value from a pair-returning formatY on one line", () => {
    const { tooltipValue } = chartFormatters({ ...options, formatY: (y) => [String(y), "kB"], formatTooltipValue: undefined });

    expect(tooltipValue(3, series)).toBe("3 kB");
  });

  it("writes the tooltip value with formatTooltipValue when one is given", () => {
    const { tooltipValue } = chartFormatters({ ...options, formatY: (y) => [String(y), "kB"], formatTooltipValue: (value) => `${value}!` });

    expect(tooltipValue(3, series)).toBe("3!");
  });
});
