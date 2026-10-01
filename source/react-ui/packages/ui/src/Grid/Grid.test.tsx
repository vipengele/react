import { render, screen } from "@testing-library/react";
import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import type { SpaceToken } from "../internal/space.js";
import type { GridColumnWidth } from "./Grid.js";
import { Grid } from "./Grid.js";
import { GridItem } from "./GridItem.js";

const SPACE_VALUE: Record<SpaceToken, string> = {
  none: "0",
  "space-1": "var(--vpg-space-1)",
  "space-2": "var(--vpg-space-2)",
  "space-3": "var(--vpg-space-3)",
  "space-4": "var(--vpg-space-4)",
  "space-5": "var(--vpg-space-5)",
  "space-6": "var(--vpg-space-6)",
  "space-7": "var(--vpg-space-7)",
  "space-8": "var(--vpg-space-8)",
};

const COLUMN_WIDTHS: GridColumnWidth[] = ["sm", "md", "lg", "xl"];

/** The inline value of a component-scoped property, as authored on the element. */
function inline(element: HTMLElement, property: string): string {
  return element.style.getPropertyValue(property);
}

/** Every component-scoped property the element writes inline, and its value. */
function scopedProperties(element: HTMLElement): Record<string, string> {
  const found: Record<string, string> = {};
  for (let index = 0; index < element.style.length; index += 1) {
    const name = element.style.item(index);
    if (name.startsWith("--vpg-")) found[name] = element.style.getPropertyValue(name);
  }
  return found;
}

/** An inline value a layout primitive may write: a bare token read, `0`, or a count. */
const ALLOWED_VALUE = /^(var\(--vpg-[a-z0-9-]+\)|0|[1-9][0-9]*)$/;

function grid(): HTMLElement {
  return screen.getByTestId("grid");
}

describe("Grid", () => {
  it("renders its children inside a div", () => {
    render(
      <Grid data-testid="grid">
        <span>One</span>
      </Grid>,
    );
    expect(grid().tagName).toBe("DIV");
    expect(grid()).toHaveClass("vpg-grid");
    expect(screen.getByText("One").parentElement).toBe(grid());
  });

  describe("auto-fit mode", () => {
    it("is the mode a grid given no columns takes, at the md column width", () => {
      render(<Grid data-testid="grid" />);
      expect(grid()).toHaveClass("vpg-grid-fit");
      expect(grid()).not.toHaveClass("vpg-grid-columns");
      expect(inline(grid(), "--vpg-grid-min-column")).toBe("var(--vpg-column-md)");
    });

    it.each(COLUMN_WIDTHS)("writes the %s step as a read of its column-width token", (step) => {
      render(<Grid data-testid="grid" minColumnWidth={step} />);
      expect(inline(grid(), "--vpg-grid-min-column")).toBe(`var(--vpg-column-${step})`);
    });

    it("writes the md read for a step outside the scale", () => {
      render(<Grid data-testid="grid" minColumnWidth={"2xl" as unknown as GridColumnWidth} />);
      expect(inline(grid(), "--vpg-grid-min-column")).toBe("var(--vpg-column-md)");
    });

    it("leaves the column count unwritten", () => {
      render(<Grid data-testid="grid" minColumnWidth="lg" />);
      expect(inline(grid(), "--vpg-grid-columns")).toBe("");
    });
  });

  describe("fixed mode", () => {
    it("writes the column count and leaves the minimum width unwritten", () => {
      render(<Grid data-testid="grid" columns={3} />);
      expect(grid()).toHaveClass("vpg-grid-columns");
      expect(grid()).not.toHaveClass("vpg-grid-fit");
      expect(inline(grid(), "--vpg-grid-columns")).toBe("3");
      expect(inline(grid(), "--vpg-grid-min-column")).toBe("");
    });

    it("rejects columns and minColumnWidth together at the type level", () => {
      // @ts-expect-error a grid has a fixed column count or an auto-fit width, never both
      render(<Grid data-testid="grid" columns={2} minColumnWidth="sm" />);
      expect(grid()).toHaveClass("vpg-grid-columns");
    });
  });

  describe("gaps", () => {
    it("writes the space-4 step on both axes by default", () => {
      render(<Grid data-testid="grid" />);
      expect(inline(grid(), "--vpg-grid-row-gap")).toBe("var(--vpg-space-4)");
      expect(inline(grid(), "--vpg-grid-column-gap")).toBe("var(--vpg-space-4)");
    });

    it.each(Object.entries(SPACE_VALUE) as [SpaceToken, string][])("writes gap %s as %s on both axes", (gap, value) => {
      render(<Grid data-testid="grid" gap={gap} />);
      expect(inline(grid(), "--vpg-grid-row-gap")).toBe(value);
      expect(inline(grid(), "--vpg-grid-column-gap")).toBe(value);
    });

    it("lets rowGap override gap on the row axis only", () => {
      render(<Grid data-testid="grid" gap="space-2" rowGap="space-6" />);
      expect(inline(grid(), "--vpg-grid-row-gap")).toBe("var(--vpg-space-6)");
      expect(inline(grid(), "--vpg-grid-column-gap")).toBe("var(--vpg-space-2)");
    });

    it("lets columnGap override gap on the column axis only", () => {
      render(<Grid data-testid="grid" gap="space-2" columnGap="none" />);
      expect(inline(grid(), "--vpg-grid-row-gap")).toBe("var(--vpg-space-2)");
      expect(inline(grid(), "--vpg-grid-column-gap")).toBe("0");
    });
  });

  it.each([
    ["auto-fit", {}],
    ["fixed", { columns: 4 }],
  ] as const)("writes only token reads, 0 or counts inline in %s mode", (_mode, props) => {
    render(<Grid data-testid="grid" gap="none" columnGap="space-3" {...props} />);
    const written = scopedProperties(grid());
    expect(Object.keys(written).length).toBeGreaterThan(0);
    for (const value of Object.values(written)) {
      expect(value).toMatch(ALLOWED_VALUE);
    }
  });

  describe("as", () => {
    it("renders the overriding element and forwards its own attributes", () => {
      render(
        <Grid data-testid="grid" as="ol" reversed>
          <li>One</li>
        </Grid>,
      );
      expect(grid().tagName).toBe("OL");
      expect(grid()).toHaveAttribute("reversed");
      expect(grid()).toHaveClass("vpg-grid");
    });
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Grid data-testid="grid" className="custom" />);
    expect(grid()).toHaveClass("custom");
    expect(grid()).toHaveClass("vpg-grid");
  });

  it("spreads a caller's style last, over its own properties", () => {
    const style = { "--vpg-grid-row-gap": "13px", marginTop: "4px" } as CSSProperties;
    render(<Grid data-testid="grid" style={style} />);
    expect(inline(grid(), "--vpg-grid-row-gap")).toBe("13px");
    expect(inline(grid(), "--vpg-grid-column-gap")).toBe("var(--vpg-space-4)");
    expect(grid().style.marginTop).toBe("4px");
  });
});

describe("GridItem", () => {
  function item(): HTMLElement {
    return screen.getByTestId("item");
  }

  it("renders its children inside a div with no span by default", () => {
    render(
      <GridItem data-testid="item">
        <span>Cell</span>
      </GridItem>,
    );
    expect(item().tagName).toBe("DIV");
    expect(item()).toHaveClass("vpg-grid-item");
    expect(item()).not.toHaveClass("vpg-grid-item-col-span");
    expect(item()).not.toHaveClass("vpg-grid-item-row-span");
    expect(scopedProperties(item())).toEqual({});
    expect(screen.getByText("Cell").parentElement).toBe(item());
  });

  it("writes colSpan as a count alongside the class that reads it", () => {
    render(<GridItem data-testid="item" colSpan={2} />);
    expect(item()).toHaveClass("vpg-grid-item-col-span");
    expect(item()).not.toHaveClass("vpg-grid-item-row-span");
    expect(scopedProperties(item())).toEqual({ "--vpg-grid-item-col-span": "2" });
  });

  it("writes rowSpan as a count alongside the class that reads it", () => {
    render(<GridItem data-testid="item" rowSpan={3} />);
    expect(item()).toHaveClass("vpg-grid-item-row-span");
    expect(item()).not.toHaveClass("vpg-grid-item-col-span");
    expect(scopedProperties(item())).toEqual({ "--vpg-grid-item-row-span": "3" });
  });

  it("writes both spans together", () => {
    render(<GridItem data-testid="item" colSpan={2} rowSpan={2} />);
    const written = scopedProperties(item());
    expect(written).toEqual({ "--vpg-grid-item-col-span": "2", "--vpg-grid-item-row-span": "2" });
    for (const value of Object.values(written)) {
      expect(value).toMatch(ALLOWED_VALUE);
    }
  });

  it("renders the overriding element and forwards its own attributes", () => {
    render(<GridItem data-testid="item" as="a" href="#cell" />);
    expect(item().tagName).toBe("A");
    expect(item()).toHaveAttribute("href", "#cell");
  });

  it("composes a caller-supplied className and spreads a caller's style last", () => {
    const style = { "--vpg-grid-item-col-span": "5" } as CSSProperties;
    render(<GridItem data-testid="item" colSpan={2} className="custom" style={style} />);
    expect(item()).toHaveClass("custom");
    expect(item()).toHaveClass("vpg-grid-item");
    expect(inline(item(), "--vpg-grid-item-col-span")).toBe("5");
  });
});
