import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";
import { GridItem } from "./GridItem.js";

/**
 * Track sizing, `auto-fit` collapsing and span placement are the engine's own layout, and every
 * gap and column width is a `--vpg-*` read only a real cascade resolves. Each grid is given a
 * fixed width so its geometry does not depend on the viewport the test runs in.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this each
// render collides with the previous one and `getByTestId` matches more than one element.
afterEach(cleanup);

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

/** Resolves a length token to the pixels the engine computes for it inside the mounted root. */
function resolvedLength(token: string): number {
  const probe = document.createElement("div");
  probe.style.inlineSize = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const pixels = Number.parseFloat(getComputedStyle(probe).inlineSize);
  probe.remove();
  return pixels;
}

function rect(testId: string): DOMRect {
  return screen.getByTestId(testId).getBoundingClientRect();
}

/** Renders `count` empty cells, `cell-0` onwards, each one fixed row tall. */
function cells(count: number): ReactNode[] {
  return Array.from({ length: count }, (_, index) => `cell-${index}`).map((id) => (
    <div key={id} data-testid={id} style={{ blockSize: "40px" }} />
  ));
}

/** How many of the grid's `count` cells share the first cell's row. */
function cellsInFirstRow(count: number): number {
  const top = rect("cell-0").top;
  return Array.from({ length: count }, (_, index) => rect(`cell-${index}`).top).filter((cellTop) => Math.abs(cellTop - top) < 0.5).length;
}

describe("Grid under a real ThemeProvider", () => {
  describe("fixed columns", () => {
    it("lays out that many equal columns separated by the gap", () => {
      renderThemed(
        <Grid columns={3} gap="space-4" style={{ inlineSize: "600px" }}>
          {cells(3)}
        </Grid>,
      );

      const gap = resolvedLength("--vpg-space-4");
      const width = (600 - 2 * gap) / 3;
      for (const index of [0, 1, 2]) {
        expect(rect(`cell-${index}`).width).toBeCloseTo(width, 1);
      }
      expect(rect("cell-1").left - rect("cell-0").right).toBeCloseTo(gap, 1);
      expect(rect("cell-2").top).toBeCloseTo(rect("cell-0").top, 1);
    });

    it("wraps the cell after the last column onto the next row, one gap below", () => {
      renderThemed(
        <Grid columns={2} gap="space-3" style={{ inlineSize: "400px" }}>
          {cells(3)}
        </Grid>,
      );

      expect(rect("cell-2").left).toBeCloseTo(rect("cell-0").left, 1);
      expect(rect("cell-2").top - rect("cell-0").bottom).toBeCloseTo(resolvedLength("--vpg-space-3"), 1);
    });

    it("closes the gap entirely for none", () => {
      renderThemed(
        <Grid columns={2} gap="none" style={{ inlineSize: "400px" }}>
          {cells(4)}
        </Grid>,
      );

      expect(rect("cell-1").left).toBeCloseTo(rect("cell-0").right, 1);
      expect(rect("cell-2").top).toBeCloseTo(rect("cell-0").bottom, 1);
    });
  });

  describe("auto-fit", () => {
    it.each([600, 400, 300])("fits as many sm columns as a %ipx container allows", (containerWidth) => {
      renderThemed(
        <Grid minColumnWidth="sm" gap="space-2" style={{ inlineSize: `${containerWidth}px` }}>
          {cells(6)}
        </Grid>,
      );

      const step = resolvedLength("--vpg-column-sm");
      const gap = resolvedLength("--vpg-space-2");
      const fits = Math.floor((containerWidth + gap) / (step + gap));
      expect(cellsInFirstRow(6)).toBe(fits);
    });

    it("defaults to the md step", () => {
      renderThemed(
        <Grid gap="none" style={{ inlineSize: "700px" }}>
          {cells(6)}
        </Grid>,
      );

      expect(cellsInFirstRow(6)).toBe(Math.floor(700 / resolvedLength("--vpg-column-md")));
    });

    it("fits fewer columns at a wider step", () => {
      renderThemed(
        <Grid minColumnWidth="xl" gap="none" style={{ inlineSize: "800px" }}>
          {cells(6)}
        </Grid>,
      );

      expect(cellsInFirstRow(6)).toBe(Math.floor(800 / resolvedLength("--vpg-column-xl")));
    });

    it("stretches two items across a container wide enough for more", () => {
      renderThemed(
        <Grid minColumnWidth="sm" gap="space-4" style={{ inlineSize: "1000px" }}>
          {cells(2)}
        </Grid>,
      );

      // `auto-fill` would keep the empty tracks and leave both items at the step's width; `auto-fit`
      // collapses them, so the two items share the whole row.
      const gap = resolvedLength("--vpg-space-4");
      expect(rect("cell-0").width).toBeCloseTo((1000 - gap) / 2, 1);
      expect(rect("cell-1").right).toBeCloseTo(rect("cell-0").left + 1000, 1);
    });

    it("shows one full-width column in a container narrower than the step", () => {
      renderThemed(
        <Grid minColumnWidth="lg" gap="none" style={{ inlineSize: "120px" }}>
          {cells(2)}
        </Grid>,
      );

      expect(rect("cell-0").width).toBeCloseTo(120, 1);
      expect(rect("cell-1").top).toBeCloseTo(rect("cell-0").bottom, 1);
    });
  });

  describe("gap overrides", () => {
    it("separates rows by rowGap and columns by gap", () => {
      renderThemed(
        <Grid columns={2} gap="space-2" rowGap="space-6" style={{ inlineSize: "400px" }}>
          {cells(4)}
        </Grid>,
      );

      expect(rect("cell-2").top - rect("cell-0").bottom).toBeCloseTo(resolvedLength("--vpg-space-6"), 1);
      expect(rect("cell-1").left - rect("cell-0").right).toBeCloseTo(resolvedLength("--vpg-space-2"), 1);
    });

    it("separates columns by columnGap and rows by gap", () => {
      renderThemed(
        <Grid columns={2} gap="space-2" columnGap="space-8" style={{ inlineSize: "400px" }}>
          {cells(4)}
        </Grid>,
      );

      expect(rect("cell-1").left - rect("cell-0").right).toBeCloseTo(resolvedLength("--vpg-space-8"), 1);
      expect(rect("cell-2").top - rect("cell-0").bottom).toBeCloseTo(resolvedLength("--vpg-space-2"), 1);
    });
  });
});

describe("GridItem under a real ThemeProvider", () => {
  it("spans colSpan columns, gaps included", () => {
    renderThemed(
      <Grid columns={4} gap="space-4" style={{ inlineSize: "800px" }}>
        <GridItem data-testid="wide" colSpan={3} />
        <GridItem data-testid="narrow" />
      </Grid>,
    );

    const gap = resolvedLength("--vpg-space-4");
    const column = (800 - 3 * gap) / 4;
    expect(rect("wide").width).toBeCloseTo(3 * column + 2 * gap, 1);
    expect(rect("narrow").width).toBeCloseTo(column, 1);
    expect(rect("narrow").top).toBeCloseTo(rect("wide").top, 1);
  });

  it("spans rowSpan rows, gaps included", () => {
    renderThemed(
      <Grid columns={2} gap="space-3" style={{ inlineSize: "400px" }}>
        <GridItem data-testid="tall" rowSpan={2} />
        <GridItem data-testid="first" style={{ blockSize: "40px" }} />
        <GridItem data-testid="second" style={{ blockSize: "40px" }} />
      </Grid>,
    );

    const gap = resolvedLength("--vpg-space-3");
    expect(rect("tall").height).toBeCloseTo(80 + gap, 1);
    expect(rect("second").left).toBeCloseTo(rect("first").left, 1);
    expect(rect("second").top - rect("first").bottom).toBeCloseTo(gap, 1);
  });
});
