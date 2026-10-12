import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableCellContext, type DataTableColumn, type DataTableProps } from "./DataTable.js";

interface Person {
  id: string;
  name: string;
  age: number;
  email: string | null;
  team?: string;
}

const people: Person[] = [
  { id: "p-ada", name: "Ada", age: 36, email: "ada@example.com", team: "Engines" },
  { id: "p-grace", name: "Grace", age: 85, email: null },
];

const columns: DataTableColumn<Person>[] = [
  { accessor: "name", header: "Name" },
  { accessor: "age", header: "Age", align: "end" },
  { id: "initial", accessor: (person) => person.name.charAt(0), header: "Initial" },
];

function renderDataTable(props: Partial<DataTableProps<Person>> = {}) {
  return render(<DataTable columns={columns} rows={people} {...props} />);
}

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole("table");
  const body = table.querySelector("tbody");
  return within(body as HTMLElement).queryAllByRole("row");
}

function cellTexts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("DataTable", () => {
  it("renders one column header per column, in order", () => {
    renderDataTable();
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual(["Name", "Age", "Initial"]);
    for (const header of headers) expect(header).toHaveAttribute("scope", "col");
    expect(headers[0]?.closest("thead")).not.toBeNull();
  });

  it("renders a body row per row with cells from key and function accessors", () => {
    renderDataTable();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0] as HTMLElement)).toEqual(["Ada", "36", "A"]);
    expect(cellTexts(rows[1] as HTMLElement)).toEqual(["Grace", "85", "G"]);
  });

  it("renders a null or undefined value as an empty cell and any other value as text", () => {
    render(
      <DataTable
        columns={[
          { accessor: "email", header: "Email" },
          { accessor: "team", header: "Team" },
          { id: "senior", accessor: (person) => person.age > 60, header: "Senior" },
        ]}
        rows={people}
      />,
    );
    const rows = bodyRows();
    expect(cellTexts(rows[0] as HTMLElement)).toEqual(["ada@example.com", "Engines", "false"]);
    expect(cellTexts(rows[1] as HTMLElement)).toEqual(["", "", "true"]);
    expect(within(rows[1] as HTMLElement).getAllByRole("cell")[0]?.childNodes).toHaveLength(0);
  });

  it("draws a cell with the column's renderer, given the row, the value and the row index", () => {
    const cell = vi.fn(({ row }: DataTableCellContext<Person>) => <strong>{row.age} years</strong>);
    render(<DataTable columns={[{ accessor: "age", header: "Age", cell }]} rows={people} />);
    expect(cell).toHaveBeenCalledWith({ row: people[0], value: 36, rowIndex: 0 });
    expect(cell).toHaveBeenCalledWith({ row: people[1], value: 85, rowIndex: 1 });
    const strong = within(bodyRows()[1] as HTMLElement).getByText("85 years");
    expect(strong.tagName).toBe("STRONG");
  });

  it("hands a function column's renderer the accessor's value", () => {
    render(
      <DataTable
        columns={[
          {
            id: "contact",
            accessor: (person) => person.email ?? "none",
            header: "Contact",
            cell: ({ row, value }) => `${row.name}: ${String(value)}`,
          },
        ]}
        rows={people}
      />,
    );
    expect(bodyRows().map(cellTexts)).toEqual([["Ada: ada@example.com"], ["Grace: none"]]);
  });

  it("aligns a column's header and cells from its align", () => {
    renderDataTable();
    const [name, age] = screen.getAllByRole("columnheader");
    expect(name).toHaveClass("vpg-table-align-start");
    expect(age).toHaveClass("vpg-table-align-end");
    for (const row of bodyRows()) {
      const cells = within(row).getAllByRole("cell");
      expect(cells[0]).toHaveClass("vpg-table-align-start");
      expect(cells[1]).toHaveClass("vpg-table-align-end");
    }
  });

  it("renders a header and an empty body when there are no rows", () => {
    renderDataTable({ rows: [] });
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    const body = screen.getByRole("table").querySelector("tbody");
    expect(body).not.toBeNull();
    expect(body?.children).toHaveLength(0);
  });

  it("makes neither rows nor cells focusable", () => {
    renderDataTable();
    const table = screen.getByRole("table");
    expect(table.querySelectorAll("[tabindex]")).toHaveLength(0);
  });

  it("injects its stylesheet keyed by href and precedence, beside the table's", () => {
    renderDataTable();
    const sheets = document.querySelectorAll("style[data-href='vpg-data-table']");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-data-table");
    expect(sheets[0]?.textContent).toContain(".vpg-data-table");
    expect(document.querySelectorAll("style[data-href='vpg-table']")).toHaveLength(1);
  });

  describe("passing through to Table", () => {
    it("renders the caption and makes the scroll container a labelled region", () => {
      renderDataTable({ caption: "People" });
      const region = screen.getByRole("region", { name: "People" });
      expect(region).toHaveClass("vpg-table-container");
      expect(within(region).getByRole("table", { name: "People" })).toBeInTheDocument();
    });

    it("applies density and stickyHeader to the table", () => {
      renderDataTable({ density: "compact", stickyHeader: true });
      const table = screen.getByRole("table");
      expect(table).toHaveClass("vpg-table-density-compact", "vpg-table-sticky-header");
    });

    it("joins className with its own class on the scroll container and applies style there", () => {
      const { container } = renderDataTable({ className: "people", style: { maxBlockSize: "20rem" } });
      const wrapper = container.querySelector<HTMLElement>(".vpg-table-container");
      expect(wrapper).toHaveClass("vpg-data-table", "people");
      expect(wrapper?.style.maxBlockSize).toBe("20rem");
      expect(screen.getByRole("table")).not.toHaveClass("people");
    });

    it("attaches ref to the table and scrollRef to the scroll container", () => {
      const ref = createRef<HTMLTableElement>();
      const scrollRef = createRef<HTMLDivElement>();
      renderDataTable({ ref, scrollRef });
      expect(ref.current).toBe(screen.getByRole("table"));
      expect(scrollRef.current).toHaveClass("vpg-table-container", "vpg-data-table");
    });

    it("passes native table props to the table", () => {
      renderDataTable({ "aria-describedby": "people-help", id: "people-table" });
      const table = screen.getByRole("table");
      expect(table).toHaveAttribute("aria-describedby", "people-help");
      expect(table).toHaveAttribute("id", "people-table");
    });
  });

  describe("column ids", () => {
    it("derives a key column's id from its accessor, so a second column on that key needs its own", () => {
      expect(() =>
        render(
          <DataTable
            columns={[
              { accessor: "name", header: "Name" },
              { accessor: "name", header: "Name again" },
            ]}
            rows={people}
          />,
        ),
      ).toThrow('DataTable column ids must be unique; "name" appears more than once.');

      render(
        <DataTable
          columns={[
            { accessor: "name", header: "Name" },
            { id: "name-again", accessor: "name", header: "Name again" },
          ]}
          rows={people}
        />,
      );
      expect(cellTexts(bodyRows()[0] as HTMLElement)).toEqual(["Ada", "Ada"]);
    });

    it("rejects an id shared between a key column and a function column", () => {
      expect(() =>
        render(
          <DataTable
            columns={[
              { accessor: "age", header: "Age" },
              { id: "age", accessor: (person: Person) => person.age * 12, header: "Months" },
            ]}
            rows={people}
          />,
        ),
      ).toThrow('"age" appears more than once');
    });

    it("throws for a function column without an id", () => {
      const unnamed = { accessor: (person: Person) => person.name, header: "Name" };
      // @ts-expect-error A function column requires an id.
      const missingId: DataTableColumn<Person> = unnamed;
      expect(() => render(<DataTable columns={[missingId]} rows={people} />)).toThrow(
        "A DataTable column with a function accessor requires an id.",
      );
    });

    it("reads a key as a plain property name, never as a path", () => {
      const rows = [{ "a.b": "flat", a: { b: "nested" } }];
      render(<DataTable columns={[{ accessor: "a.b", header: "A.B" }]} rows={rows} />);
      expect(cellTexts(bodyRows()[0] as HTMLElement)).toEqual(["flat"]);
    });
  });

  describe("row identity", () => {
    it("keys rows by index by default, so a row's elements stay at its position", () => {
      const { rerender } = renderDataTable();
      const [first, second] = bodyRows();
      rerender(<DataTable columns={columns} rows={[people[1] as Person]} />);
      const [remaining] = bodyRows();
      expect(remaining).toBe(first);
      expect(second?.isConnected).toBe(false);
      expect(cellTexts(remaining as HTMLElement)).toEqual(["Grace", "85", "G"]);
    });

    it("keys rows by getRowId, so a row keeps its elements when rows before it are removed", () => {
      const getRowId = vi.fn((person: Person) => person.id);
      const { rerender } = renderDataTable({ getRowId });
      expect(getRowId).toHaveBeenCalledWith(people[0], 0);
      expect(getRowId).toHaveBeenCalledWith(people[1], 1);
      const [first, second] = bodyRows();
      rerender(<DataTable columns={columns} rows={[people[1] as Person]} getRowId={getRowId} />);
      const [remaining] = bodyRows();
      expect(remaining).toBe(second);
      expect(first?.isConnected).toBe(false);
      expect(cellTexts(remaining as HTMLElement)).toEqual(["Grace", "85", "G"]);
    });
  });

  it("re-renders from new rows and columns", () => {
    const { rerender } = renderDataTable();
    rerender(
      <DataTable
        columns={[{ accessor: "email", header: "Email" }]}
        rows={[{ id: "p-katherine", name: "Katherine", age: 101, email: "kj@example.com" }]}
      />,
    );
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Email"]);
    expect(bodyRows().map(cellTexts)).toEqual([["kj@example.com"]]);
  });
});
