import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { SpaceToken } from "../internal/space.js";
import { Inline } from "./Inline.js";

/**
 * The inline's gap, alignment and wrapping reach its stylesheet as `var()` reads of
 * `--vpg-inline-*` properties, which jsdom neither resolves nor lays out, so the only place the
 * spacing and the line breaking can be observed is a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first sits beside the previous one
// and `.vpg-inline` matches more than one element.
afterEach(cleanup);

/** Mounts `children` under a real provider, so every `--vpg-space-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

/** The mounted inline and its direct children's boxes, in document order. */
function inlineOf(container: HTMLElement): { inline: HTMLElement; items: DOMRect[] } {
  const inline = container.querySelector(".vpg-inline") as HTMLElement;
  // React 19 hoists each `<style precedence>` into the head, so the inline's element children are
  // exactly the children the caller passed.
  const items = [...inline.querySelectorAll(":scope > *")].map((item) => item.getBoundingClientRect());
  return { inline, items };
}

/** The gap the engine resolved for the inline, in pixels — the oracle every spacing assertion reads. */
function resolvedGap(inline: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(inline).columnGap);
}

function renderItems(gap: SpaceToken) {
  const { container } = renderThemed(
    <Inline gap={gap}>
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </Inline>,
  );
  return inlineOf(container);
}

/**
 * Asserts each item sits on the same row as the one before it and strictly to its right,
 * separated by exactly `gap` pixels. Layout snaps to 1/64px, so a sub-pixel difference is rounding
 * rather than a different gap.
 */
function expectSpacedItems(items: DOMRect[], gap: number) {
  for (let i = 0; i < items.length - 1; i++) {
    const [before, after] = [items[i], items[i + 1]] as [DOMRect, DOMRect];
    expect(after.top).toBeCloseTo(before.top, 1);
    expect(after.left).toBeGreaterThan(before.left);
    expect(after.left - before.right).toBeCloseTo(gap, 1);
  }
}

describe("Inline gap in a real engine", () => {
  it.each(["space-1", "space-4", "space-8"] as const)("separates consecutive items by the resolved %s step", (gap) => {
    const { inline, items } = renderItems(gap);
    const step = resolvedGap(inline);

    expect(items).toHaveLength(3);
    expect(step).toBeGreaterThan(0);
    expectSpacedItems(items, step);
  });

  it("resolves a different length for each step on the spacing scale", () => {
    const steps = (["space-1", "space-4", "space-8"] as const).map((gap) => {
      const step = resolvedGap(renderItems(gap).inline);
      cleanup();
      return step;
    });

    expect(new Set(steps).size).toBe(steps.length);
    const [small, medium, large] = steps as [number, number, number];
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it("butts consecutive items together when the gap is none", () => {
    const { inline, items } = renderItems("none");

    expect(resolvedGap(inline)).toBe(0);
    expectSpacedItems(items, 0);
  });
});

describe("Inline wrapping in a real engine", () => {
  // Two 80px items and the largest step (2rem) fit in 200px; a third does not, whatever the gap,
  // so the line break falls after the second item deterministically.
  const CONTAINER_WIDTH = 200;
  const ITEM_STYLE = { width: 80, height: 20, flexShrink: 0 } as const;

  function renderFixed(props: { gap: SpaceToken; wrap?: boolean }) {
    const { container } = renderThemed(
      <div style={{ width: CONTAINER_WIDTH }}>
        <Inline {...props}>
          <div style={ITEM_STYLE}>One</div>
          <div style={ITEM_STYLE}>Two</div>
          <div style={ITEM_STYLE}>Three</div>
        </Inline>
      </div>,
    );
    return inlineOf(container);
  }

  it.each(["space-1", "space-4", "space-8"] as const)("breaks onto a second line %s below the first", (gap) => {
    const { inline, items } = renderFixed({ gap });
    const step = resolvedGap(inline);
    const [first, second, third] = items as [DOMRect, DOMRect, DOMRect];

    expect(step).toBeGreaterThan(0);
    expectSpacedItems([first, second], step);
    expect(third.top).toBeGreaterThan(first.top);
    expect(third.left).toBeCloseTo(first.left, 1);
    expect(third.top - first.bottom).toBeCloseTo(step, 1);
  });

  it("keeps every item on one row when wrap is false", () => {
    const { inline, items } = renderFixed({ gap: "space-4", wrap: false });
    const step = resolvedGap(inline);

    expect(items).toHaveLength(3);
    expectSpacedItems(items, step);
  });
});
