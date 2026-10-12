import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
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
function resolved(property: "width" | "backgroundColor" | "paddingInlineStart", value: string) {
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
