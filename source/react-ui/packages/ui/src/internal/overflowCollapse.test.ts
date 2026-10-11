import { afterEach, describe, expect, it, vi } from "vitest";
import { countFitting, countHidden, measureHidden, widthsOf } from "./overflowCollapse";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A box that reports `width` from `getBoundingClientRect`, as an engine that lays out would. */
function box(width: number, className: string): HTMLElement {
  const element = document.createElement("span");
  element.className = className;
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ width } as DOMRect);
  return element;
}

describe("widthsOf", () => {
  it("reports the width of every matching element in document order", () => {
    const row = document.createElement("div");
    row.append(box(30, "item"), box(10, "other"), box(20, "item"));

    expect(widthsOf(row, ".item")).toEqual([30, 20]);
  });

  it("reports nothing for a selector that matches no element", () => {
    expect(widthsOf(document.createElement("div"), ".item")).toEqual([]);
  });
});

describe("countFitting", () => {
  it("fits nothing when there are no boxes", () => {
    expect(countFitting([], 4, 100)).toBe(0);
  });

  it("counts every box that stands inside the available width", () => {
    expect(countFitting([30, 30, 30], 0, 100)).toBe(3);
  });

  it("counts a gap between each pair of boxes and none before the first", () => {
    expect(countFitting([30, 30], 10, 70)).toBe(2);
    expect(countFitting([30, 30], 10, 69)).toBe(1);
  });

  it("fits nothing when the first box alone exceeds the available width", () => {
    expect(countFitting([101, 10], 0, 100)).toBe(0);
  });

  it("stops at the first box that does not fit, however narrow a later one is", () => {
    expect(countFitting([40, 80, 5], 0, 100)).toBe(1);
  });
});

describe("countHidden", () => {
  it("hides nothing when the row measures zero wide", () => {
    expect(countHidden([30, 30, 30], [20], 0, 0)).toBe(0);
  });

  it("hides nothing when every item fits", () => {
    expect(countHidden([30, 30], [50], 0, 60)).toBe(0);
  });

  it("hides what no longer fits once the indicator takes its width", () => {
    // Three items of 30 need 90; the indicator's 20 leaves room for two of the three in 80.
    expect(countHidden([30, 30, 30], [20], 0, 80)).toBe(1);
  });

  it("drops further items when the indicator's reservation pushes them off the row", () => {
    // 30 + 30 fit in 70 alone, but not beside an indicator of 20.
    expect(countHidden([30, 30, 30], [20], 0, 70)).toBe(2);
  });

  it("counts the gap between the indicator and the first item", () => {
    expect(countHidden([30, 30, 30], [20], 10, 80)).toBe(2);
  });

  it("keeps one item visible however little room the row has", () => {
    expect(countHidden([200, 200, 200], [50], 0, 40)).toBe(2);
  });
});

describe("measureHidden", () => {
  function row(available: number, columnGap: string) {
    const element = document.createElement("div");
    element.style.columnGap = columnGap;
    Object.defineProperty(element, "clientWidth", { value: available });
    document.body.append(element);
    return element;
  }

  it("counts the items the row has no width for", () => {
    const element = row(80, "0px");
    element.append(box(30, "item"), box(30, "item"), box(30, "item"), box(20, "indicator"));

    expect(measureHidden(element, ".item", ".indicator")).toBe(1);
    element.remove();
  });

  it("reads the gap between items from the row's column-gap", () => {
    const element = row(80, "10px");
    element.append(box(30, "item"), box(30, "item"), box(30, "item"), box(20, "indicator"));

    expect(measureHidden(element, ".item", ".indicator")).toBe(2);
    element.remove();
  });

  it("marks the row as measuring only while it reads", () => {
    const element = row(80, "0px");
    const item = box(30, "item");
    let markedWhileReading: boolean | undefined;
    vi.spyOn(item, "getBoundingClientRect").mockImplementation(() => {
      markedWhileReading = element.hasAttribute("data-measuring");
      return { width: 30 } as DOMRect;
    });
    element.append(item);

    measureHidden(element, ".item", ".indicator");

    expect(markedWhileReading).toBe(true);
    expect(element.hasAttribute("data-measuring")).toBe(false);
    element.remove();
  });
});
