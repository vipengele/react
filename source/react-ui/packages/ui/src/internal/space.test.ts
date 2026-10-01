import { describe, expect, it } from "vitest";
import { resolveSpace, type SpaceToken, spaceValues } from "./space";

describe("spaceValues", () => {
  it("maps none to 0", () => {
    expect(spaceValues.none).toBe(0);
  });

  it("maps every scale step to a bare var() read of its theme token", () => {
    for (let step = 1; step <= 8; step++) {
      expect(spaceValues[`space-${step}` as SpaceToken]).toBe(`var(--vpg-space-${step})`);
    }
  });

  it("holds no entry beyond none and the eight steps", () => {
    expect(Object.keys(spaceValues)).toHaveLength(9);
  });
});

describe("resolveSpace", () => {
  it("resolves none to 0", () => {
    expect(resolveSpace("none")).toBe(0);
  });

  it("resolves a scale step to its var() read", () => {
    expect(resolveSpace("space-1")).toBe("var(--vpg-space-1)");
    expect(resolveSpace("space-8")).toBe("var(--vpg-space-8)");
  });

  it("resolves a value cast past the type to the default step", () => {
    expect(resolveSpace("13px" as SpaceToken)).toBe("var(--vpg-space-4)");
    expect(resolveSpace("space-0" as SpaceToken)).toBe("var(--vpg-space-4)");
  });

  it("resolves an inherited object property name to the default step", () => {
    expect(resolveSpace("toString" as SpaceToken)).toBe("var(--vpg-space-4)");
  });
});
