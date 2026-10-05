import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Pagination, type PaginationProps } from "./Pagination.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one bar.
afterEach(cleanup);

/** Renders a bar into a block container of a fixed width, under a real `ThemeProvider`. */
function renderInto(width: number, props: Partial<PaginationProps> = {}) {
  render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        <Pagination totalItems={1000} {...props} />
      </div>
    </ThemeProvider>,
  );
  const nav = screen.getByRole("navigation");
  return {
    box: screen.getByTestId("container"),
    nav,
    list: nav.querySelector(".vpg-pagination-list") as HTMLElement,
    sizeControl: nav.querySelector(".vpg-pagination-size-control") as HTMLElement,
  };
}

/** What `value` resolves to for `property` on a probe inside the themed root. A custom property
 * read back off `getPropertyValue` is its authored text, not a computed value; a real property
 * consuming it through `var()` is what resolves it. */
function resolved(property: "minHeight" | "width" | "color" | "backgroundColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

describe("Pagination's layout", () => {
  it("lays the status, the page-size field and the page list out in one row in a wide container", () => {
    const { nav, list } = renderInto(900);
    const status = screen.getByRole("status");
    const size = nav.querySelector(".vpg-pagination-size") as HTMLElement;

    expect(getComputedStyle(nav).display).toBe("flex");
    expect(getComputedStyle(nav).flexDirection).toBe("row");

    const middle = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    expect(middle(size)).toBeCloseTo(middle(status), 0);
    expect(middle(list)).toBeCloseTo(middle(status), 0);
    expect(status.getBoundingClientRect().right).toBeLessThanOrEqual(size.getBoundingClientRect().left);
    expect(size.getBoundingClientRect().right).toBeLessThanOrEqual(list.getBoundingClientRect().left);
  });

  it("keeps the page list at the inline end of the bar", () => {
    const { nav, list } = renderInto(900);
    expect(list.getBoundingClientRect().right).toBeCloseTo(nav.getBoundingClientRect().right, 0);
  });

  it("keeps the page list at the inline end when the page-size field is not rendered", () => {
    const { nav, list } = renderInto(900, { pageSizeOptions: [10] });
    expect(list.getBoundingClientRect().right).toBeCloseTo(nav.getBoundingClientRect().right, 0);
  });

  it("starts the page list at the inline start when it wraps onto a row of its own", () => {
    const { nav, list } = renderInto(520);
    const size = nav.querySelector(".vpg-pagination-size") as HTMLElement;

    // The list is on a row below the status and the page-size field, and still fits on it.
    expect(list.getBoundingClientRect().top).toBeGreaterThanOrEqual(size.getBoundingClientRect().bottom);
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    expect(list.getBoundingClientRect().left).toBeCloseTo(nav.getBoundingClientRect().left, 0);
  });

  it("wraps the page list onto more rows in a narrow container rather than overflowing it", () => {
    // Wide enough for the page-size field's label and fixed-width control, which do not wrap,
    // and far short of the page list's eleven buttons.
    const { box, nav, list } = renderInto(240);
    const buttons = Array.from(list.querySelectorAll("button"));
    const rows = new Set(buttons.map((node) => Math.round(node.getBoundingClientRect().top)));

    expect(getComputedStyle(list).flexWrap).toBe("wrap");
    expect(rows.size).toBeGreaterThan(1);
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth);
    for (const node of buttons) {
      expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right + 0.5);
    }
  });
});

describe("Pagination's page-size field", () => {
  it("holds the dropdown to its own fixed width instead of stretching it across the bar", () => {
    const { nav, sizeControl } = renderInto(900);
    const expected = Number.parseFloat(resolved("width", "calc(var(--vpg-size-2xl) * 2)"));
    const width = sizeControl.getBoundingClientRect().width;

    expect(expected).toBeGreaterThan(0);
    expect(width).toBeCloseTo(expected, 0);
    expect(width).toBeLessThan(nav.getBoundingClientRect().width / 4);
  });

  it("keeps that width in a container too narrow for the bar's row", () => {
    const { sizeControl } = renderInto(260);
    const expected = Number.parseFloat(resolved("width", "calc(var(--vpg-size-2xl) * 2)"));
    expect(sizeControl.getBoundingClientRect().width).toBeCloseTo(expected, 0);
  });
});

describe("Pagination's buttons", () => {
  it("are at least the size scale's default control step in both dimensions", () => {
    const { list } = renderInto(900);
    const step = Number.parseFloat(resolved("minHeight", "var(--vpg-size-md)"));

    expect(step).toBeGreaterThan(0);
    for (const node of list.querySelectorAll("button")) {
      const rect = node.getBoundingClientRect();
      expect(rect.height).toBeCloseTo(step, 0);
      expect(rect.width).toBeGreaterThanOrEqual(step - 0.5);
    }
  });

  it("widen past the control step for a page number too long to fit it", () => {
    const { list } = renderInto(900, { totalItems: 10_000_000 });
    const step = Number.parseFloat(resolved("minHeight", "var(--vpg-size-md)"));
    const last = list.querySelector("[aria-label='Page 1000000']") as HTMLElement;
    expect(last.getBoundingClientRect().width).toBeGreaterThan(step);
  });

  it("stand as tall as the page-size field beside them", () => {
    const { list, sizeControl } = renderInto(900);
    const field = sizeControl.querySelector(".vpg-dropdown-control") as HTMLElement;
    const page = list.querySelector("[aria-label='Page 2']") as HTMLElement;
    expect(page.getBoundingClientRect().height).toBeCloseTo(field.getBoundingClientRect().height, 0);
  });

  it("fill the current page with the theme's accent", () => {
    const { list } = renderInto(900, { defaultPage: 3 });
    const current = list.querySelector("[aria-current='page']") as HTMLElement;
    const other = list.querySelector("[aria-label='Page 2']") as HTMLElement;
    const accent = resolved("backgroundColor", "var(--vpg-accent)");
    const contrast = resolved("color", "var(--vpg-accent-contrast)");

    expect(accent).not.toBe(TRANSPARENT);
    expect(getComputedStyle(current).backgroundColor).toBe(accent);
    expect(getComputedStyle(current).color).toBe(contrast);
    expect(getComputedStyle(other).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(other).color).toBe(resolved("color", "var(--vpg-ink)"));
    expect(Number(getComputedStyle(current).fontWeight)).toBeGreaterThan(Number(getComputedStyle(other).fontWeight));
  });

  it("resolve a disabled step button to the subtle ink and a not-allowed cursor", () => {
    renderInto(900);
    const disabled = screen.getByRole("button", { name: "Previous page" });
    const enabled = screen.getByRole("button", { name: "Next page" });
    const subtle = resolved("color", "var(--vpg-ink-subtle)");

    expect(disabled).toBeDisabled();
    expect(getComputedStyle(disabled).color).toBe(subtle);
    expect(getComputedStyle(disabled).cursor).toBe("not-allowed");
    expect(getComputedStyle(enabled).color).toBe(resolved("color", "var(--vpg-ink)"));
    expect(getComputedStyle(enabled).color).not.toBe(subtle);
    expect(getComputedStyle(enabled).cursor).toBe("pointer");
  });
});
