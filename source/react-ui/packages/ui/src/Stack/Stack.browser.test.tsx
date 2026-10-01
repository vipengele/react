import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "../Checkbox/Checkbox.js";
import type { SpaceToken } from "../internal/space.js";
import { Stack } from "./Stack.js";

/**
 * The stack's gap and alignment reach its stylesheet as `var()` reads of `--vpg-stack-*`
 * properties, which jsdom neither resolves nor lays out, so the only place the spacing and the
 * cross-axis placement can be observed is a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first sits beside the previous one
// and `.vpg-stack` matches more than one element.
afterEach(cleanup);

/** Mounts `children` under a real provider, so every `--vpg-space-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

/** The mounted stack and its direct children's boxes, in document order. */
function stackOf(container: HTMLElement): { stack: HTMLElement; rows: DOMRect[] } {
  const stack = container.querySelector(".vpg-stack") as HTMLElement;
  // React 19 hoists each `<style precedence>` into the head, so the stack's element children are
  // exactly the children the caller passed.
  const rows = [...stack.querySelectorAll(":scope > *")].map((row) => row.getBoundingClientRect());
  return { stack, rows };
}

/** The gap the engine resolved for the stack, in pixels — the oracle every spacing assertion reads. */
function resolvedGap(stack: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(stack).rowGap);
}

function renderRows(gap: SpaceToken) {
  const { container } = renderThemed(
    <Stack gap={gap}>
      <div>One</div>
      <div>Two</div>
      <div>Three</div>
    </Stack>,
  );
  return stackOf(container);
}

/**
 * Asserts each row sits strictly below the one before it, separated by exactly `gap` pixels.
 * Layout snaps to 1/64px, so a sub-pixel difference is rounding rather than a different gap.
 */
function expectSpacedRows(rows: DOMRect[], gap: number) {
  for (let i = 0; i < rows.length - 1; i++) {
    const [above, below] = [rows[i], rows[i + 1]] as [DOMRect, DOMRect];
    expect(below.top).toBeGreaterThan(above.top);
    expect(below.top - above.bottom).toBeCloseTo(gap, 1);
  }
}

describe("Stack gap in a real engine", () => {
  it.each(["space-1", "space-4", "space-8"] as const)("separates consecutive rows by the resolved %s step", (gap) => {
    const { stack, rows } = renderRows(gap);
    const step = resolvedGap(stack);

    expect(rows).toHaveLength(3);
    expect(step).toBeGreaterThan(0);
    expectSpacedRows(rows, step);
  });

  it("resolves a different length for each step on the spacing scale", () => {
    const steps = (["space-1", "space-4", "space-8"] as const).map((gap) => {
      const step = resolvedGap(renderRows(gap).stack);
      cleanup();
      return step;
    });

    expect(new Set(steps).size).toBe(steps.length);
    const [small, medium, large] = steps as [number, number, number];
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it("butts consecutive rows together when the gap is none", () => {
    const { stack, rows } = renderRows("none");

    expect(resolvedGap(stack)).toBe(0);
    expectSpacedRows(rows, 0);
  });
});

describe("Stack cross-axis alignment in a real engine", () => {
  function renderAligned(align: "stretch" | "center") {
    const { container } = renderThemed(
      <Stack align={align}>
        <div>Short</div>
        <div>Also short</div>
      </Stack>,
    );
    return { ...stackOf(container), box: (container.querySelector(".vpg-stack") as HTMLElement).getBoundingClientRect() };
  }

  it("stretches auto-width children to the stack's full width", () => {
    const { box, rows } = renderAligned("stretch");

    expect(box.width).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.left).toBeCloseTo(box.left, 1);
      expect(row.width).toBeCloseTo(box.width, 1);
    }
  });

  it("narrows auto-width children to their content and centres them when aligned center", () => {
    const { box, rows } = renderAligned("center");

    for (const row of rows) {
      expect(row.width).toBeGreaterThan(0);
      expect(row.width).toBeLessThan(box.width);
      expect(row.left - box.left).toBeCloseTo(box.right - row.right, 1);
    }
  });
});

describe("labelled Checkbox rows in a Stack", () => {
  // A labelled row is `width: fit-content`, so it keeps its content width under every `align`;
  // what the stack decides for it is only where it sits vertically.
  it.each(["space-1", "space-4", "space-8"] as const)("stacks the rows vertically, %s apart", (gap) => {
    const { container } = renderThemed(
      <Stack gap={gap}>
        <Checkbox label="Agree" />
        <Checkbox label="Subscribe" />
        <Checkbox label="Remember me" />
      </Stack>,
    );
    const { stack, rows } = stackOf(container);
    const step = resolvedGap(stack);

    expect(stack.querySelectorAll(":scope > label.vpg-checkbox-row")).toHaveLength(3);
    expect(step).toBeGreaterThan(0);
    expectSpacedRows(rows, step);
  });
});
