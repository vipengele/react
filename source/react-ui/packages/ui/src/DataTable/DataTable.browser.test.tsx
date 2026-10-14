import { Scope, ScopeProvider } from "@vipengele/react-telemetry";
import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { DataTable, type DataTableColumn, type DataTableProps, type DataTablePropsOmit } from "./DataTable.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one table.
afterEach(cleanup);

/**
 * Any props but `Omitted`, with `columns` and `rows` optional, since every render helper passes its
 * own. Every other prop keeps its arm's requirements, so infinite-scroll props come as a whole.
 */
type HelperProps<Row, Omitted extends PropertyKey> = DataTablePropsOmit<Row, "columns" | "rows" | Omitted> &
  Partial<Pick<DataTableProps<Row>, "columns" | "rows">>;

/**
 * Any props but the windowing ones, which a virtualized table pairs with a required name, and the
 * infinite-scroll ones, which only a virtualized table takes.
 */
type StaticProps<Row> = HelperProps<Row, "virtualized" | "rowHeight" | "onLoadMore" | "hasMore" | "loadingMore" | "loadMoreThreshold">;

interface Member {
  id: string;
  name: string;
  age: number;
}

const members: Member[] = [
  { id: "m-grace", name: "Grace", age: 85 },
  { id: "m-ada", name: "Ada", age: 36 },
  { id: "m-alan", name: "Alan", age: 41 },
  { id: "m-edsger", name: "Edsger", age: 72 },
];

const columns: DataTableColumn<Member>[] = [
  { accessor: "name", header: "Name" },
  { accessor: "age", header: "Age", align: "end" },
];

function renderMembers(props: StaticProps<Member> = {}) {
  return render(
    <ThemeProvider>
      <DataTable
        columns={columns}
        rows={members}
        getRowId={(member) => member.id}
        selectionMode="multiple"
        selectRowLabel={(member) => `Select ${member.name}`}
        {...props}
      />
    </ThemeProvider>,
  );
}

function control(name: string): HTMLInputElement {
  return screen.getByRole("checkbox", { name: `Select ${name}` }) as HTMLInputElement;
}

function selectAll(): HTMLInputElement {
  return screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
}

function bodyRows(): HTMLElement[] {
  return within(screen.getByRole("table").querySelector("tbody") as HTMLElement).getAllByRole("row");
}

function selectedNames(): string[] {
  return bodyRows()
    .filter((row) => (row.querySelector("td.vpg-data-table-select input") as HTMLInputElement).checked)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");
}

/** What `value` resolves to for `property` on a probe inside the themed root. */
function resolved(property: "width" | "backgroundColor" | "paddingInlineStart" | "outlineColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

describe("DataTable selection from the keyboard", () => {
  it("toggles a focused row's checkbox with Space", async () => {
    const onSelectionChange = vi.fn();
    renderMembers({ onSelectionChange });
    control("Ada").focus();

    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["m-ada"]);
    expect(control("Ada").checked).toBe(true);
    expect(document.activeElement).toBe(control("Ada"));

    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(control("Ada").checked).toBe(false);
  });

  it("reaches the controls with Tab and selects every row with Space on the select-all checkbox", async () => {
    const onSelectionChange = vi.fn();
    renderMembers({ onSelectionChange });
    selectAll().focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Name" }));

    selectAll().focus();
    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["m-grace", "m-ada", "m-alan", "m-edsger"]);
    expect(selectAll().checked).toBe(true);

    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(selectAll().checked).toBe(false);
  });

  it("draws the select-all checkbox indeterminate while some rows are selected", async () => {
    renderMembers();
    control("Alan").focus();
    await userEvent.keyboard(" ");
    expect(selectAll().indeterminate).toBe(true);
    expect(selectAll().matches(":indeterminate")).toBe(true);
  });

  it("selects a range with Shift+Space from the last toggled row", async () => {
    const onSelectionChange = vi.fn();
    renderMembers({ onSelectionChange });
    control("Grace").focus();
    await userEvent.keyboard(" ");
    control("Alan").focus();
    await userEvent.keyboard("{Shift>} {/Shift}");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["m-grace", "m-ada", "m-alan"]);
    expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
  });

  it("toggles only the focused row with Space after Shift is released", async () => {
    renderMembers();
    control("Grace").focus();
    await userEvent.keyboard(" ");
    control("Alan").focus();
    await userEvent.keyboard("{Shift>}{/Shift} ");
    expect(selectedNames()).toEqual(["Grace", "Alan"]);
  });
});

describe("DataTable range selection with the pointer", () => {
  it("selects the rows between the last toggled row and a Shift-clicked one", async () => {
    const onSelectionChange = vi.fn();
    renderMembers({ onSelectionChange });
    await userEvent.click(control("Ada"));
    await userEvent.click(control("Edsger"), { modifiers: ["Shift"] });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["m-ada", "m-alan", "m-edsger"]);
    expect(selectedNames()).toEqual(["Ada", "Alan", "Edsger"]);
  });

  it("ranges over the rows in their sorted order", async () => {
    renderMembers();
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(bodyRows().map((row) => within(row).getAllByRole("cell")[1]?.textContent)).toEqual(["Ada", "Alan", "Edsger", "Grace"]);
    await userEvent.click(control("Ada"));
    await userEvent.click(control("Edsger"), { modifiers: ["Shift"] });
    expect(selectedNames()).toEqual(["Ada", "Alan", "Edsger"]);
  });

  it("deselects a range when the last toggle deselected", async () => {
    renderMembers({ defaultSelectedRowIds: members.map((member) => member.id) });
    await userEvent.click(control("Edsger"));
    await userEvent.click(control("Ada"), { modifiers: ["Shift"] });
    expect(selectedNames()).toEqual(["Grace"]);
  });

  it("selects nothing on a click on a row outside its control", async () => {
    const onSelectionChange = vi.fn();
    renderMembers({ onSelectionChange });
    await userEvent.click(screen.getByText("Ada"));
    await userEvent.click(control("Ada").closest("td") as HTMLElement, { position: { x: 1, y: 1 } });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe("DataTable selection across pages", () => {
  /** Twelve items numbered 1 to 12, three pages at a page size of 5. */
  const items = Array.from({ length: 12 }, (_, index) => ({ id: `item-${index + 1}`, n: index + 1 }));
  const itemColumns: DataTableColumn<(typeof items)[number]>[] = [{ accessor: "n", header: "Number" }];

  function renderPaged(props: StaticProps<(typeof items)[number]> = {}) {
    return render(
      <ThemeProvider>
        <DataTable
          columns={itemColumns}
          rows={items}
          getRowId={(item) => item.id}
          selectRowLabel={(item) => `Select item ${item.n}`}
          selectionMode="multiple"
          paginated
          pageSizeOptions={[5, 10]}
          {...props}
        />
      </ThemeProvider>,
    );
  }

  function item(n: number): HTMLInputElement {
    return screen.getByRole("checkbox", { name: `Select item ${n}` }) as HTMLInputElement;
  }

  function drawnNumbers(): number[] {
    return bodyRows().map((row) => Number(within(row).getAllByRole("cell")[1]?.textContent));
  }

  function checkedNumbers(): number[] {
    return bodyRows()
      .filter((row) => (row.querySelector("td.vpg-data-table-select input") as HTMLInputElement).checked)
      .map((row) => Number(within(row).getAllByRole("cell")[1]?.textContent));
  }

  it("keeps earlier selections on the next page, where select-all selects only that page's rows", async () => {
    const onSelectionChange = vi.fn();
    renderPaged({ onSelectionChange });
    await userEvent.click(item(2));
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(drawnNumbers()).toEqual([6, 7, 8, 9, 10]);
    expect(selectAll().checked).toBe(false);
    expect(selectAll().indeterminate).toBe(false);

    await userEvent.click(selectAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith(["item-2", "item-6", "item-7", "item-8", "item-9", "item-10"]);
    expect(selectAll().checked).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(checkedNumbers()).toEqual([2]);
    expect(selectAll().indeterminate).toBe(true);
  });

  it("follows the bar's page-size rule, keeping the first visible row in view and the selection", async () => {
    renderPaged({ defaultPage: 2, defaultPageSize: 5, defaultSelectedRowIds: ["item-3", "item-7"] });
    expect(drawnNumbers()).toEqual([6, 7, 8, 9, 10]);

    await userEvent.click(screen.getByRole("combobox", { name: "Items per page" }));
    await userEvent.click(screen.getByRole("option", { name: "10" }));
    expect(drawnNumbers()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(within(screen.getByRole("navigation")).getByRole("button", { current: "page" }).textContent).toBe("1");
    expect(checkedNumbers()).toEqual([3, 7]);
  });

  it("selects the page with Space on the select-all checkbox reached by Tab", async () => {
    const onSelectionChange = vi.fn();
    renderPaged({ onSelectionChange });
    await userEvent.tab();
    expect(document.activeElement).toBe(selectAll());

    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["item-1", "item-2", "item-3", "item-4", "item-5"]);
    expect(checkedNumbers()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("DataTable selection styles under a real ThemeProvider", () => {
  it("draws a selected row's cells on the accent wash and leaves the others unfilled", () => {
    renderMembers({ defaultSelectedRowIds: ["m-ada"] });
    const wash = resolved("backgroundColor", "var(--vpg-accent-wash)");
    const selectedRow = control("Ada").closest("tr") as HTMLElement;
    const otherRow = control("Grace").closest("tr") as HTMLElement;

    for (const cell of within(selectedRow).getAllByRole("cell")) expect(getComputedStyle(cell).backgroundColor).toBe(wash);
    for (const cell of within(otherRow).getAllByRole("cell")) expect(getComputedStyle(cell).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("sizes the selection column to its control and the density padding, however wide the table is", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "900px" }}>
          <DataTable columns={columns} rows={members} getRowId={(member) => member.id} selectionMode="multiple" />
        </div>
      </ThemeProvider>,
    );
    const header = container.querySelector("th.vpg-data-table-select") as HTMLElement;
    const controlWidth = resolved("width", "var(--vpg-icon-md)");
    const padding = resolved("paddingInlineStart", "var(--vpg-space-3)");
    const expected = Number.parseFloat(controlWidth) + 2 * Number.parseFloat(padding);

    expect(header.getBoundingClientRect().width).toBeCloseTo(expected, 0);
    for (const row of bodyRows()) {
      expect((row.querySelector("td.vpg-data-table-select") as HTMLElement).getBoundingClientRect().width).toBeCloseTo(expected, 0);
    }
    const box = selectAll().getBoundingClientRect();
    const cell = header.getBoundingClientRect();
    expect(box.left - cell.left).toBeCloseTo(cell.right - box.right, 0);
  });

  it("gives the single-mode column the same width, its header name hidden", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "900px" }}>
          <DataTable columns={columns} rows={members} selectionMode="single" />
        </div>
      </ThemeProvider>,
    );
    const header = container.querySelector("th.vpg-data-table-select") as HTMLElement;
    const expected =
      Number.parseFloat(resolved("width", "var(--vpg-icon-md)")) +
      2 * Number.parseFloat(resolved("paddingInlineStart", "var(--vpg-space-3)"));
    expect(header.getBoundingClientRect().width).toBeCloseTo(expected, 0);
    expect((within(header).getByText("Selection") as HTMLElement).getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });
});

describe("DataTable column resizing in a real layout", () => {
  const resizeColumns: DataTableColumn<Member>[] = [
    { accessor: "name", header: "Name", size: 200 },
    { accessor: "age", header: "Age", align: "end", size: 100, minSize: 60, maxSize: 160 },
    { accessor: "id", header: "Id", size: 150 },
  ];

  /** Many rows, so a bounded container scrolls its body under a sticky header. */
  const crowd: Member[] = Array.from({ length: 40 }, (_, index) => ({ id: `m-${index}`, name: `Member ${index}`, age: 20 + index }));

  function renderResizable({ width, dir, ...props }: StaticProps<Member> & { width: number; dir?: "rtl" }) {
    return render(
      <div dir={dir} style={{ width: `${width}px` }}>
        <ThemeProvider>
          <DataTable columns={resizeColumns} rows={members} getRowId={(member) => member.id} resizableColumns {...props} />
        </ThemeProvider>
      </div>,
    );
  }

  function headers(): HTMLElement[] {
    return screen.getAllByRole("columnheader");
  }

  function header(index: number): HTMLElement {
    return headers()[index] as HTMLElement;
  }

  function handle(name: string): HTMLElement {
    return screen.getByRole("separator", { name: `Resize ${name}` });
  }

  function widthOf(element: Element): number {
    return element.getBoundingClientRect().width;
  }

  function edges(element: Element): { left: number; right: number } {
    const { left, right } = element.getBoundingClientRect();
    return { left, right };
  }

  /** The test page's offset inside the top-level page, where CDP input coordinates are measured
   * from. */
  function frameOffset(): { left: number; top: number } {
    const frame = window.frameElement?.getBoundingClientRect();
    return { left: frame?.left ?? 0, top: frame?.top ?? 0 };
  }

  /** A real mouse event at the viewport point `(x, y)` through Chromium's input pipeline, which
   * raises the pointer events, pointer capture and click a real drag does. */
  async function mouse(type: "mousePressed" | "mouseMoved" | "mouseReleased", x: number, y: number) {
    const { left, top } = frameOffset();
    await cdp().send("Input.dispatchMouseEvent", {
      type,
      x: left + x,
      y: top + y,
      button: "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: type === "mouseMoved" ? 0 : 1,
    });
  }

  /** Presses the middle of `element`, then moves the pointer through each `[dx, dy]` offset from
   * there, and returns the point it was pressed at. */
  async function pressAndMove(element: HTMLElement, ...moves: [number, number][]) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await mouse("mousePressed", x, y);
    for (const [dx, dy] of moves) await mouse("mouseMoved", x + dx, y + dy);
    return { x, y };
  }

  /** Drags `element` by `dx` along a path that leaves it, ends the drag `dy` below it, and
   * releases there. */
  async function drag(element: HTMLElement, dx: number, dy = 0) {
    const { x, y } = await pressAndMove(element, [dx / 2, dy / 2], [dx, dy]);
    await mouse("mouseReleased", x + dx, y + dy);
  }

  it("draws each handle inside its header's trailing edge, the cell's full inner height and unclipped", () => {
    renderResizable({ width: 900 });
    const strip = Number.parseFloat(resolved("width", "var(--vpg-space-2)"));
    for (const [name, index] of [
      ["Name", 0],
      ["Age", 1],
      ["Id", 2],
    ] as const) {
      const cell = header(index).getBoundingClientRect();
      const rect = handle(name).getBoundingClientRect();
      expect(rect.width).toBeCloseTo(strip, 1);
      expect(rect.right).toBeCloseTo(cell.right, 1);
      expect(rect.top).toBeCloseTo(cell.top, 1);
      expect(rect.height).toBeCloseTo(header(index).clientHeight, 1);
      expect(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(handle(name));
      expect(getComputedStyle(handle(name)).cursor).toBe("col-resize");
      expect(getComputedStyle(handle(name)).touchAction).toBe("none");
      expect(getComputedStyle(handle(name)).userSelect).toBe("none");
    }
  });

  /** The roles, names and values Chromium's accessibility tree gives the test page's nodes. */
  async function accessibilityTree() {
    interface FrameTree {
      frame: { id: string };
      childFrames?: FrameTree[];
    }
    interface AXNode {
      role?: { value: string };
      name?: { value: string };
      value?: { value: unknown };
    }
    await cdp().send("Accessibility.enable", {});
    const { frameTree } = (await cdp().send("Page.getFrameTree", {})) as { frameTree: FrameTree };
    const frames: FrameTree[] = [frameTree];
    const nodes: AXNode[] = [];
    for (let frame = frames.pop(); frame !== undefined; frame = frames.pop()) {
      frames.push(...(frame.childFrames ?? []));
      const tree = (await cdp().send("Accessibility.getFullAXTree", { frameId: frame.frame.id })) as { nodes: AXNode[] };
      nodes.push(...tree.nodes);
    }
    return nodes.map((node) => ({ role: node.role?.value, name: node.name?.value, value: node.value?.value }));
  }

  it("exposes each header named by its content alone, and each handle with its width as its value", async () => {
    renderResizable({ width: 300 });
    const nodes = await accessibilityTree();
    expect(nodes.filter(({ role }) => role === "columnheader").map(({ name }) => name)).toEqual(["Name", "Age", "Id"]);
    expect(nodes.filter(({ role }) => role === "separator").map(({ name, value }) => [name, value])).toEqual([
      ["Resize Name", 200],
      ["Resize Age", 100],
      ["Resize Id", 150],
    ]);
  });

  it("puts the handle on the header's left edge in a right-to-left table", () => {
    renderResizable({ width: 900, dir: "rtl" });
    const cell = header(0).getBoundingClientRect();
    const rect = handle("Name").getBoundingClientRect();
    expect(rect.left).toBeCloseTo(cell.left, 1);
    expect(cell.right).toBeGreaterThan(header(1).getBoundingClientRect().right);
  });

  it("resizes a column live by a real drag that leaves the handle, moving its edge with the pointer", async () => {
    const onColumnSizesChange = vi.fn();
    renderResizable({ width: 300, onColumnSizesChange });
    const before = headers().map(widthOf);
    expect(before).toEqual([200, 100, 150]);
    const start = edges(header(0));

    const { x, y } = await pressAndMove(handle("Name"), [20, 0], [40, 150], [60, 300]);
    expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 260 });
    expect(widthOf(header(0))).toBeCloseTo(260, 1);
    expect(edges(header(0))).toEqual({ left: start.left, right: start.right + 60 });
    expect(headers().slice(1).map(widthOf)).toEqual([100, 150]);
    expect(handle("Name")).toHaveAttribute("aria-valuenow", "260");
    expect(window.getSelection()?.toString()).toBe("");

    await mouse("mouseReleased", x + 60, y + 300);
    await mouse("mouseMoved", x + 120, y + 300);
    expect(widthOf(header(0))).toBeCloseTo(260, 1);
    expect(onColumnSizesChange).toHaveBeenCalledTimes(3);
  });

  it("follows the body cells with the header as a column is dragged", async () => {
    renderResizable({ width: 300 });
    await drag(handle("Name"), -50);
    const firstCell = screen.getAllByRole("cell")[0] as HTMLElement;
    expect(widthOf(header(0))).toBeCloseTo(150, 1);
    expect(widthOf(firstCell)).toBeCloseTo(150, 1);
  });

  it("clamps a dragged column at its minSize and its maxSize", async () => {
    renderResizable({ width: 300 });
    await drag(handle("Age"), -200);
    expect(widthOf(header(1))).toBeCloseTo(60, 1);
    await drag(handle("Age"), 300);
    expect(widthOf(header(1))).toBeCloseTo(160, 1);
  });

  it("widens a column dragged toward its trailing edge in a right-to-left table", async () => {
    renderResizable({ width: 300, dir: "rtl" });
    const right = header(0).getBoundingClientRect().right;
    await drag(handle("Name"), -40);
    expect(widthOf(header(0))).toBeCloseTo(240, 1);
    expect(header(0).getBoundingClientRect().right).toBeCloseTo(right, 1);
    await drag(handle("Name"), 70);
    expect(widthOf(header(0))).toBeCloseTo(170, 1);
  });

  it("resizes a focused handle's column in steps from the keyboard, flipped in a right-to-left table", async () => {
    const { unmount } = renderResizable({ width: 300 });
    handle("Name").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(widthOf(header(0))).toBeCloseTo(210, 1);
    // biome-ignore lint/security/noSecrets: a key sequence, read as a high-entropy string
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(widthOf(header(0))).toBeCloseTo(160, 1);
    await userEvent.keyboard("{Home}");
    expect(widthOf(header(0))).toBeCloseTo(20, 1);
    handle("Age").focus();
    await userEvent.keyboard("{End}");
    expect(widthOf(header(1))).toBeCloseTo(160, 1);
    expect(document.activeElement).toBe(handle("Age"));
    unmount();

    renderResizable({ width: 300, dir: "rtl" });
    handle("Name").focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(widthOf(header(0))).toBeCloseTo(210, 1);
  });

  it("reaches the handle with Tab after the header's sort button, and draws a focus ring", async () => {
    renderResizable({ width: 300 });
    screen.getByRole("button", { name: "Name" }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(handle("Name"));
    const style = getComputedStyle(handle("Name"));
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineColor).toBe(resolved("outlineColor", "var(--vpg-accent-ring)"));
  });

  it("starts a drag in a stretched table from the drawn widths, moving the dragged edge 1:1 and only the column after it", async () => {
    const onColumnSizesChange = vi.fn();
    renderResizable({ width: 900, onColumnSizesChange });
    const container = screen.getByRole("table").parentElement as HTMLElement;
    const before = headers().map((cell) => edges(cell));
    const drawn = headers().map(widthOf);
    expect(drawn.reduce((total, width) => total + width, 0)).toBeCloseTo(container.clientWidth, 0);
    expect(drawn[1]).toBeCloseTo(160, 1);

    // A drag that has not moved yet pins the column at its drawn width, and no column moves.
    const { x, y } = await pressAndMove(handle("Name"), [1, 0], [0, 0]);
    expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: drawn[0] });
    expect(headers().map((cell) => edges(cell))).toEqual(before);

    await mouse("mouseMoved", x + 30, y);
    await mouse("mouseReleased", x + 30, y);
    const after = headers().map((cell) => edges(cell));
    expect(after[0]).toEqual({ left: before[0]?.left, right: (before[0]?.right as number) + 30 });
    // The age column is exact at its maxSize already, so it keeps its width; the id column, still
    // sharing the container, gives up what the name column took, so the table still fills it.
    expect(widthOf(header(1))).toBeCloseTo(160, 1);
    expect(widthOf(header(2))).toBeCloseTo((drawn[2] as number) - 30, 1);
    expect(after[2]?.right).toBeCloseTo(before[2]?.right as number, 1);
  });

  it("draws a table whose columns all have sizes at exactly those sizes, and a drag moves no other column's width", async () => {
    renderResizable({ width: 900, defaultColumnSizes: { name: 300, age: 100, id: 150 } });
    expect(headers().map(widthOf)).toEqual([300, 100, 150]);
    expect(widthOf(screen.getByRole("table"))).toBe(550);
    await drag(handle("Age"), 40);
    expect(headers().map(widthOf)).toEqual([300, 140, 150]);
  });

  it("keeps the sticky header pinned while the body scrolls, and resizes from it", async () => {
    renderResizable({ width: 300, rows: crowd, stickyHeader: true, style: { maxBlockSize: "200px" } });
    const container = screen.getByRole("table").parentElement as HTMLElement;
    container.scrollTop = 300;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(header(0).getBoundingClientRect().top).toBeCloseTo(container.getBoundingClientRect().top, 0);
    await drag(handle("Name"), 30);
    expect(widthOf(header(0))).toBeCloseTo(230, 1);
    expect(header(0).getBoundingClientRect().top).toBeCloseTo(container.getBoundingClientRect().top, 0);
    expect(handle("Name").getBoundingClientRect().top).toBeCloseTo(header(0).getBoundingClientRect().top, 1);
  });

  it("never sorts on a drag, whether it is released on the handle or over a sort button", async () => {
    const onSortChange = vi.fn();
    renderResizable({ width: 300, onSortChange });
    await drag(handle("Name"), 0);
    await drag(handle("Name"), 20);
    const button = screen.getByRole("button", { name: "Age" }).getBoundingClientRect();
    const start = handle("Name").getBoundingClientRect();
    await drag(handle("Name"), button.left + button.width / 2 - (start.left + start.width / 2));
    expect(onSortChange).not.toHaveBeenCalled();
    for (const cell of headers()) expect(cell).not.toHaveAttribute("aria-sort");
  });
});

describe("DataTable, virtualized, in a real browser", () => {
  interface Entry {
    id: string;
    name: string;
    n: number;
  }

  const ROW_COUNT = 1000;
  /** Taller than a compact row's single line, so every body row whose text does not wrap is
   * exactly this tall. */
  const ROW_HEIGHT = 40;
  const VIEWPORT_HEIGHT = 400;
  const VIEWPORT_ROWS = VIEWPORT_HEIGHT / ROW_HEIGHT;

  const entries: Entry[] = Array.from({ length: ROW_COUNT }, (_, n) => ({ id: `e-${n}`, name: `Entry ${n}`, n }));
  const entryColumns: DataTableColumn<Entry>[] = [
    { accessor: "name", header: "Name", sortable: false },
    { accessor: "n", header: "Number", align: "end" },
  ];

  type VirtualizedProps = HelperProps<Entry, "virtualized" | "rowHeight" | "caption" | "aria-label"> & {
    caption?: string;
    rowHeight?: number;
  };

  function table({ caption, rowHeight = ROW_HEIGHT, ...props }: VirtualizedProps = {}) {
    const name = caption === undefined ? { "aria-label": "Entries" } : { caption };
    return (
      <ThemeProvider>
        {/* Draws every body row at least as tall as the estimate, so a row is taller only when its
            text wraps. */}
        <style>{`.vpg-data-table .vpg-table-body > .vpg-table-row:not(.vpg-data-table-spacer) { block-size: ${ROW_HEIGHT}px; }`}</style>
        <button type="button">Before</button>
        <DataTable
          {...name}
          columns={entryColumns}
          rows={entries}
          getRowId={(entry) => entry.id}
          density="compact"
          virtualized
          rowHeight={rowHeight}
          style={{ blockSize: `${VIEWPORT_HEIGHT}px` }}
          {...props}
        />
      </ThemeProvider>
    );
  }

  function renderEntries(props: VirtualizedProps = {}) {
    const result = render(table(props));
    return { ...result, rerenderEntries: (next: VirtualizedProps) => result.rerender(table(next)) };
  }

  function scroller(): HTMLElement {
    return document.querySelector(".vpg-table-container") as HTMLElement;
  }

  function tbody(): HTMLElement {
    return screen.getByRole("table").querySelector("tbody") as HTMLElement;
  }

  /** The rows assistive technology sees in the body: every mounted row, and no spacer. */
  function mountedRows(): HTMLElement[] {
    return within(tbody()).getAllByRole("row");
  }

  function spacers(): HTMLElement[] {
    return Array.from(tbody().querySelectorAll<HTMLElement>(":scope > .vpg-data-table-spacer"));
  }

  function heightOf(element: Element): number {
    return element.getBoundingClientRect().height;
  }

  function nameOf(row: HTMLElement): string {
    return within(row).getAllByRole("cell").at(-2)?.textContent ?? "";
  }

  /** The place in the whole list of the entry `row` draws, read off its name. */
  function indexOf(row: HTMLElement): number {
    return Number(nameOf(row).replace("Entry ", ""));
  }

  function rowNamed(name: string): HTMLElement | undefined {
    return mountedRows().find((row) => nameOf(row) === name);
  }

  /** Scrolls the container so the body row at `index` of the drawn rows sits at its top. */
  function scrollToRow(index: number) {
    const body = tbody().getBoundingClientRect().top - scroller().getBoundingClientRect().top + scroller().scrollTop;
    scroller().scrollTop = body + index * ROW_HEIGHT;
  }

  /** The place among the drawn rows of a mounted row, read off its `aria-rowindex`, which counts
   * the header row and the `pageStart` rows of the pages before. */
  function positionOf(row: HTMLElement, pageStart = 0): number {
    return Number(row.getAttribute("aria-rowindex")) - 2 - pageStart;
  }

  /** How far below the top of the body the drawn row at `position` starts, each row before it
   * `sizeOf` its position tall. */
  function startOf(position: number, sizeOf: (position: number) => number): number {
    let start = 0;
    for (let before = 0; before < position; before++) start += sizeOf(before);
    return start;
  }

  /** Checks that the spacers and mounted rows tile the body, each where the drawn rows put it,
   * the drawn row at each position `sizeOf` that position tall. */
  function expectRowsAccountedFor(drawnCount: number, pageStart = 0, sizeOf: (position: number) => number = () => ROW_HEIGHT) {
    const top = tbody().getBoundingClientRect().top;
    const [before, after] = spacers();
    const rows = mountedRows();
    const first = positionOf(rows[0] as HTMLElement, pageStart);
    const last = positionOf(rows.at(-1) as HTMLElement, pageStart);
    expect(spacers()).toHaveLength(2);
    expect(rows.map((row) => positionOf(row, pageStart))).toEqual(Array.from({ length: last - first + 1 }, (_, offset) => first + offset));
    expect(heightOf(before as HTMLElement)).toBeCloseTo(startOf(first, sizeOf), 0);
    for (const row of rows) {
      expect(heightOf(row)).toBeCloseTo(sizeOf(positionOf(row, pageStart)), 0);
      expect(row.getBoundingClientRect().top - top).toBeCloseTo(startOf(positionOf(row, pageStart), sizeOf), 0);
    }
    expect(heightOf(after as HTMLElement)).toBeCloseTo(startOf(drawnCount, sizeOf) - startOf(last + 1, sizeOf), 0);
    expect(heightOf(tbody())).toBeCloseTo(startOf(drawnCount, sizeOf), 0);
  }

  it("mounts the first window on mount, between spacers that hold every other row's height", () => {
    renderEntries();
    const rows = mountedRows();
    expect(nameOf(rows[0] as HTMLElement)).toBe("Entry 0");
    expect(rows.length).toBeGreaterThanOrEqual(VIEWPORT_ROWS - 1);
    expect(rows.length).toBeLessThan(VIEWPORT_ROWS * 2);
    expect(heightOf(scroller())).toBeCloseTo(VIEWPORT_HEIGHT, 0);
    expectRowsAccountedFor(ROW_COUNT);
  });

  it("mounts the rows at the scrolled-to offset, each where the whole list puts it", async () => {
    renderEntries();
    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(rowNamed("Entry 1")).toBeUndefined();
    expect(mountedRows().length).toBeLessThan(VIEWPORT_ROWS * 2);
    expectRowsAccountedFor(ROW_COUNT);
  });

  it("covers the view below a caption and a sticky header with mounted rows wherever it is scrolled", async () => {
    renderEntries({ caption: "Entries", stickyHeader: true });
    for (const index of [0, 37, 500, ROW_COUNT - VIEWPORT_ROWS]) {
      scrollToRow(index);
      await expect.poll(() => rowNamed(`Entry ${index}`)).toBeDefined();
      const view = scroller().getBoundingClientRect();
      const header = (screen.getByRole("table").querySelector("thead") as HTMLElement).getBoundingClientRect();
      const rows = mountedRows();
      expect((rows[0] as HTMLElement).getBoundingClientRect().top).toBeLessThanOrEqual(header.bottom + 0.5);
      expect((rows.at(-1) as HTMLElement).getBoundingClientRect().bottom).toBeGreaterThanOrEqual(view.bottom - 0.5);
      expectRowsAccountedFor(ROW_COUNT);
    }
  });

  it("counts every row for assistive technology and indexes each mounted one in the whole list", async () => {
    renderEntries();
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", String(ROW_COUNT + 1));
    expect(screen.getAllByRole("row")[0]).toHaveAttribute("aria-rowindex", "1");
    scrollToRow(700);
    await expect.poll(() => rowNamed("Entry 700")).toBeDefined();
    for (const row of mountedRows()) expect(row).toHaveAttribute("aria-rowindex", String(indexOf(row) + 2));
  });

  it("hides the spacer rows from assistive technology, each one cell across every column", () => {
    renderEntries({ selectionMode: "multiple" });
    for (const spacer of spacers()) {
      expect(spacer).toHaveAttribute("aria-hidden", "true");
      expect(spacer).not.toHaveAttribute("aria-rowindex");
      const cells = spacer.querySelectorAll("td");
      expect(cells).toHaveLength(1);
      expect(cells[0]).toHaveAttribute("colspan", "3");
    }
    expect(screen.getAllByRole("row")).toHaveLength(mountedRows().length + 1);
  });

  it("makes the scroll container a named region Tab reaches, whose arrow keys scroll rows into view", async () => {
    renderEntries();
    const region = screen.getByRole("region", { name: "Entries" });
    expect(region).toBe(scroller());
    screen.getByRole("button", { name: "Before" }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(region);
    await userEvent.keyboard("{End}");
    await expect.poll(() => rowNamed(`Entry ${ROW_COUNT - 1}`)).toBeDefined();
    expect(rowNamed("Entry 0")).toBeUndefined();
    expect(document.activeElement).toBe(region);
  });

  it("selects a Shift range from a row scrolled out of the window, over every row between", async () => {
    const onSelectionChange = vi.fn();
    renderEntries({ selectionMode: "multiple", selectRowLabel: (entry) => `Select ${entry.name}`, onSelectionChange });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Entry 2" }));
    screen.getByRole("button", { name: "Before" }).focus();
    scrollToRow(300);
    await expect.poll(() => rowNamed("Entry 300")).toBeDefined();
    expect(rowNamed("Entry 2")).toBeUndefined();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select Entry 305" }), { modifiers: ["Shift"] });
    expect(onSelectionChange).toHaveBeenLastCalledWith(entries.slice(2, 306).map((entry) => entry.id));
    for (const row of mountedRows()) {
      const checked = (row.querySelector("input") as HTMLInputElement).checked;
      expect(checked).toBe(indexOf(row) >= 2 && indexOf(row) <= 305);
    }

    scrollToRow(0);
    await expect.poll(() => rowNamed("Entry 0")).toBeDefined();
    expect((screen.getByRole("checkbox", { name: "Select Entry 1" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Select Entry 2" }) as HTMLInputElement).checked).toBe(true);
  });

  it("sorts every row, not just the window", async () => {
    renderEntries();
    await userEvent.click(screen.getByRole("button", { name: "Number" }));
    await userEvent.click(screen.getByRole("button", { name: "Number" }));
    expect(nameOf(mountedRows()[0] as HTMLElement)).toBe(`Entry ${ROW_COUNT - 1}`);
    expect(mountedRows()[0]).toHaveAttribute("aria-rowindex", "2");
    expectRowsAccountedFor(ROW_COUNT);
  });

  it("windows the current page, counting every page's rows and indexing rows past the pages before", async () => {
    const pageSize = 200;
    renderEntries({ paginated: true, pageSizeOptions: [pageSize], defaultPage: 3 });
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", String(ROW_COUNT + 1));
    expect(nameOf(mountedRows()[0] as HTMLElement)).toBe("Entry 400");
    expect(mountedRows()[0]).toHaveAttribute("aria-rowindex", "402");
    expect(mountedRows().length).toBeLessThan(VIEWPORT_ROWS * 2);
    expect(heightOf(tbody())).toBeCloseTo(pageSize * ROW_HEIGHT, 0);

    scrollToRow(150);
    await expect.poll(() => rowNamed("Entry 550")).toBeDefined();
    expect(rowNamed("Entry 550")).toHaveAttribute("aria-rowindex", "552");
    expectRowsAccountedFor(pageSize, 400);

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await expect.poll(() => indexOf(mountedRows()[0] as HTMLElement)).toBeGreaterThanOrEqual(600);
    for (const row of mountedRows()) expect(row).toHaveAttribute("aria-rowindex", String(indexOf(row) + 2));
    expectRowsAccountedFor(pageSize, 600);
  });

  it("counts a manual table's rows from totalItems, indexing the page passed past the pages before", () => {
    renderEntries({ manual: true, paginated: true, pageSizeOptions: [100], page: 2, totalItems: 5000, rows: entries.slice(100, 200) });
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "5001");
    expect(mountedRows()[0]).toHaveAttribute("aria-rowindex", "102");
    expectRowsAccountedFor(100, 100);
  });

  it("reckons the rows out of view from a new rowHeight, and the mounted rows at their measured height", () => {
    const { rerenderEntries } = renderEntries();
    rerenderEntries({ rowHeight: ROW_HEIGHT * 2 });
    const last = positionOf(mountedRows().at(-1) as HTMLElement);
    expect((mountedRows().at(-1) as HTMLElement).getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
      scroller().getBoundingClientRect().bottom - 0.5,
    );
    expectRowsAccountedFor(ROW_COUNT, 0, (position) => (position <= last ? ROW_HEIGHT : ROW_HEIGHT * 2));
  });

  /** Long enough to wrap in a column narrower than about 200 pixels, and short enough not to in
   * one wider. */
  const NOTE = "with a note that wraps";

  /** The entries, the one at `position` with `NOTE` after its name. */
  function withNoteAt(position: number): Entry[] {
    return entries.map((entry) => (entry.n === position ? { ...entry, name: `${entry.name} ${NOTE}` } : entry));
  }

  /** The mounted row drawn at `position`. */
  function rowAt(position: number): HTMLElement | undefined {
    return mountedRows().find((row) => positionOf(row) === position);
  }

  it("corrects the spacers and the window by the measured height of a row whose text wraps taller than rowHeight", async () => {
    renderEntries({ rows: withNoteAt(3), style: { blockSize: `${VIEWPORT_HEIGHT}px`, inlineSize: "200px" } });
    const tall = heightOf(rowAt(3) as HTMLElement);
    expect(tall).toBeGreaterThan(ROW_HEIGHT * 1.5);
    const sizeOf = (position: number) => (position === 3 ? tall : ROW_HEIGHT);
    expectRowsAccountedFor(ROW_COUNT, 0, sizeOf);

    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(rowAt(3)).toBeUndefined();
    expectRowsAccountedFor(ROW_COUNT, 0, sizeOf);
  });

  it("measures the mounted rows again when a column resize wraps their text, and the spacers follow", async () => {
    const sized: DataTableColumn<Entry>[] = [
      { accessor: "name", header: "Name", sortable: false, size: 400, minSize: 140 },
      { accessor: "n", header: "Number", align: "end", size: 100 },
    ];
    renderEntries({
      columns: sized,
      rows: withNoteAt(3),
      resizableColumns: true,
      style: { blockSize: `${VIEWPORT_HEIGHT}px`, inlineSize: "520px" },
    });
    expect(heightOf(rowAt(3) as HTMLElement)).toBeCloseTo(ROW_HEIGHT, 0);
    expectRowsAccountedFor(ROW_COUNT);

    screen.getByRole("separator", { name: "Resize Name" }).focus();
    await userEvent.keyboard("{Home}");
    await expect.poll(() => heightOf(rowAt(3) as HTMLElement)).toBeGreaterThan(ROW_HEIGHT + 1);
    const tall = heightOf(rowAt(3) as HTMLElement);
    const sizeOf = (position: number) => (position === 3 ? tall : ROW_HEIGHT);
    await expect.poll(() => heightOf(tbody())).toBeCloseTo((ROW_COUNT - 1) * ROW_HEIGHT + tall, 0);
    expectRowsAccountedFor(ROW_COUNT, 0, sizeOf);

    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(rowAt(3)).toBeUndefined();
    expectRowsAccountedFor(ROW_COUNT, 0, sizeOf);
  });

  it("keeps a row's measured height with the row through a sort that moves it out of the window", async () => {
    renderEntries({ rows: withNoteAt(3), style: { blockSize: `${VIEWPORT_HEIGHT}px`, inlineSize: "200px" } });
    const tall = heightOf(rowAt(3) as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: "Number" }));
    await userEvent.click(screen.getByRole("button", { name: "Number" }));
    expect(rowAt(3)).toBeDefined();
    expect(heightOf(rowAt(3) as HTMLElement)).toBeCloseTo(ROW_HEIGHT, 0);
    expect(heightOf(tbody())).toBeCloseTo((ROW_COUNT - 1) * ROW_HEIGHT + tall, 0);

    scroller().scrollTop = scroller().scrollHeight;
    await expect.poll(() => rowNamed("Entry 0")).toBeDefined();
    // Sorted by number, descending, the noted entry is drawn fourth from the end.
    expectRowsAccountedFor(ROW_COUNT, 0, (position) => (position === ROW_COUNT - 4 ? tall : ROW_HEIGHT));
  });

  /** The selection checkbox of the entry named `name`, while its row is mounted. */
  function checkboxOf(name: string): HTMLInputElement {
    return screen.getByRole("checkbox", { name: `Select ${name}` }) as HTMLInputElement;
  }

  function renderSelectable(props: VirtualizedProps = {}) {
    return renderEntries({ selectionMode: "multiple", selectRowLabel: (entry) => `Select ${entry.name}`, ...props });
  }

  /** Checks that the body's spacers and mounted rows tile it in drawn order, however many spacers
   * there are: every run of drawn rows not mounted is held by the spacer before the next mounted
   * row, or by the last spacer, each drawn row `ROW_HEIGHT` tall, and each mounted row's
   * `aria-rowindex` is the place of the entry it draws. */
  function expectBodyTiled() {
    const sizeOf = () => ROW_HEIGHT;
    const top = tbody().getBoundingClientRect().top;
    const children = Array.from(tbody().children) as HTMLElement[];
    expect(children[0]).toHaveClass("vpg-data-table-spacer");
    expect(children.at(-1)).toHaveClass("vpg-data-table-spacer");
    let next = 0;
    let held = 0;
    for (const child of children) {
      if (child.classList.contains("vpg-data-table-spacer")) {
        held += heightOf(child);
        continue;
      }
      const position = positionOf(child);
      expect(position).toBe(indexOf(child));
      expect(position).toBeGreaterThanOrEqual(next);
      expect(held).toBeCloseTo(startOf(position, sizeOf) - startOf(next, sizeOf), 0);
      expect(child.getBoundingClientRect().top - top).toBeCloseTo(startOf(position, sizeOf), 0);
      expect(heightOf(child)).toBeCloseTo(ROW_HEIGHT, 0);
      next = position + 1;
      held = 0;
    }
    expect(held).toBeCloseTo(startOf(ROW_COUNT, sizeOf) - startOf(next, sizeOf), 0);
    expect(heightOf(tbody())).toBeCloseTo(ROW_COUNT * ROW_HEIGHT, 0);
  }

  it("keeps the row of a focused checkbox mounted and focused however far the window moves above it", async () => {
    const onSelectionChange = vi.fn();
    renderSelectable({ onSelectionChange });
    const focused = checkboxOf("Entry 3");
    focused.focus();
    for (const index of [500, ROW_COUNT - VIEWPORT_ROWS]) {
      scrollToRow(index);
      await expect.poll(() => rowNamed(`Entry ${index}`)).toBeDefined();
      expect(rowNamed("Entry 1")).toBeUndefined();
      expect(rowNamed("Entry 3")).toHaveAttribute("aria-rowindex", "5");
      expect(document.activeElement).toBe(focused);
      expect(spacers()).toHaveLength(3);
      expectBodyTiled();
    }

    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["e-3"]);
    expect(focused.checked).toBe(true);
    expect(document.activeElement).toBe(focused);
  });

  it("keeps the row of a focused checkbox mounted below the window, after a spacer for the rows between", async () => {
    renderSelectable();
    scrollToRow(600);
    await expect.poll(() => rowNamed("Entry 600")).toBeDefined();
    const focused = checkboxOf("Entry 602");
    focused.focus();
    scrollToRow(0);
    await expect.poll(() => rowNamed("Entry 0")).toBeDefined();
    expect(rowNamed("Entry 600")).toBeUndefined();
    expect(rowNamed("Entry 602")).toHaveAttribute("aria-rowindex", "604");
    expect(document.activeElement).toBe(focused);
    expect(spacers()).toHaveLength(3);
    expectBodyTiled();
  });

  it("keeps a focused control in a cell mounted, whatever control holds focus in the row", async () => {
    renderEntries({
      columns: [
        {
          id: "open",
          accessor: "name",
          header: "Open",
          sortable: false,
          cell: ({ value }) => <button type="button">Open {String(value)}</button>,
        },
        ...entryColumns,
      ],
    });
    const focused = screen.getByRole("button", { name: "Open Entry 4" });
    focused.focus();
    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(screen.getByRole("button", { name: "Open Entry 4" })).toBe(focused);
    expect(document.activeElement).toBe(focused);
  });

  it("lets the focused row unmount once focus leaves the body", async () => {
    renderSelectable();
    checkboxOf("Entry 3").focus();
    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(rowNamed("Entry 3")).toBeDefined();

    screen.getByRole("button", { name: "Before" }).focus();
    await expect.poll(() => rowNamed("Entry 3")).toBeUndefined();
    expect(spacers()).toHaveLength(2);
    expectRowsAccountedFor(ROW_COUNT);
  });

  it("pins the row focus moves to within the body, and lets the row it left unmount", async () => {
    renderSelectable();
    checkboxOf("Entry 3").focus();
    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();

    const moved = checkboxOf("Entry 502");
    moved.focus();
    await expect.poll(() => rowNamed("Entry 3")).toBeUndefined();
    scrollToRow(0);
    await expect.poll(() => rowNamed("Entry 0")).toBeDefined();
    expect(rowNamed("Entry 502")).toBeDefined();
    expect(document.activeElement).toBe(moved);
    expectBodyTiled();
  });

  it("pins the focused row by id, so it stays mounted and focused where a sort moves it", async () => {
    const { rerenderEntries } = renderSelectable();
    const focused = checkboxOf("Entry 3");
    focused.focus();
    rerenderEntries({
      selectionMode: "multiple",
      selectRowLabel: (entry) => `Select ${entry.name}`,
      sort: [{ columnId: "n", direction: "desc" }],
    });
    expect(nameOf(mountedRows()[0] as HTMLElement)).toBe(`Entry ${ROW_COUNT - 1}`);
    expect(rowNamed("Entry 3")).toHaveAttribute("aria-rowindex", String(ROW_COUNT - 3 + 1));
    expect(document.activeElement).toBe(focused);
    expect(spacers()).toHaveLength(3);
  });

  it("pins no row while focus is on a header's sort button", async () => {
    renderSelectable();
    const sortButton = screen.getByRole("button", { name: "Number" });
    sortButton.focus();
    scrollToRow(500);
    await expect.poll(() => rowNamed("Entry 500")).toBeDefined();
    expect(rowNamed("Entry 0")).toBeUndefined();
    expect(document.activeElement).toBe(sortButton);
    expect(spacers()).toHaveLength(2);
    expectRowsAccountedFor(ROW_COUNT);
  });

  describe("with onLoadMore", () => {
    /** The rows loaded so far: the first hundred entries. */
    const LOADED = 100;
    const loaded = entries.slice(0, LOADED);

    /** Lets the window and every effect it causes settle: two frames, past any scroll event. */
    async function settle() {
      await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }

    /** Scrolls the body row at `index` to the top of the view and waits for its window. */
    async function scrollTo(index: number) {
      scrollToRow(index);
      await expect.poll(() => rowNamed(`Entry ${index}`)).toBeDefined();
      await settle();
    }

    /** Scrolls to the last loaded row and waits for its window. */
    async function scrollToEnd(count = LOADED) {
      scroller().scrollTop = scroller().scrollHeight;
      await expect.poll(() => rowNamed(`Entry ${count - 1}`)).toBeDefined();
      await settle();
    }

    function renderInfinite(props: Partial<VirtualizedProps> & { onLoadMore: () => void; hasMore?: boolean }) {
      return renderEntries({ rows: loaded, hasMore: true, ...props } as VirtualizedProps);
    }

    it("asks once as the rows in view come within loadMoreThreshold rows of the last, and not again while it stays in reach", async () => {
      const onLoadMore = vi.fn();
      renderInfinite({ onLoadMore, loadMoreThreshold: 20 });
      await settle();
      expect(onLoadMore).not.toHaveBeenCalled();

      // The view holds ten rows, so a row at its top leaves the last row in view nine rows below.
      await scrollTo(66);
      expect(onLoadMore).not.toHaveBeenCalled();
      await scrollTo(72);
      expect(onLoadMore).toHaveBeenCalledOnce();

      await scrollTo(74);
      await scrollToEnd();
      await scrollTo(70);
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it("reckons the default threshold as five rows from the last row in view", async () => {
      const onLoadMore = vi.fn();
      renderInfinite({ onLoadMore });
      await scrollTo(LOADED - 10 - 7);
      expect(onLoadMore).not.toHaveBeenCalled();
      await scrollTo(LOADED - 10 - 3);
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it("asks once from an empty start under StrictMode, whose simulated remount runs every effect again", async () => {
      const onLoadMore = vi.fn();
      render(<StrictMode>{table({ rows: [], onLoadMore, hasMore: true })}</StrictMode>);
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it("asks once under StrictMode for a scroll to the end", async () => {
      const onLoadMore = vi.fn();
      render(<StrictMode>{table({ rows: loaded, onLoadMore, hasMore: true })}</StrictMode>);
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it("draws a table without onLoadMore to its last row, the same as before any load", async () => {
      renderEntries({ rows: loaded });
      await scrollToEnd();
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", String(LOADED + 1));
      expect(rowNamed(`Entry ${LOADED - 1}`)).toHaveAttribute("aria-rowindex", String(LOADED + 1));
      expectRowsAccountedFor(LOADED);
    });

    /** A consumer that appends `pageSize` entries per request, up to `total`, after a macrotask
     * when `async`, setting `loadingMore` meanwhile, and at once otherwise. */
    function Feed({ pageSize, total, async, onLoadMore }: { pageSize: number; total: number; async: boolean; onLoadMore: () => void }) {
      const [rows, setRows] = useState(() => entries.slice(0, pageSize));
      const [loadingMore, setLoadingMore] = useState(false);
      function append() {
        setRows((current) => entries.slice(0, Math.min(total, current.length + pageSize)));
      }
      function load() {
        onLoadMore();
        if (!async) return append();
        setLoadingMore(true);
        setTimeout(() => {
          append();
          setLoadingMore(false);
        });
      }
      return table({ rows, onLoadMore: load, hasMore: rows.length < total, loadingMore });
    }

    for (const async of [false, true]) {
      it(`keeps asking for a short first page's next rows until they fill the view and the threshold beyond, ${async ? "while loadingMore between" : "appended at once"}`, async () => {
        const onLoadMore = vi.fn();
        render(<Feed pageSize={3} total={LOADED} async={async} onLoadMore={onLoadMore} />);
        // Ten rows fill the view, and the last row in view is then five rows from the end once 16 are loaded.
        await expect.poll(() => onLoadMore.mock.calls.length).toBeGreaterThanOrEqual(5);
        await settle();
        await settle();
        const calls = onLoadMore.mock.calls.length;
        const count = 3 + calls * 3;
        expect(count).toBeGreaterThanOrEqual(16);
        expect(count).toBeLessThanOrEqual(21);
        expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", String(count + 1));
        expect(heightOf(tbody())).toBeGreaterThan(VIEWPORT_HEIGHT);
      });
    }

    it("stops asking for a short first page's next rows once hasMore is false, the view still not full", async () => {
      const onLoadMore = vi.fn();
      render(<Feed pageSize={3} total={5} async={false} onLoadMore={onLoadMore} />);
      await settle();
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(mountedRows()).toHaveLength(5);
    });

    it("asks for nothing while focus pins the first row of a long list scrolled to its top, nor far from the end", async () => {
      const onLoadMore = vi.fn();
      renderInfinite({ onLoadMore, selectionMode: "multiple", selectRowLabel: (entry) => `Select ${entry.name}` });
      const focused = checkboxOf("Entry 0");
      focused.focus();
      await settle();
      expect(onLoadMore).not.toHaveBeenCalled();

      await scrollTo(60);
      expect(rowNamed("Entry 0")).toBeDefined();
      expect(onLoadMore).not.toHaveBeenCalled();

      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(focused);
    });

    it("asks for nothing while focus pins a row near the end with the view far from it", async () => {
      const onLoadMore = vi.fn();
      const selectable = { onLoadMore, selectionMode: "multiple", selectRowLabel: (entry: Entry) => `Select ${entry.name}` } as const;
      const { rerenderEntries } = renderInfinite(selectable);
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      const focused = checkboxOf(`Entry ${LOADED - 2}`);
      focused.focus();
      rerenderEntries({ rows: loaded, hasMore: true, loadingMore: true, ...selectable } as VirtualizedProps);

      await scrollTo(0);
      // The pinned row is mounted, the last of the window, within the threshold of the last row.
      expect(rowNamed(`Entry ${LOADED - 2}`)).toBeDefined();
      rerenderEntries({ rows: loaded, hasMore: true, loadingMore: false, ...selectable } as VirtualizedProps);
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(focused);

      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledTimes(2);
    });

    it("asks for nothing while loadingMore, and asks once it is cleared with the end still in view", async () => {
      const onLoadMore = vi.fn();
      const { rerenderEntries } = renderInfinite({ onLoadMore, loadingMore: true });
      await scrollToEnd();
      expect(onLoadMore).not.toHaveBeenCalled();
      rerenderEntries({ rows: loaded, onLoadMore, hasMore: true } as VirtualizedProps);
      await expect.poll(() => onLoadMore.mock.calls.length).toBe(1);
    });

    it("asks for nothing while hasMore is false, however far it is scrolled", async () => {
      const onLoadMore = vi.fn();
      renderInfinite({ onLoadMore, hasMore: false });
      await scrollToEnd();
      expect(onLoadMore).not.toHaveBeenCalled();
    });

    it("asks once from an empty start, and not again when the first page arrives far from its end", async () => {
      const onLoadMore = vi.fn();
      const { rerenderEntries } = renderInfinite({ onLoadMore, rows: [] });
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();
      rerenderEntries({ rows: loaded, onLoadMore, hasMore: true } as VirtualizedProps);
      await expect.poll(() => rowNamed("Entry 0")).toBeDefined();
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it("asks again after a request that brought no rows, once loadingMore has been seen set", async () => {
      const onLoadMore = vi.fn();
      const { rerenderEntries } = renderInfinite({ onLoadMore });
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      rerenderEntries({ rows: loaded, onLoadMore, hasMore: true } as VirtualizedProps);
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();

      rerenderEntries({ rows: loaded, onLoadMore, hasMore: true, loadingMore: true } as VirtualizedProps);
      await settle();
      rerenderEntries({ rows: loaded, onLoadMore, hasMore: true, loadingMore: false } as VirtualizedProps);
      await expect.poll(() => onLoadMore.mock.calls.length).toBe(2);
    });

    it("asks again when rows are appended that leave the end in reach, and not for the same count of rows", async () => {
      const onLoadMore = vi.fn();
      const { rerenderEntries } = renderInfinite({ onLoadMore });
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      rerenderEntries({ rows: [...loaded], onLoadMore, hasMore: true } as VirtualizedProps);
      await settle();
      expect(onLoadMore).toHaveBeenCalledOnce();

      rerenderEntries({ rows: entries.slice(0, LOADED + 2), onLoadMore, hasMore: true } as VirtualizedProps);
      await expect.poll(() => onLoadMore.mock.calls.length).toBe(2);
    });

    it("asks again after a header sort click with the end in reach", async () => {
      const onLoadMore = vi.fn();
      // The sticky header stays in view, so the click scrolls nothing.
      renderInfinite({ onLoadMore, stickyHeader: true });
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      await userEvent.click(screen.getByRole("button", { name: "Number" }));
      expect(rowNamed(`Entry ${LOADED - 1}`)).toBeDefined();
      await expect.poll(() => onLoadMore.mock.calls.length).toBe(2);
    });

    it("starts onLoadMore for a scroll to the end inside the enclosing ScopeProvider's scope", async () => {
      let started: unknown;
      const onLoadMore = vi.fn(() => {
        started = Scope.current().get("user.id");
      });
      render(<ScopeProvider attributes={{ "user.id": "u1" }}>{table({ rows: loaded, onLoadMore, hasMore: true })}</ScopeProvider>);
      await scrollToEnd();
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(started).toBe("u1");
    });
  });
});
