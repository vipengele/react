import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type ColumnSizing,
  columnSizingOf,
  DEFAULT_COLUMN_SIZE,
  DEFAULT_MIN_COLUMN_SIZE,
  stretchColumnSizes,
  useColumnSizing,
} from "./useColumnSizing.js";

describe("columnSizingOf", () => {
  it("applies the defaults to a column that declares nothing", () => {
    expect(columnSizingOf("name", {})).toEqual({
      id: "name",
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_MIN_COLUMN_SIZE,
      maxSize: Number.POSITIVE_INFINITY,
      resizable: true,
    });
    expect(DEFAULT_COLUMN_SIZE).toBe(150);
    expect(DEFAULT_MIN_COLUMN_SIZE).toBe(20);
  });

  it("keeps a column's own size, bounds and resizable flag", () => {
    expect(columnSizingOf("age", { size: 80, minSize: 60, maxSize: 120, resizable: false })).toEqual({
      id: "age",
      size: 80,
      minSize: 60,
      maxSize: 120,
      resizable: false,
    });
  });

  it("clamps the size into the bounds", () => {
    expect(columnSizingOf("a", { size: 10, minSize: 40 }).size).toBe(40);
    expect(columnSizingOf("a", { size: 500, maxSize: 300 }).size).toBe(300);
  });

  it("reads a negative minimum as 0 and a maximum below the minimum as the minimum", () => {
    expect(columnSizingOf("a", { minSize: -5, size: 0 })).toMatchObject({ minSize: 0, size: 0 });
    expect(columnSizingOf("a", { minSize: 100, maxSize: 50 })).toMatchObject({ minSize: 100, maxSize: 100, size: 100 });
  });

  it("reads a size or bound that is not finite as its default", () => {
    expect(columnSizingOf("a", { size: Number.NaN, minSize: Number.POSITIVE_INFINITY, maxSize: Number.NEGATIVE_INFINITY })).toMatchObject({
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_MIN_COLUMN_SIZE,
      maxSize: Number.POSITIVE_INFINITY,
    });
  });
});

const columns: ColumnSizing[] = [columnSizingOf("name", { size: 200 }), columnSizingOf("age", { size: 80, minSize: 60, maxSize: 120 })];

describe("stretchColumnSizes", () => {
  function stretch(bases: number[], available: number, maxSizes: Record<number, number> = {}): number[] {
    return stretchColumnSizes(
      bases.map((base, index) => ({ base, maxSize: maxSizes[index] ?? Number.POSITIVE_INFINITY })),
      available,
    );
  }

  it("keeps every base while the bases reach or exceed the width available", () => {
    expect(stretch([200, 80], 280)).toEqual([200, 80]);
    expect(stretch([200, 80], 100)).toEqual([200, 80]);
    expect(stretch([200, 80], 280.9)).toEqual([200, 80]);
    expect(stretch([200, 80], 0)).toEqual([200, 80]);
  });

  it("shares the surplus in proportion to the bases, filling the width exactly", () => {
    expect(stretch([200, 80], 560)).toEqual([400, 160]);
  });

  it("hands the pixels the rounding leaves to the first columns with room, one each", () => {
    // A surplus of 100 shares out as 33.3 each: 33 each, and the one pixel left goes first.
    expect(stretch([100, 100, 100], 400)).toEqual([134, 133, 133]);
  });

  it("caps a column at its maxSize and shares what it cannot take among the rest", () => {
    // Proportionally the first would take 50; it takes 20, and the other 180 go 1:2.
    expect(stretch([100, 100, 200], 600, { 0: 120 })).toEqual([120, 160, 320]);
  });

  it("caps again when a redistributed share pushes another column past its maxSize", () => {
    // A first pass caps the first (a share of 100 > 10 of room), a second the second (145 > 130).
    expect(stretch([100, 100, 100], 600, { 0: 110, 1: 230 })).toEqual([110, 230, 260]);
  });

  it("leaves the rest undistributed once every column is capped", () => {
    expect(stretch([100, 100], 1000, { 0: 150, 1: 120 })).toEqual([150, 120]);
  });

  it("gives a column already at its maxSize no share and no rounding pixel", () => {
    expect(stretch([100, 100, 100], 401, { 0: 100 })).toEqual([100, 151, 150]);
  });

  it("gives a column with a base of 0 no share and no rounding pixel", () => {
    expect(stretch([0, 100, 200], 401)).toEqual([0, 134, 267]);
  });

  it("keeps a fractional base's fraction and never rounds a capped column past its maxSize", () => {
    // The first can take 49.5 and takes 49; the second takes the rest, and no pixel is left.
    expect(stretch([100.5, 100], 400.5, { 0: 150 })).toEqual([149.5, 251]);
  });
});

type Options = Parameters<typeof useColumnSizing>[0];

function renderSizing(options: Partial<Options> = {}, sizing: readonly ColumnSizing[] = columns, availableWidth = 0) {
  return renderHook(
    (props: { options: Options; sizing: readonly ColumnSizing[]; availableWidth: number }) =>
      useColumnSizing(props.options, props.sizing, props.availableWidth),
    {
      initialProps: {
        options: { columnSizes: undefined, defaultColumnSizes: undefined, onColumnSizesChange: undefined, ...options },
        sizing,
        availableWidth,
      },
    },
  );
}

describe("useColumnSizing", () => {
  it("draws each column at its own size when the sizes hold no entry for it", () => {
    const { result } = renderSizing();
    expect(result.current.columnSizes).toEqual({ name: 200, age: 80 });
    expect(result.current.drawnSizes).toEqual({ name: 200, age: 80 });
    expect(result.current.totalDrawnSize).toBe(280);
  });

  it("draws an entry clamped into its column's bounds, ignoring entries naming no column", () => {
    const { result } = renderSizing({ columnSizes: { name: 10, age: 500, gone: 99 } });
    expect(result.current.columnSizes).toEqual({ name: DEFAULT_MIN_COLUMN_SIZE, age: 120 });
    expect(result.current.totalDrawnSize).toBe(140);
  });

  it("draws an entry that is not a finite number at the column's own size", () => {
    const { result } = renderSizing({ columnSizes: { name: Number.NaN, age: Number.POSITIVE_INFINITY } });
    expect(result.current.columnSizes).toEqual({ name: 200, age: 80 });
  });

  it("starts from the default sizes while uncontrolled", () => {
    const { result } = renderSizing({ defaultColumnSizes: { age: 100 } });
    expect(result.current.columnSizes).toEqual({ name: 200, age: 100 });
  });

  it("exposes every column's bounds by id", () => {
    const { result } = renderSizing();
    expect(result.current.bounds.get("age")).toEqual({ id: "age", size: 80, minSize: 60, maxSize: 120, resizable: true });
    expect(result.current.bounds.get("name")?.maxSize).toBe(Number.POSITIVE_INFINITY);
  });

  it("keeps the sizes' identity across renders that draw the same widths", () => {
    const { result, rerender } = renderSizing({ columnSizes: { age: 90 } });
    const first = result.current.columnSizes;
    rerender({
      options: { columnSizes: { age: 90 }, defaultColumnSizes: undefined, onColumnSizesChange: undefined },
      sizing: columns.map((column) => ({ ...column })),
      availableWidth: 0,
    });
    expect(result.current.columnSizes).toBe(first);
    rerender({
      options: { columnSizes: { age: 95 }, defaultColumnSizes: undefined, onColumnSizesChange: undefined },
      sizing: columns,
      availableWidth: 0,
    });
    expect(result.current.columnSizes).not.toBe(first);
    expect(result.current.columnSizes).toEqual({ name: 200, age: 95 });
  });

  it("draws the columns stretched into a wider width while the sizes stay the bases", () => {
    const { result } = renderSizing({}, columns, 500);
    expect(result.current.columnSizes).toEqual({ name: 200, age: 80 });
    // The age column is capped at 120, so the name column takes the other 180 pixels.
    expect(result.current.drawnSizes).toEqual({ name: 380, age: 120 });
    expect(result.current.totalDrawnSize).toBe(500);
  });

  it("keeps the bases in a narrower width", () => {
    const { result } = renderSizing({}, columns, 200);
    expect(result.current.drawnSizes).toEqual({ name: 200, age: 80 });
    expect(result.current.totalDrawnSize).toBe(280);
  });

  it("keeps each record's identity until one of its own widths changes", () => {
    const options = { columnSizes: undefined, defaultColumnSizes: undefined, onColumnSizesChange: undefined };
    const { result, rerender } = renderSizing({}, columns, 300);
    const { columnSizes, drawnSizes } = result.current;
    expect(drawnSizes).toEqual({ name: 215, age: 85 });
    rerender({ options: { ...options }, sizing: columns, availableWidth: 300 });
    expect(result.current.drawnSizes).toBe(drawnSizes);
    rerender({ options, sizing: columns, availableWidth: 320 });
    expect(result.current.drawnSizes).not.toBe(drawnSizes);
    expect(result.current.drawnSizes).toEqual({ name: 229, age: 91 });
    expect(result.current.columnSizes).toBe(columnSizes);
  });

  describe("setColumnSize", () => {
    it("updates an uncontrolled size and reports the sizes with that entry replaced", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ defaultColumnSizes: { gone: 7 }, onColumnSizesChange });
      act(() => result.current.setColumnSize("name", 240));
      expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ gone: 7, name: 240 });
      expect(result.current.columnSizes).toEqual({ name: 240, age: 80 });
      expect(result.current.totalDrawnSize).toBe(320);
    });

    it("clamps the width into the column's bounds before reporting it", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ onColumnSizesChange });
      act(() => result.current.setColumnSize("age", 10));
      expect(onColumnSizesChange).toHaveBeenLastCalledWith({ age: 60 });
      act(() => result.current.setColumnSize("age", 1000));
      expect(onColumnSizesChange).toHaveBeenLastCalledWith({ age: 120 });
    });

    it("reports a controlled change without drawing it, keeping other entries unclamped", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ columnSizes: { name: 5 }, onColumnSizesChange });
      act(() => result.current.setColumnSize("age", 100));
      expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ name: 5, age: 100 });
      expect(result.current.columnSizes).toEqual({ name: DEFAULT_MIN_COLUMN_SIZE, age: 80 });
    });

    it("reports the base, never the stretched width, and compares against the base", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ onColumnSizesChange }, columns, 600);
      expect(result.current.drawnSizes.age).toBe(120);
      act(() => result.current.setColumnSize("age", 80));
      expect(onColumnSizesChange).not.toHaveBeenCalled();
      act(() => result.current.setColumnSize("name", 300));
      expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ name: 300 });
      expect(result.current.columnSizes).toEqual({ name: 300, age: 80 });
      expect(result.current.drawnSizes).toEqual({ name: 480, age: 120 });
    });

    it("reports nothing when the clamped width is the width drawn", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ columnSizes: { age: 500 }, onColumnSizesChange });
      act(() => result.current.setColumnSize("age", 120));
      act(() => result.current.setColumnSize("age", 400));
      act(() => result.current.setColumnSize("name", 200));
      expect(onColumnSizesChange).not.toHaveBeenCalled();
    });

    it("ignores a column id naming no column and a width that is not finite", () => {
      const onColumnSizesChange = vi.fn();
      const { result } = renderSizing({ onColumnSizesChange });
      act(() => result.current.setColumnSize("gone", 100));
      act(() => result.current.setColumnSize("name", Number.NaN));
      act(() => result.current.setColumnSize("name", Number.POSITIVE_INFINITY));
      expect(onColumnSizesChange).not.toHaveBeenCalled();
      expect(result.current.columnSizes).toEqual({ name: 200, age: 80 });
    });
  });
});
