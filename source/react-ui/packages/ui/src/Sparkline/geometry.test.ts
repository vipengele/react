import { describe, expect, it } from "vitest";
import {
  computeSparkline,
  describeTrend,
  SPARKLINE_PADDING,
  SPARKLINE_VIEWBOX,
  SPARKLINE_VIEWBOX_HEIGHT,
  SPARKLINE_VIEWBOX_WIDTH,
  type SparklineGeometry,
  type SparklineValues,
} from "./geometry.js";

/** Each segment as the input indices it covers. */
function runs(geometry: SparklineGeometry): number[][] {
  return geometry.segments.map((segment) => segment.points.map((point) => point.index));
}

/** The last `x y` pair of a line path. */
function pathEnd(d: string): { x: number; y: number } {
  const pairs = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
  const last = pairs[pairs.length - 1] as RegExpMatchArray;
  return { x: Number(last[1]), y: Number(last[2]) };
}

describe("computeSparkline", () => {
  describe("series with nothing to draw", () => {
    it("returns no segments, point, dot or trend for an empty series", () => {
      expect(computeSparkline([])).toEqual({ segments: [], lastPoint: null, dot: null, trend: null });
    });

    it("returns no segments, point, dot or trend when every value is absent", () => {
      expect(computeSparkline([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])).toEqual({
        segments: [],
        lastPoint: null,
        dot: null,
        trend: null,
      });
    });
  });

  describe("the viewBox", () => {
    it("is 100 by 100 with a tenth of its height as padding", () => {
      expect(SPARKLINE_VIEWBOX).toBe("0 0 100 100");
      expect(SPARKLINE_VIEWBOX_WIDTH).toBe(100);
      expect(SPARKLINE_VIEWBOX_HEIGHT).toBe(100);
      expect(SPARKLINE_PADDING).toBe(0.1);
    });
  });

  describe("one present value", () => {
    it("centres a lone value as a dot with no line", () => {
      const geometry = computeSparkline([12]);
      expect(geometry.segments).toEqual([{ points: [{ index: 0, value: 12, x: 50, y: 50 }], line: null, area: null }]);
      expect(geometry.lastPoint).toEqual({ index: 0, value: 12, x: 50, y: 50 });
      expect(geometry.dot).toEqual({ x: 50, y: 50 });
    });

    it("keeps the x slot of a lone present value among absent ones", () => {
      const geometry = computeSparkline([null, 7, null, null, null]);
      expect(geometry.lastPoint).toEqual({ index: 1, value: 7, x: 25, y: 50 });
      expect(geometry.segments).toHaveLength(1);
      expect(geometry.segments[0]?.line).toBeNull();
    });
  });

  describe("scaling", () => {
    it("maps the minimum to the bottom padding and the maximum to the top padding", () => {
      const geometry = computeSparkline([12, 31]);
      expect(geometry.segments[0]?.points).toEqual([
        { index: 0, value: 12, x: 0, y: 90 },
        { index: 1, value: 31, x: 100, y: 10 },
      ]);
    });

    it("places index i of N at i / (N - 1) of the width", () => {
      const xs = computeSparkline([1, 2, 3, 4, 5]).segments[0]?.points.map((point) => point.x);
      expect(xs).toEqual([0, 25, 50, 75, 100]);
    });

    it("scales between the present values only, ignoring absent ones", () => {
      const geometry = computeSparkline([Number.NEGATIVE_INFINITY, 0, 5, 10, Number.POSITIVE_INFINITY]);
      expect(geometry.segments[0]?.points.map((point) => point.y)).toEqual([90, 50, 10]);
    });

    it("centres an all-equal series vertically", () => {
      const geometry = computeSparkline([4, 4, 4]);
      expect(geometry.segments[0]?.points.map((point) => point.y)).toEqual([50, 50, 50]);
      expect(geometry.segments[0]?.line).toBe("M0 50 L50 50 L100 50");
    });

    it("rounds coordinates to two decimals", () => {
      const geometry = computeSparkline([0, 1, 3, 2]);
      expect(geometry.segments[0]?.line).toBe("M0 90 L33.33 63.33 L66.67 10 L100 36.67");
    });

    it("takes the padding as a fraction of the viewBox height", () => {
      const geometry = computeSparkline([0, 10], { padding: 0.25 });
      expect(geometry.segments[0]?.line).toBe("M0 75 L100 25");
      expect(computeSparkline([0, 10], { padding: 0 }).segments[0]?.line).toBe("M0 100 L100 0");
    });
  });

  describe("paths", () => {
    it("draws the line with M and L commands", () => {
      expect(computeSparkline([12, 31, 20]).segments[0]?.line).toBe("M0 90 L50 10 L100 56.32");
    });

    it("closes the area down to the bottom edge of the viewBox, not to zero", () => {
      expect(computeSparkline([12, 31]).segments[0]?.area).toBe("M0 100 L0 90 L100 10 L100 100 Z");
      expect(computeSparkline([-5, -1]).segments[0]?.area).toBe("M0 100 L0 90 L100 10 L100 100 Z");
    });
  });

  describe("gaps", () => {
    it("treats null, undefined, NaN and both infinities as absent", () => {
      const values: SparklineValues = [1, null, 2, undefined, 3, Number.NaN, 4, Number.POSITIVE_INFINITY, 5, Number.NEGATIVE_INFINITY, 6];
      expect(runs(computeSparkline(values))).toEqual([[0], [2], [4], [6], [8], [10]]);
    });

    it("starts the line at the first present value after leading gaps", () => {
      const geometry = computeSparkline([null, null, 1, 2]);
      expect(runs(geometry)).toEqual([[2, 3]]);
      expect(geometry.segments[0]?.line).toBe("M66.67 90 L100 10");
    });

    it("ends the line at the last present value before trailing gaps", () => {
      const geometry = computeSparkline([1, 2, null, undefined]);
      expect(runs(geometry)).toEqual([[0, 1]]);
      expect(geometry.lastPoint?.index).toBe(1);
      expect(geometry.segments[0]?.line).toBe("M0 90 L33.33 10");
    });

    it("breaks the line at an internal gap", () => {
      const geometry = computeSparkline([1, 2, null, 3, 4]);
      expect(runs(geometry)).toEqual([
        [0, 1],
        [3, 4],
      ]);
      expect(geometry.segments.map((segment) => segment.line)).toEqual(["M0 90 L25 63.33", "M75 36.67 L100 10"]);
    });

    it("reports a value isolated between gaps as a one-point segment with no paths", () => {
      const geometry = computeSparkline([1, 2, null, 3, null, 4, 5]);
      expect(runs(geometry)).toEqual([[0, 1], [3], [5, 6]]);
      expect(geometry.segments[1]).toEqual({
        points: [{ index: 3, value: 3, x: 50, y: 50 }],
        line: null,
        area: null,
      });
    });
  });

  describe("the end dot", () => {
    it("sits on the last present point, not the last index", () => {
      const geometry = computeSparkline([3, 9, 6, null]);
      expect(geometry.lastPoint).toEqual({ index: 2, value: 6, x: 66.67, y: 50 });
    });

    it.each([
      { values: [12, 31, 20], padding: undefined },
      { values: [5, 1, 8, 2, null], padding: 0.05 },
      { values: [0, 3, 1, 7], padding: 0.2 },
      { values: [null, 4, 4], padding: 0.3 },
    ])("equals the end of the line as percentages of the box for $values at padding $padding", ({ values, padding }) => {
      const geometry = computeSparkline(values, { padding });
      const last = geometry.segments[geometry.segments.length - 1];
      const end = pathEnd(last?.line ?? "");
      expect(geometry.dot).toEqual({
        x: (end.x / SPARKLINE_VIEWBOX_WIDTH) * 100,
        y: (end.y / SPARKLINE_VIEWBOX_HEIGHT) * 100,
      });
    });
  });

  describe("the trend", () => {
    it("is rising when the last present value is above the first", () => {
      expect(computeSparkline([null, 12, 40, 31, null]).trend).toEqual({
        direction: "rising",
        first: 12,
        last: 31,
        single: false,
      });
    });

    it("is falling when the last present value is below the first", () => {
      expect(computeSparkline([31, 2, 12]).trend?.direction).toBe("falling");
    });

    it("is flat when the first and last present values are equal", () => {
      expect(computeSparkline([5, 1, 9, 5]).trend?.direction).toBe("flat");
    });

    it("is flat and single for one present value", () => {
      expect(computeSparkline([Number.NaN, 12]).trend).toEqual({ direction: "flat", first: 12, last: 12, single: true });
    });
  });
});

describe("describeTrend", () => {
  it("names a rising series from its first to its last present value", () => {
    expect(describeTrend([null, 12, 40, 31, undefined])).toBe("Trend: rising, from 12 to 31");
  });

  it("names a falling series", () => {
    expect(describeTrend([31, 12])).toBe("Trend: falling, from 31 to 12");
  });

  it("names a flat series", () => {
    expect(describeTrend([12, 20, 12])).toBe("Trend: flat, from 12 to 12");
  });

  it("names a single present value as flat at that value", () => {
    expect(describeTrend([null, 12, Number.NaN])).toBe("Trend: flat, at 12");
  });

  it("reads No data for an empty series", () => {
    expect(describeTrend([])).toBe("No data");
  });

  it("reads No data when every value is absent", () => {
    expect(describeTrend([null, undefined, Number.NaN, Number.NEGATIVE_INFINITY])).toBe("No data");
  });

  it("formats the numbers for the given locale", () => {
    expect(describeTrend([1234.5, 9876543.25], "en-US")).toBe("Trend: rising, from 1,234.5 to 9,876,543.25");
    expect(describeTrend([1234.5, 9876543.25], "de-DE")).toBe("Trend: rising, from 1.234,5 to 9.876.543,25");
    expect(describeTrend([1234.5], "de-DE")).toBe("Trend: flat, at 1.234,5");
  });
});
