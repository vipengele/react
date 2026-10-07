import { describe, expect, it } from "vitest";
import { type PageItem, pageWindow } from "./pageWindow";

/** A compact picture of a bar: page numbers as numbers, ellipses as `"…start"` / `"…end"`. */
function render(items: readonly PageItem[]): (number | string)[] {
  return items.map((item) => (item.kind === "page" ? item.page : `…${item.side}`));
}

function pages(items: readonly PageItem[]): number[] {
  return items.flatMap((item) => (item.kind === "page" ? [item.page] : []));
}

describe("pageWindow", () => {
  describe("page counts with no pages", () => {
    it("returns nothing for a page count of 0", () => {
      expect(pageWindow(1, 0, 1)).toEqual([]);
    });

    it("returns nothing for a negative page count", () => {
      expect(pageWindow(1, -3, 1)).toEqual([]);
    });

    it("returns nothing for a NaN page count", () => {
      expect(pageWindow(1, Number.NaN, 1)).toEqual([]);
    });
  });

  describe("page counts that fit in the bar", () => {
    it("returns the single page for a page count of 1", () => {
      expect(pageWindow(1, 1, 1)).toEqual([{ kind: "page", page: 1 }]);
    });

    it("returns every page with no ellipsis when the count is below the slot count", () => {
      expect(render(pageWindow(2, 4, 1))).toEqual([1, 2, 3, 4]);
    });

    it("returns every page with no ellipsis when the count equals the slot count", () => {
      expect(render(pageWindow(1, 7, 1))).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(render(pageWindow(4, 7, 1))).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(render(pageWindow(7, 7, 1))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("sizes the slot count from siblings", () => {
      expect(render(pageWindow(1, 5, 0))).toEqual([1, 2, 3, 4, 5]);
      expect(render(pageWindow(5, 9, 2))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe("page counts larger than the bar, one sibling", () => {
    it("fills the start with pages and puts the ellipsis at the end on the first page", () => {
      expect(render(pageWindow(1, 10, 1))).toEqual([1, 2, 3, 4, 5, "…end", 10]);
    });

    it("puts the ellipsis on both sides in the middle", () => {
      expect(render(pageWindow(5, 10, 1))).toEqual([1, "…start", 4, 5, 6, "…end", 10]);
      expect(render(pageWindow(6, 10, 1))).toEqual([1, "…start", 5, 6, 7, "…end", 10]);
    });

    it("fills the end with pages and puts the ellipsis at the start on the last page", () => {
      expect(render(pageWindow(10, 10, 1))).toEqual([1, "…start", 6, 7, 8, 9, 10]);
    });

    it("shows page 2 rather than an ellipsis hiding only page 2", () => {
      // The window 3..5 leaves only page 2 between it and page 1.
      expect(render(pageWindow(4, 10, 1))).toEqual([1, 2, 3, 4, 5, "…end", 10]);
    });

    it("shows the second-last page rather than an ellipsis hiding only that page", () => {
      // The window 6..8 leaves only page 9 between it and page 10.
      expect(render(pageWindow(7, 10, 1))).toEqual([1, "…start", 6, 7, 8, 9, 10]);
    });

    it("uses an ellipsis once it would hide two pages", () => {
      // The window 4..6 hides pages 2 and 3.
      expect(render(pageWindow(5, 12, 1))).toEqual([1, "…start", 4, 5, 6, "…end", 12]);
    });

    it("returns the slot count for the smallest page count that overflows the bar", () => {
      expect(render(pageWindow(1, 8, 1))).toEqual([1, 2, 3, 4, 5, "…end", 8]);
      expect(render(pageWindow(4, 8, 1))).toEqual([1, 2, 3, 4, 5, "…end", 8]);
      expect(render(pageWindow(5, 8, 1))).toEqual([1, "…start", 4, 5, 6, 7, 8]);
      expect(render(pageWindow(8, 8, 1))).toEqual([1, "…start", 4, 5, 6, 7, 8]);
    });
  });

  describe("siblings", () => {
    it("shows only the current page between the ellipses with no siblings", () => {
      expect(render(pageWindow(1, 10, 0))).toEqual([1, 2, 3, "…end", 10]);
      expect(render(pageWindow(5, 10, 0))).toEqual([1, "…start", 5, "…end", 10]);
      expect(render(pageWindow(10, 10, 0))).toEqual([1, "…start", 8, 9, 10]);
    });

    it("shows two pages on each side of the current page with two siblings", () => {
      expect(render(pageWindow(1, 20, 2))).toEqual([1, 2, 3, 4, 5, 6, 7, "…end", 20]);
      expect(render(pageWindow(10, 20, 2))).toEqual([1, "…start", 8, 9, 10, 11, 12, "…end", 20]);
      expect(render(pageWindow(20, 20, 2))).toEqual([1, "…start", 14, 15, 16, 17, 18, 19, 20]);
    });

    it("floors fractional siblings", () => {
      expect(pageWindow(10, 20, 1.9)).toEqual(pageWindow(10, 20, 1));
    });

    it("treats negative siblings as none", () => {
      expect(pageWindow(5, 10, -2)).toEqual(pageWindow(5, 10, 0));
    });

    it("treats NaN siblings as none", () => {
      expect(pageWindow(5, 10, Number.NaN)).toEqual(pageWindow(5, 10, 0));
    });
  });

  describe("current page clamping", () => {
    it("treats a page below 1 as the first page", () => {
      expect(pageWindow(0, 10, 1)).toEqual(pageWindow(1, 10, 1));
      expect(pageWindow(-5, 10, 1)).toEqual(pageWindow(1, 10, 1));
    });

    it("treats a page above the page count as the last page", () => {
      expect(pageWindow(11, 10, 1)).toEqual(pageWindow(10, 10, 1));
      expect(pageWindow(99, 10, 1)).toEqual(pageWindow(10, 10, 1));
    });

    it("floors a fractional page", () => {
      expect(pageWindow(5.7, 10, 1)).toEqual(pageWindow(5, 10, 1));
    });

    it("treats a NaN page as the first page", () => {
      expect(pageWindow(Number.NaN, 10, 1)).toEqual(pageWindow(1, 10, 1));
    });
  });

  describe("invariants across every page", () => {
    const cases: [pageCount: number, siblings: number][] = [];
    for (let pageCount = 1; pageCount <= 30; pageCount += 1) {
      for (let siblings = 0; siblings <= 3; siblings += 1) cases.push([pageCount, siblings]);
    }

    it.each(cases)("keeps the bar one length for %i pages with %i siblings", (pageCount, siblings) => {
      const expected = Math.min(pageCount, siblings * 2 + 5);
      for (let page = 1; page <= pageCount; page += 1) {
        expect(pageWindow(page, pageCount, siblings)).toHaveLength(expected);
      }
    });

    it.each(cases)("shows each in-range page at most once, in order, for %i pages with %i siblings", (pageCount, siblings) => {
      for (let page = 1; page <= pageCount; page += 1) {
        const shown = pages(pageWindow(page, pageCount, siblings));
        expect(new Set(shown).size).toBe(shown.length);
        expect(shown).toEqual([...shown].sort((a, b) => a - b));
        for (const p of shown) {
          expect(p).toBeGreaterThanOrEqual(1);
          expect(p).toBeLessThanOrEqual(pageCount);
        }
      }
    });

    it.each(cases)(
      "always shows the first, last and current page and their siblings for %i pages with %i siblings",
      (pageCount, siblings) => {
        for (let page = 1; page <= pageCount; page += 1) {
          const shown = new Set(pages(pageWindow(page, pageCount, siblings)));
          expect(shown.has(1)).toBe(true);
          expect(shown.has(pageCount)).toBe(true);
          for (let p = Math.max(page - siblings, 1); p <= Math.min(page + siblings, pageCount); p += 1) {
            expect(shown.has(p)).toBe(true);
          }
        }
      },
    );

    it.each(cases)("hides at least two pages behind every ellipsis for %i pages with %i siblings", (pageCount, siblings) => {
      for (let page = 1; page <= pageCount; page += 1) {
        const items = pageWindow(page, pageCount, siblings);
        items.forEach((item, index) => {
          if (item.kind !== "ellipsis") return;
          const before = items[index - 1];
          const after = items[index + 1];
          if (before?.kind !== "page" || after?.kind !== "page") throw new Error("an ellipsis sits between two pages");
          expect(after.page - before.page - 1).toBeGreaterThanOrEqual(2);
        });
        const sides = items.flatMap((item) => (item.kind === "ellipsis" ? [item.side] : []));
        expect(new Set(sides).size).toBe(sides.length);
      }
    });
  });
});
