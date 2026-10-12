import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DataTable,
  type DataTableCellContext,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSortDirection,
  type DataTableSortState,
} from "./DataTable.js";

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

  it("renders the header above the empty-state row when there are no rows", () => {
    renderDataTable({ rows: [] });
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("table").querySelector("tbody")).not.toBeNull();
    expect(bodyRows()).toHaveLength(1);
  });

  it("makes neither rows nor cells focusable, leaving the sort buttons as the tab stops", () => {
    renderDataTable();
    const table = screen.getByRole("table");
    expect(table.querySelectorAll("[tabindex]")).toHaveLength(0);
    const buttons = within(table).getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button.closest("th")).not.toBeNull();
  });

  it("injects its stylesheet keyed by href and precedence, beside the table's", () => {
    renderDataTable();
    const sheets = document.querySelectorAll("style[data-href='vpg-data-table']");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-data-table");
    expect(sheets[0]?.textContent).toContain(".vpg-data-table");
    expect(sheets[0]?.textContent).toContain(".vpg-data-table-sort");
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
  describe("sorting", () => {
    interface Member {
      id: string;
      name: string;
      age: number;
      team: string;
    }

    const members: Member[] = [
      { id: "m-grace", name: "Grace", age: 85, team: "Navy" },
      { id: "m-ada", name: "Ada", age: 36, team: "Engines" },
      { id: "m-alan", name: "Alan", age: 41, team: "Bletchley" },
      { id: "m-joan", name: "Joan", age: 36, team: "Bletchley" },
    ];

    const memberColumns: DataTableColumn<Member>[] = [
      { accessor: "name", header: "Name" },
      { accessor: "age", header: "Age", align: "end" },
      { accessor: "team", header: "Team" },
    ];

    function renderMembers(props: Partial<DataTableProps<Member>> = {}) {
      return render(<DataTable columns={memberColumns} rows={members} getRowId={(member) => member.id} {...props} />);
    }

    function names(): string[] {
      return bodyRows().map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");
    }

    function header(name: string): HTMLElement {
      const found = screen.getAllByRole("columnheader").find((cell) => cell.textContent?.startsWith(name));
      if (found === undefined) throw new Error(`No column header ${name}`);
      return found;
    }

    function sortButton(name: string): HTMLElement {
      return within(header(name)).getByRole("button");
    }

    function indicator(name: string): Element | null {
      return header(name).querySelector(".vpg-data-table-sort-indicator");
    }

    function click(name: string, init: { shiftKey?: boolean } = {}) {
      // A pointer click carries a click count of at least 1.
      fireEvent.click(sortButton(name), { detail: 1, ...init });
    }

    /**
     * Renders one function column over `values` and returns the order, as indices into `values`,
     * the sort draws them in.
     */
    function orderOf(values: unknown[], direction: DataTableSortDirection, sortFn?: (a: unknown, b: unknown) => number) {
      const rows = values.map((value, index) => ({ index, value }));
      const { unmount } = render(
        <DataTable
          columns={[
            {
              id: "value",
              accessor: (row: { index: number; value: unknown }) => row.value,
              header: "Value",
              cell: ({ row }) => String(row.index),
              ...(sortFn === undefined ? {} : { sortFn }),
            },
          ]}
          rows={rows}
          sort={[{ columnId: "value", direction }]}
        />,
      );
      const order = bodyRows().map((row) => Number(row.textContent));
      unmount();
      return order;
    }

    describe("the default comparator", () => {
      it("orders numbers and bigints numerically, with NaN after every other number", () => {
        const values = [3, -1, Number.NaN, 10n, 2.5, 0];
        expect(orderOf(values, "asc")).toEqual([1, 5, 4, 0, 3, 2]);
        expect(orderOf(values, "desc")).toEqual([2, 3, 0, 4, 5, 1]);
      });

      it("orders strings by locale collation with numeric runs compared by value", () => {
        const values = ["Banana", "item 10", "apple", "item 2"];
        expect(orderOf(values, "asc")).toEqual([2, 0, 3, 1]);
        expect(orderOf(values, "desc")).toEqual([1, 3, 0, 2]);
      });

      it("orders dates by time, with an invalid date after every valid one", () => {
        const values = [new Date("2021-06-01"), new Date("not a date"), new Date("2019-01-01")];
        expect(orderOf(values, "asc")).toEqual([2, 0, 1]);
        expect(orderOf(values, "desc")).toEqual([1, 0, 2]);
      });

      it("orders false before true", () => {
        const values = [true, false, true];
        expect(orderOf(values, "asc")).toEqual([1, 0, 2]);
        expect(orderOf(values, "desc")).toEqual([0, 2, 1]);
      });

      it("puts null and undefined last in both directions, in their original order", () => {
        const values = [2, null, 1, undefined, 3];
        expect(orderOf(values, "asc")).toEqual([2, 0, 4, 1, 3]);
        expect(orderOf(values, "desc")).toEqual([4, 0, 2, 1, 3]);
      });

      it("orders values of different kinds by kind: booleans, numbers, dates, strings, then anything else", () => {
        const other = { toString: () => "other" };
        const values = [other, "text", new Date("2020-01-01"), 7, true, null];
        expect(orderOf(values, "asc")).toEqual([4, 3, 2, 1, 0, 5]);
        expect(orderOf(values, "desc")).toEqual([0, 1, 2, 3, 4, 5]);
      });

      it("compares values of no comparable kind by their string form", () => {
        const values = [{ toString: () => "b" }, { toString: () => "a" }];
        expect(orderOf(values, "asc")).toEqual([1, 0]);
      });

      it("keeps rows that tie in their original order in both directions", () => {
        const values = [2, 1, 2, 1, 2];
        expect(orderOf(values, "asc")).toEqual([1, 3, 0, 2, 4]);
        expect(orderOf(values, "desc")).toEqual([0, 2, 4, 1, 3]);
      });
    });

    it("sorts by a column's sortFn ascending, inverts it descending, and never hands it null or undefined", () => {
      const byLength = vi.fn((a: unknown, b: unknown) => String(a).length - String(b).length);
      const values = ["ccc", "a", null, "bb", undefined, "dd"];
      expect(orderOf(values, "asc", byLength)).toEqual([1, 3, 5, 0, 2, 4]);
      expect(orderOf(values, "desc", byLength)).toEqual([0, 3, 5, 1, 2, 4]);
      for (const [a, b] of byLength.mock.calls) {
        expect(a).not.toBeNull();
        expect(a).not.toBeUndefined();
        expect(b).not.toBeNull();
        expect(b).not.toBeUndefined();
      }
    });

    it("renders each sortable header as a button holding the header, with a hidden indicator and no aria-sort", () => {
      renderMembers();
      const name = header("Name");
      const button = within(name).getByRole("button", { name: "Name" });
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass("vpg-data-table-sort");
      expect(name).toHaveClass("vpg-data-table-sortable");
      expect(name).not.toHaveAttribute("aria-sort");
      expect(indicator("Name")).toHaveAttribute("aria-hidden", "true");
      expect(indicator("Name")).toHaveAttribute("data-direction", "none");
    });

    it("cycles a column through ascending, descending and unsorted on click", () => {
      const onSortChange = vi.fn();
      renderMembers({ onSortChange });
      expect(names()).toEqual(["Grace", "Ada", "Alan", "Joan"]);

      click("Name");
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "name", direction: "asc" }]);
      expect(names()).toEqual(["Ada", "Alan", "Grace", "Joan"]);
      expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
      expect(indicator("Name")).toHaveAttribute("data-direction", "asc");

      click("Name");
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "name", direction: "desc" }]);
      expect(names()).toEqual(["Joan", "Grace", "Alan", "Ada"]);
      expect(header("Name")).toHaveAttribute("aria-sort", "descending");
      expect(indicator("Name")).toHaveAttribute("data-direction", "desc");

      click("Name");
      expect(onSortChange).toHaveBeenLastCalledWith([]);
      expect(names()).toEqual(["Grace", "Ada", "Alan", "Joan"]);
      expect(header("Name")).not.toHaveAttribute("aria-sort");
      expect(indicator("Name")).toHaveAttribute("data-direction", "none");
      expect(onSortChange).toHaveBeenCalledTimes(3);
    });

    it("replaces a multi-column sort with the clicked column on a plain click", () => {
      const onSortChange = vi.fn();
      renderMembers({
        defaultSort: [
          { columnId: "team", direction: "asc" },
          { columnId: "age", direction: "desc" },
        ],
        onSortChange,
      });
      click("Age");
      expect(onSortChange).toHaveBeenLastCalledWith([]);
      click("Team");
      click("Age");
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "asc" }]);
      expect(header("Team")).not.toHaveAttribute("aria-sort");
      expect(header("Age")).toHaveAttribute("aria-sort", "ascending");
    });

    it("turns an ascending column of a multi-column sort descending on a plain click, dropping the others", () => {
      const onSortChange = vi.fn();
      renderMembers({
        defaultSort: [
          { columnId: "team", direction: "asc" },
          { columnId: "age", direction: "asc" },
        ],
        onSortChange,
      });
      click("Age");
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "desc" }]);
    });

    it("adds a column with Shift-click, cycles it in place, and removes it, keeping the others", () => {
      const onSortChange = vi.fn();
      renderMembers({ onSortChange });
      click("Team");
      click("Age", { shiftKey: true });
      expect(onSortChange).toHaveBeenLastCalledWith([
        { columnId: "team", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ]);
      expect(names()).toEqual(["Joan", "Alan", "Ada", "Grace"]);

      click("Team", { shiftKey: true });
      expect(onSortChange).toHaveBeenLastCalledWith([
        { columnId: "team", direction: "desc" },
        { columnId: "age", direction: "asc" },
      ]);
      expect(names()).toEqual(["Grace", "Ada", "Joan", "Alan"]);

      click("Team", { shiftKey: true });
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "asc" }]);
      expect(names()).toEqual(["Ada", "Joan", "Alan", "Grace"]);
    });

    describe("from the keyboard", () => {
      // jsdom does not activate a button from a key, so each test sends the keydown and then the
      // click a browser's activation dispatches: a click with a count of 0 that may not carry
      // the key's modifiers.
      function press(name: string, key: string, shiftKey: boolean) {
        const button = sortButton(name);
        fireEvent.keyDown(button, { key, shiftKey });
        if (key === " ") fireEvent.keyUp(button, { key, shiftKey });
        fireEvent.click(button, { detail: 0 });
      }

      it("cycles and replaces with Enter and Space", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange, defaultSort: [{ columnId: "team", direction: "asc" }] });
        press("Name", "Enter", false);
        expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "name", direction: "asc" }]);
        press("Name", " ", false);
        expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "name", direction: "desc" }]);
      });

      it("adds with Shift+Enter and Shift+Space", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange, defaultSort: [{ columnId: "team", direction: "asc" }] });
        press("Name", "Enter", true);
        expect(onSortChange).toHaveBeenLastCalledWith([
          { columnId: "team", direction: "asc" },
          { columnId: "name", direction: "asc" },
        ]);
        press("Age", " ", true);
        expect(onSortChange).toHaveBeenLastCalledWith([
          { columnId: "team", direction: "asc" },
          { columnId: "name", direction: "asc" },
          { columnId: "age", direction: "asc" },
        ]);
      });

      it("adds when the activating click itself carries Shift", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange, defaultSort: [{ columnId: "team", direction: "asc" }] });
        fireEvent.keyDown(sortButton("Name"), { key: "Enter", shiftKey: true });
        fireEvent.click(sortButton("Name"), { detail: 0, shiftKey: true });
        expect(onSortChange).toHaveBeenLastCalledWith([
          { columnId: "team", direction: "asc" },
          { columnId: "name", direction: "asc" },
        ]);
      });

      it("ignores Shift on keys that do not activate the button", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange, defaultSort: [{ columnId: "team", direction: "asc" }] });
        press("Name", "a", true);
        expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "name", direction: "asc" }]);
      });

      it("does not carry Shift from a key that activated nothing into a later pointer click", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange, defaultSort: [{ columnId: "team", direction: "asc" }] });
        fireEvent.keyDown(sortButton("Name"), { key: " ", shiftKey: true });
        click("Age");
        expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "asc" }]);
      });

      it("does not carry Shift from one activation into the next", () => {
        const onSortChange = vi.fn();
        renderMembers({ onSortChange });
        press("Name", "Enter", true);
        fireEvent.click(sortButton("Age"), { detail: 0 });
        expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "asc" }]);
      });
    });

    it("shows each sorted column's priority only while more than one column is sorted", () => {
      renderMembers({ defaultSort: [{ columnId: "team", direction: "asc" }] });
      expect(screen.getByRole("table").querySelector(".vpg-data-table-sort-priority")).toBeNull();

      click("Age", { shiftKey: true });
      const team = header("Team").querySelector(".vpg-data-table-sort-priority");
      const age = header("Age").querySelector(".vpg-data-table-sort-priority");
      expect(team?.textContent).toBe("1, sort priority 1");
      expect(age?.textContent).toBe("2, sort priority 2");
      expect(team?.firstElementChild).toHaveAttribute("aria-hidden", "true");
      expect(team?.lastElementChild).toHaveClass("vpg-data-table-visually-hidden");
      expect(header("Name").querySelector(".vpg-data-table-sort-priority")).toBeNull();
      expect(sortButton("Age")).toHaveAccessibleName("Age, sort priority 2");

      click("Team", { shiftKey: true });
      click("Team", { shiftKey: true });
      expect(screen.getByRole("table").querySelector(".vpg-data-table-sort-priority")).toBeNull();
    });

    it("marks every sorted column's header with aria-sort and leaves the others without it", () => {
      renderMembers({
        defaultSort: [
          { columnId: "team", direction: "desc" },
          { columnId: "name", direction: "asc" },
        ],
      });
      expect(header("Team")).toHaveAttribute("aria-sort", "descending");
      expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
      expect(header("Age")).not.toHaveAttribute("aria-sort");
    });

    it("renders a plain header for a column with sortable: false and ignores its sort entry", () => {
      const onSortChange = vi.fn();
      render(
        <DataTable
          columns={[
            { accessor: "name", header: "Name", sortable: false },
            { accessor: "age", header: "Age" },
          ]}
          rows={members}
          defaultSort={[{ columnId: "name", direction: "asc" }]}
          onSortChange={onSortChange}
        />,
      );
      const name = header("Name");
      expect(within(name).queryByRole("button")).toBeNull();
      expect(name).toHaveTextContent("Name");
      expect(name).not.toHaveAttribute("aria-sort");
      expect(name).not.toHaveClass("vpg-data-table-sortable");
      expect(names()).toEqual(["Grace", "Ada", "Alan", "Joan"]);
      expect(within(header("Age")).getByRole("button")).toBeInTheDocument();
    });

    it("draws the sort it is passed and changes it only through onSortChange when controlled", () => {
      const onSortChange = vi.fn<(sort: DataTableSortState) => void>();
      const sort: DataTableSortState = [{ columnId: "age", direction: "desc" }];
      const { rerender } = renderMembers({ sort, onSortChange });
      expect(names()).toEqual(["Grace", "Alan", "Ada", "Joan"]);

      click("Name");
      expect(onSortChange).toHaveBeenCalledWith([{ columnId: "name", direction: "asc" }]);
      expect(names()).toEqual(["Grace", "Alan", "Ada", "Joan"]);
      expect(header("Age")).toHaveAttribute("aria-sort", "descending");
      expect(header("Name")).not.toHaveAttribute("aria-sort");

      const next = onSortChange.mock.calls[0]?.[0] as DataTableSortState;
      rerender(
        <DataTable columns={memberColumns} rows={members} getRowId={(member) => member.id} sort={next} onSortChange={onSortChange} />,
      );
      expect(names()).toEqual(["Ada", "Alan", "Grace", "Joan"]);
      expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
      expect(header("Age")).not.toHaveAttribute("aria-sort");
    });

    it("never mutates the sort it is passed", () => {
      const sort: DataTableSortState = [
        { columnId: "team", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ];
      const snapshot = structuredClone(sort);
      renderMembers({ sort, onSortChange: vi.fn() });
      click("Age", { shiftKey: true });
      click("Team", { shiftKey: true });
      click("Name");
      expect(sort).toEqual(snapshot);
    });

    it("starts from defaultSort when uncontrolled and holds each change itself", () => {
      const onSortChange = vi.fn();
      renderMembers({ defaultSort: [{ columnId: "age", direction: "asc" }], onSortChange });
      expect(names()).toEqual(["Ada", "Joan", "Alan", "Grace"]);
      click("Age");
      expect(onSortChange).toHaveBeenLastCalledWith([{ columnId: "age", direction: "desc" }]);
      expect(names()).toEqual(["Grace", "Alan", "Ada", "Joan"]);
    });

    it("leaves the row order alone when manual, while the header still follows the sort", () => {
      const onSortChange = vi.fn();
      renderMembers({ manual: true, defaultSort: [{ columnId: "team", direction: "asc" }], onSortChange });
      expect(names()).toEqual(["Grace", "Ada", "Alan", "Joan"]);
      expect(header("Team")).toHaveAttribute("aria-sort", "ascending");

      click("Age", { shiftKey: true });
      expect(onSortChange).toHaveBeenLastCalledWith([
        { columnId: "team", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ]);
      expect(names()).toEqual(["Grace", "Ada", "Alan", "Joan"]);
      expect(header("Age")).toHaveAttribute("aria-sort", "ascending");
      expect(indicator("Age")).toHaveAttribute("data-direction", "asc");
      expect(header("Age").querySelector(".vpg-data-table-sort-priority")).not.toBeNull();
    });

    it("ignores entries for unknown columns and repeated entries for a column, and keeps them through Shift-click", () => {
      const onSortChange = vi.fn();
      renderMembers({
        defaultSort: [
          { columnId: "missing", direction: "asc" },
          { columnId: "age", direction: "desc" },
          { columnId: "age", direction: "asc" },
        ],
        onSortChange,
      });
      expect(names()).toEqual(["Grace", "Alan", "Ada", "Joan"]);
      expect(header("Age")).toHaveAttribute("aria-sort", "descending");
      expect(screen.getByRole("table").querySelector(".vpg-data-table-sort-priority")).toBeNull();

      click("Name", { shiftKey: true });
      expect(onSortChange).toHaveBeenLastCalledWith([
        { columnId: "missing", direction: "asc" },
        { columnId: "age", direction: "desc" },
        { columnId: "age", direction: "asc" },
        { columnId: "name", direction: "asc" },
      ]);
      expect(header("Name").querySelector(".vpg-data-table-sort-priority")?.textContent).toBe("2, sort priority 2");
    });

    it("puts an end-aligned column's sort button inside its end-aligned header", () => {
      renderMembers();
      const age = header("Age");
      expect(age).toHaveClass("vpg-table-align-end");
      expect(sortButton("Age").parentElement).toBe(age);
    });

    it("hands a cell renderer the row's index in rows, not its sorted position", () => {
      const seen: [string, number][] = [];
      render(
        <DataTable
          columns={[
            {
              accessor: "name",
              header: "Name",
              cell: ({ row, rowIndex }: DataTableCellContext<Member>) => {
                seen.push([row.name, rowIndex]);
                return row.name;
              },
            },
          ]}
          rows={members}
          defaultSort={[{ columnId: "name", direction: "desc" }]}
        />,
      );
      expect(names()).toEqual(["Joan", "Grace", "Alan", "Ada"]);
      expect(new Map(seen)).toEqual(
        new Map([
          ["Grace", 0],
          ["Ada", 1],
          ["Alan", 2],
          ["Joan", 3],
        ]),
      );
    });

    it("hands a cell renderer null as null while sorting", () => {
      const cell = vi.fn(({ value }: DataTableCellContext<Person>) => String(value));
      render(
        <DataTable
          columns={[{ accessor: "email", header: "Email", cell }]}
          rows={people}
          defaultSort={[{ columnId: "email", direction: "asc" }]}
        />,
      );
      expect(cell).toHaveBeenCalledWith({ row: people[1], value: null, rowIndex: 1 });
    });
  });

  describe("loading and empty states", () => {
    function skeletonRows(): HTMLElement[] {
      return Array.from(screen.getByRole("table").querySelectorAll<HTMLElement>("tbody tr"));
    }

    it("sets aria-busy on the table and draws five skeleton rows by default", () => {
      renderDataTable({ loading: true });
      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
      const rows = skeletonRows();
      expect(rows).toHaveLength(5);
      for (const row of rows) {
        expect(row.querySelectorAll("td")).toHaveLength(3);
        for (const cell of Array.from(row.querySelectorAll("td"))) {
          expect(cell.querySelectorAll(".vpg-skeleton")).toHaveLength(1);
        }
      }
    });

    it("hides the skeleton rows from assistive technology", () => {
      renderDataTable({ loading: true });
      for (const row of skeletonRows()) expect(row).toHaveAttribute("aria-hidden", "true");
      expect(bodyRows()).toHaveLength(0);
    });

    it("keeps each skeleton cell's column alignment", () => {
      renderDataTable({ loading: true, loadingRowCount: 1 });
      const cells = skeletonRows()[0]?.querySelectorAll("td") as NodeListOf<HTMLElement>;
      expect(cells[1]).toHaveClass("vpg-table-align-end");
    });

    it("draws loadingRowCount skeleton rows", () => {
      renderDataTable({ loading: true, loadingRowCount: 2 });
      expect(skeletonRows()).toHaveLength(2);
    });

    it("draws no skeleton rows for a count of 0, a negative count or a non-finite count", () => {
      for (const loadingRowCount of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
        const { unmount } = renderDataTable({ loading: true, loadingRowCount });
        expect(skeletonRows()).toHaveLength(0);
        expect(screen.queryByText("No results")).toBeNull();
        unmount();
      }
    });

    it("truncates a fractional loadingRowCount", () => {
      renderDataTable({ loading: true, loadingRowCount: 2.9 });
      expect(skeletonRows()).toHaveLength(2);
    });

    it("replaces existing rows with the skeleton rows", () => {
      renderDataTable({ loading: true, loadingRowCount: 1 });
      expect(screen.queryByText("Ada")).toBeNull();
      expect(skeletonRows()).toHaveLength(1);
    });

    it("keeps the headers and working sort buttons while loading", () => {
      const onSortChange = vi.fn();
      renderDataTable({ loading: true, onSortChange });
      expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Name", "Age", "Initial"]);
      fireEvent.click(screen.getByRole("button", { name: "Name" }), { detail: 1 });
      expect(onSortChange).toHaveBeenCalledWith([{ columnId: "name", direction: "asc" }]);
    });

    it("leaves aria-busy off when not loading and keeps one the caller passes", () => {
      const { unmount } = renderDataTable();
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
      unmount();
      renderDataTable({ "aria-busy": true });
      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    });

    it("renders a default empty row spanning every column when there are no rows", () => {
      renderDataTable({ rows: [] });
      const rows = bodyRows();
      expect(rows).toHaveLength(1);
      const cell = within(rows[0] as HTMLElement).getByRole("cell");
      expect(cell).toHaveTextContent("No results");
      expect(cell).toHaveAttribute("colspan", "3");
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    });

    it("renders a custom emptyState node", () => {
      renderDataTable({ rows: [], emptyState: <em>Nobody here</em> });
      const cell = within(bodyRows()[0] as HTMLElement).getByRole("cell");
      expect(cell.querySelector("em")).toHaveTextContent("Nobody here");
      expect(screen.queryByText("No results")).toBeNull();
    });

    it("does not show the emptyState while loading", () => {
      renderDataTable({ rows: [], loading: true, emptyState: "Nothing" });
      expect(screen.queryByText("Nothing")).toBeNull();
      expect(skeletonRows()).toHaveLength(5);
    });

    it("does not show the emptyState when there are rows", () => {
      renderDataTable({ emptyState: "Nothing" });
      expect(screen.queryByText("Nothing")).toBeNull();
      expect(bodyRows()).toHaveLength(2);
    });

    it("spans one column, never zero, when there are no columns", () => {
      render(<DataTable columns={[]} rows={[]} />);
      expect(screen.getByText("No results")).toHaveAttribute("colspan", "1");
    });
  });
});
