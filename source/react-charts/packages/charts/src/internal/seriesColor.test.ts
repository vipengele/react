import { describe, expect, it } from "vitest";
import { seriesColor } from "./seriesColor.js";
import type { ChartColorRole } from "./types.js";

describe("seriesColor", () => {
  const base = { key: "a", label: "Alpha" };

  it("cycles the six series roles by position when the series names no colour", () => {
    expect([0, 1, 5, 6, 13].map((index) => seriesColor(base, index))).toEqual([
      "var(--vpg-chart-1)",
      "var(--vpg-chart-2)",
      "var(--vpg-chart-6)",
      "var(--vpg-chart-1)",
      "var(--vpg-chart-2)",
    ]);
  });

  it("takes the series role colorIndex pins, whatever the position", () => {
    expect(seriesColor({ ...base, colorIndex: 4 }, 0)).toBe("var(--vpg-chart-4)");
  });

  it.each<[ChartColorRole, string]>([
    ["chart-1", "var(--vpg-chart-1)"],
    ["chart-2", "var(--vpg-chart-2)"],
    ["chart-3", "var(--vpg-chart-3)"],
    ["chart-4", "var(--vpg-chart-4)"],
    ["chart-5", "var(--vpg-chart-5)"],
    ["chart-6", "var(--vpg-chart-6)"],
    ["success", "var(--vpg-success)"],
    ["danger", "var(--vpg-danger)"],
    ["warning", "var(--vpg-warning)"],
    ["info", "var(--vpg-info)"],
    ["neutral", "var(--vpg-ink)"],
  ])("reads role %s bare as %s", (color, expected) => {
    expect(seriesColor({ ...base, color }, 2)).toBe(expected);
  });

  it("lets color take precedence over colorIndex", () => {
    expect(seriesColor({ ...base, color: "danger", colorIndex: 3 }, 0)).toBe("var(--vpg-danger)");
    expect(seriesColor({ ...base, color: "chart-5", colorIndex: 2 }, 0)).toBe("var(--vpg-chart-5)");
  });
});
