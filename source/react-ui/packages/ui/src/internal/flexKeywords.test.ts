import { describe, expect, it } from "vitest";
import { ALIGN_VALUES, type FlexAlign, type FlexJustify, JUSTIFY_VALUES, resolveKeyword } from "./flexKeywords";

describe("ALIGN_VALUES", () => {
  it("maps each keyword to its align-items value", () => {
    expect(ALIGN_VALUES).toEqual({
      start: "flex-start",
      center: "center",
      end: "flex-end",
      stretch: "stretch",
      baseline: "baseline",
    });
  });
});

describe("JUSTIFY_VALUES", () => {
  it("maps each keyword to its justify-content value", () => {
    expect(JUSTIFY_VALUES).toEqual({
      start: "flex-start",
      center: "center",
      end: "flex-end",
      between: "space-between",
    });
  });
});

describe("resolveKeyword", () => {
  it("resolves a held keyword to its value", () => {
    expect(resolveKeyword(ALIGN_VALUES, "baseline", "stretch")).toBe("baseline");
    expect(resolveKeyword(JUSTIFY_VALUES, "between", "start")).toBe("space-between");
  });

  it("resolves a keyword cast past the type to the fallback's value", () => {
    expect(resolveKeyword(ALIGN_VALUES, "left" as FlexAlign, "stretch")).toBe("stretch");
    expect(resolveKeyword(JUSTIFY_VALUES, "left" as FlexJustify, "start")).toBe("flex-start");
  });

  it("resolves an inherited object property name to the fallback's value", () => {
    expect(resolveKeyword(ALIGN_VALUES, "toString" as FlexAlign, "stretch")).toBe("stretch");
    expect(resolveKeyword(JUSTIFY_VALUES, "toString" as FlexJustify, "start")).toBe("flex-start");
  });
});
