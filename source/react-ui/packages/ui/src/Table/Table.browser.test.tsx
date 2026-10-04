import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { TableCellAlign, TableDensity } from "./Table.js";
import { Table } from "./Table.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one table.
afterEach(cleanup);

/** A block size far short of the rows below, so the container has to scroll. */
const CONTAINER_HEIGHT = 120;

const ROWS = Array.from({ length: 30 }, (_, index) => `Order ${index + 1}`);

function renderScrollingTable(stickyHeader: boolean) {
  const { container } = render(
    <ThemeProvider>
      <Table stickyHeader={stickyHeader} style={{ blockSize: `${CONTAINER_HEIGHT}px` }}>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {ROWS.map((row) => (
            <Table.Row key={row}>
              <Table.Cell>{row}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </ThemeProvider>,
  );
  const scroller = container.querySelector(".vpg-table-container") as HTMLElement;
  const head = container.querySelector("thead") as HTMLElement;
  return { scroller, head, firstRow: screen.getByText("Order 1").closest("tr") as HTMLElement };
}

/** The length a `--vpg-space-*` token resolves to, read off a probe inside the themed root. A
 * custom property read back off `getPropertyValue` is its authored `calc()` text, not pixels; a
 * real property consuming it through `var()` is what resolves it. */
function resolvedSpace(token: string) {
  const probe = document.createElement("div");
  probe.style.paddingTop = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const length = getComputedStyle(probe).paddingTop;
  probe.remove();
  return length;
}

/** Each density's block and inline padding, as the space-scale steps the design specifies. */
const DENSITY_STEPS: { density: TableDensity; block: string; inline: string }[] = [
  { density: "compact", block: "--vpg-space-1", inline: "--vpg-space-2" },
  { density: "regular", block: "--vpg-space-2", inline: "--vpg-space-3" },
  { density: "relaxed", block: "--vpg-space-3", inline: "--vpg-space-4" },
];

function renderDensity(density: TableDensity) {
  render(
    <ThemeProvider>
      <Table density={density}>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Order 1</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </ThemeProvider>,
  );
  return {
    headerCell: screen.getByRole("columnheader", { name: "Order" }),
    cell: screen.getByRole("cell", { name: "Order 1" }),
  };
}

/** Wide enough for a short line to sit at visibly different places under each alignment, narrow
 * enough that the copy below wraps onto several lines. */
const TABLE_WIDTH = 320;

const WRAPPING_COPY = "Shipped from the north warehouse with tracked courier delivery and a signature on arrival at the door";

/** Every line the element's text renders on, measured with a `Range` over its contents: padding
 * and alignment live inside the cell's border box, so the cell's own edges never move with them.
 * A text that fills its line sits at the same place under any alignment, so only a wrapped
 * paragraph's short last line tells the alignments apart. */
function lineRects(node: Element) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects());
}

/** The cell's content box — its border box inset by the resolved padding. */
function contentBox(cell: HTMLElement) {
  const box = cell.getBoundingClientRect();
  const style = getComputedStyle(cell);
  const left = box.left + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.borderLeftWidth);
  const right = box.right - Number.parseFloat(style.paddingRight) - Number.parseFloat(style.borderRightWidth);
  return { left, right, middle: (left + right) / 2, width: right - left };
}

function renderAligned(align: TableCellAlign) {
  render(
    <ThemeProvider>
      <div style={{ width: `${TABLE_WIDTH}px` }}>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell align={align}>{WRAPPING_COPY}</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell align={align}>{WRAPPING_COPY}</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </div>
    </ThemeProvider>,
  );
  return [screen.getByRole("columnheader"), screen.getByRole("cell")];
}

describe("Table's scroll container", () => {
  it("overflows its bounded block size and scrolls", () => {
    const { scroller } = renderScrollingTable(false);

    expect(getComputedStyle(scroller).overflow).toBe("auto");
    expect(scroller.clientHeight).toBe(CONTAINER_HEIGHT);
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  });

  it("pins a sticky header to the container's top edge while the body scrolls out under it", () => {
    const { scroller, head, firstRow } = renderScrollingTable(true);

    scroller.scrollTop = 200;
    expect(scroller.scrollTop).toBe(200);

    const scrollerTop = scroller.getBoundingClientRect().top;
    expect(head.getBoundingClientRect().top).toBeCloseTo(scrollerTop, 0);
    expect(firstRow.getBoundingClientRect().bottom).toBeLessThan(scrollerTop);
  });

  it("scrolls a header without stickyHeader away with the body", () => {
    const { scroller, head, firstRow } = renderScrollingTable(false);

    scroller.scrollTop = 200;
    expect(scroller.scrollTop).toBe(200);

    const scrollerTop = scroller.getBoundingClientRect().top;
    expect(head.getBoundingClientRect().bottom).toBeLessThan(scrollerTop);
    expect(firstRow.getBoundingClientRect().bottom).toBeLessThan(scrollerTop);
  });
});

describe("Table's density", () => {
  it.each(DENSITY_STEPS)("pads $density cells by its own steps of the space scale", ({ density, block, inline }) => {
    const { headerCell, cell } = renderDensity(density);
    const blockLength = resolvedSpace(block);
    const inlineLength = resolvedSpace(inline);

    // An unresolved read would serialise as `0px` on both sides and match trivially.
    expect(Number.parseFloat(blockLength)).toBeGreaterThan(0);
    for (const node of [headerCell, cell]) {
      const style = getComputedStyle(node);
      expect(style.paddingTop).toBe(blockLength);
      expect(style.paddingBottom).toBe(blockLength);
      expect(style.paddingLeft).toBe(inlineLength);
      expect(style.paddingRight).toBe(inlineLength);
    }
  });

  it("orders the densities' padding compact < regular < relaxed", () => {
    const paddings = DENSITY_STEPS.map(({ density }) => {
      const { cell } = renderDensity(density);
      const style = getComputedStyle(cell);
      const padding = { block: Number.parseFloat(style.paddingTop), inline: Number.parseFloat(style.paddingLeft) };
      cleanup();
      return padding;
    });

    paddings.reduce((previous, padding) => {
      expect(padding.block).toBeGreaterThan(previous.block);
      expect(padding.inline).toBeGreaterThan(previous.inline);
      return padding;
    });
  });
});

describe("Table's cell alignment", () => {
  /** Where a line sits within the content box, per alignment. Sub-pixel: a line of an odd width
   * lands half a pixel to either side of the midpoint. */
  const LINE_POSITION: Record<TableCellAlign, (line: DOMRect, box: ReturnType<typeof contentBox>) => [number, number]> = {
    start: (line, box) => [line.left, box.left],
    center: (line, box) => [line.left + line.width / 2, box.middle],
    end: (line, box) => [line.right, box.right],
  };

  it.each(["start", "center", "end"] as const)("aligns the short last line of wrapped copy to the %s", (align) => {
    for (const node of renderAligned(align)) {
      const box = contentBox(node);
      const lines = lineRects(node);
      expect(lines.length).toBeGreaterThan(1);

      // A last line that filled the box would sit at the same place under every alignment.
      const lastLine = lines.at(-1) as DOMRect;
      expect(lastLine.width).toBeLessThan(box.width - 40);

      const [actual, expected] = LINE_POSITION[align](lastLine, box);
      expect(actual).toBeCloseTo(expected, 0);
    }
  });
});

describe("Table's focusable region", () => {
  it("makes a captioned container a region named by its caption that Tab reaches", async () => {
    render(
      <ThemeProvider>
        <Table caption="Recent orders">
          <Table.Body>
            <Table.Row>
              <Table.Cell>Order 1</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </ThemeProvider>,
    );

    const region = screen.getByRole("region", { name: "Recent orders" });
    expect(region.classList.contains("vpg-table-container")).toBe(true);

    await userEvent.tab();
    expect(document.activeElement).toBe(region);
  });

  it("leaves a container without a caption an unfocusable, unnamed element", async () => {
    const { container } = render(
      <ThemeProvider>
        <button type="button">Before</button>
        <Table>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Order 1</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </ThemeProvider>,
    );

    expect(screen.queryByRole("region")).toBeNull();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
    await userEvent.tab();
    expect(container.querySelector(".vpg-table-container")?.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).not.toBe(container.querySelector(".vpg-table-container"));
  });
});
