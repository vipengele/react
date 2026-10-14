import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { DataTable, type DataTableColumn, type DataTableProps } from "./DataTable.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one table.
afterEach(cleanup);

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

function renderMembers(props: Partial<DataTableProps<Member>> = {}) {
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

  function renderPaged(props: Partial<DataTableProps<(typeof items)[number]>> = {}) {
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

  function renderResizable({ width, dir, ...props }: Partial<DataTableProps<Member>> & { width: number; dir?: "rtl" }) {
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
