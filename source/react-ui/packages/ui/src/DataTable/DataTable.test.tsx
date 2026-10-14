import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { Scope, ScopeProvider } from "@vipengele/react-telemetry";
import { createRef, StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DataTable,
  type DataTableCellContext,
  type DataTableColumn,
  type DataTableProps,
  type DataTablePropsOmit,
  type DataTableSortDirection,
  type DataTableSortState,
} from "./DataTable.js";
import { type LoadMoreState, loadMoreState, windowedRowCounts } from "./rowCounts.js";

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

function renderDataTable(props: StaticProps<Person> = {}) {
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

    function renderMembers(props: StaticProps<Member> = {}) {
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

  describe("selection", () => {
    interface Member {
      id: string;
      name: string;
      age: number;
    }

    const members: Member[] = [
      { id: "m-grace", name: "Grace", age: 85 },
      { id: "m-ada", name: "Ada", age: 36 },
      { id: "m-alan", name: "Alan", age: 41 },
    ];

    const memberColumns: DataTableColumn<Member>[] = [
      { accessor: "name", header: "Name" },
      { accessor: "age", header: "Age" },
    ];

    function renderMembers(props: StaticProps<Member> = {}) {
      return render(<DataTable columns={memberColumns} rows={members} getRowId={(member) => member.id} {...props} />);
    }

    function rowOf(name: string): HTMLElement {
      const found = bodyRows().find((row) => within(row).queryByText(name) !== null);
      if (found === undefined) throw new Error(`No row ${name}`);
      return found;
    }

    function control(name: string): HTMLInputElement {
      return rowOf(name).querySelector("td.vpg-data-table-select input") as HTMLInputElement;
    }

    function selectedNames(): string[] {
      return bodyRows()
        .filter((row) => (row.querySelector("td.vpg-data-table-select input") as HTMLInputElement).checked)
        .map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");
    }

    function names(): string[] {
      return bodyRows().map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");
    }

    it("renders no selection column by default", () => {
      renderMembers({ defaultSelectedRowIds: ["m-ada"] });
      expect(screen.getAllByRole("columnheader")).toHaveLength(2);
      expect(screen.getByRole("table").querySelector(".vpg-data-table-select")).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(screen.queryByRole("radio")).toBeNull();
    });

    it("leads every row with a checkbox in multiple mode, checked for the selected ids", () => {
      renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-ada", "m-alan"] });
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(3);
      expect(headers[0]).toHaveClass("vpg-data-table-select");
      expect(within(headers[0] as HTMLElement).getAllByRole("checkbox")).toHaveLength(1);
      for (const row of bodyRows()) {
        expect(within(row).getAllByRole("cell")[0]).toHaveClass("vpg-data-table-select");
        expect(within(row).getAllByRole("checkbox")).toHaveLength(1);
      }
      expect(selectedNames()).toEqual(["Ada", "Alan"]);
    });

    it("adds and removes rows in multiple mode, reporting the ids with a new one at the end", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-alan"], onSelectionChange });
      fireEvent.click(control("Grace"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-alan", "m-grace"]);
      expect(selectedNames()).toEqual(["Grace", "Alan"]);

      fireEvent.click(control("Ada"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-alan", "m-grace", "m-ada"]);

      fireEvent.click(control("Alan"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-grace", "m-ada"]);
      expect(selectedNames()).toEqual(["Grace", "Ada"]);
      expect(onSelectionChange).toHaveBeenCalledTimes(3);
    });

    it("leads every row with one radio group in single mode, where selecting a row replaces the selection", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "single", defaultSelectedRowIds: ["m-ada"], onSelectionChange });
      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      expect(radios).toHaveLength(3);
      expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
      expect(radios[0]?.name).not.toBe("");
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(selectedNames()).toEqual(["Ada"]);

      fireEvent.click(control("Alan"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-alan"]);
      expect(selectedNames()).toEqual(["Alan"]);
    });

    it("replaces every id, ids naming no row included, when a row is selected in single mode", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "single", selectedRowIds: ["m-gone", "m-ada"], onSelectionChange });
      fireEvent.click(control("Grace"));
      expect(onSelectionChange).toHaveBeenCalledWith(["m-grace"]);
    });

    it("gives each single-mode table its own radio group", () => {
      render(
        <>
          <DataTable columns={memberColumns} rows={members} selectionMode="single" />
          <DataTable columns={memberColumns} rows={members} selectionMode="single" />
        </>,
      );
      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      expect(new Set(radios.map((radio) => radio.name)).size).toBe(2);
    });

    it("draws the selection it is passed and changes it only through onSelectionChange when controlled", () => {
      const onSelectionChange = vi.fn<(ids: string[]) => void>();
      const { rerender } = renderMembers({ selectionMode: "multiple", selectedRowIds: ["m-ada"], onSelectionChange });
      fireEvent.click(control("Grace"));
      expect(onSelectionChange).toHaveBeenCalledWith(["m-ada", "m-grace"]);
      expect(selectedNames()).toEqual(["Ada"]);

      const next = onSelectionChange.mock.calls[0]?.[0] as string[];
      rerender(
        <DataTable
          columns={memberColumns}
          rows={members}
          getRowId={(member) => member.id}
          selectionMode="multiple"
          selectedRowIds={next}
          onSelectionChange={onSelectionChange}
        />,
      );
      expect(selectedNames()).toEqual(["Grace", "Ada"]);

      fireEvent.click(control("Ada"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-grace"]);
      expect(selectedNames()).toEqual(["Grace", "Ada"]);
    });

    it("holds each change itself when uncontrolled, starting from no selection", () => {
      renderMembers({ selectionMode: "multiple" });
      expect(selectedNames()).toEqual([]);
      fireEvent.click(control("Alan"));
      fireEvent.click(control("Grace"));
      expect(selectedNames()).toEqual(["Grace", "Alan"]);
    });

    it("never mutates the selection it is passed", () => {
      const selectedRowIds = ["m-ada"];
      renderMembers({ selectionMode: "multiple", selectedRowIds, onSelectionChange: vi.fn() });
      fireEvent.click(control("Grace"));
      fireEvent.click(control("Ada"));
      expect(selectedRowIds).toEqual(["m-ada"]);
    });

    it("counts a repeated id once and keeps ids naming no row through a change", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "multiple", selectedRowIds: ["m-ada", "m-gone", "m-ada"], onSelectionChange });
      expect(selectedNames()).toEqual(["Ada"]);
      fireEvent.click(control("Alan"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-ada", "m-gone", "m-alan"]);
      fireEvent.click(control("Ada"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-gone"]);
    });

    it("keeps the selection with its rows across sort changes", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-ada"], onSelectionChange });
      fireEvent.click(control("Grace"));
      const nameSort = within(screen.getAllByRole("columnheader")[1] as HTMLElement).getByRole("button");
      fireEvent.click(nameSort, { detail: 1 });
      expect(names()).toEqual(["Ada", "Alan", "Grace"]);
      expect(selectedNames()).toEqual(["Ada", "Grace"]);
      fireEvent.click(nameSort, { detail: 1 });
      expect(names()).toEqual(["Grace", "Alan", "Ada"]);
      expect(selectedNames()).toEqual(["Grace", "Ada"]);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);

      fireEvent.click(control("Alan"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["m-ada", "m-grace", "m-alan"]);
      expect(selectedNames()).toEqual(["Grace", "Alan", "Ada"]);
    });

    it("keys the selection by row index when getRowId is not passed", () => {
      const onSelectionChange = vi.fn();
      render(<DataTable columns={memberColumns} rows={members} selectionMode="multiple" onSelectionChange={onSelectionChange} />);
      fireEvent.click(control("Alan"));
      expect(onSelectionChange).toHaveBeenCalledWith(["2"]);
    });

    function selectAll(): HTMLInputElement {
      return screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    }

    function sortByName() {
      const nameSort = within(screen.getAllByRole("columnheader")[1] as HTMLElement).getByRole("button");
      fireEvent.click(nameSort, { detail: 1 });
    }

    describe("accessible names", () => {
      it("names each row's control by its index in rows, whatever order a sort draws it in", () => {
        renderMembers({ selectionMode: "multiple" });
        sortByName();
        expect(names()).toEqual(["Ada", "Alan", "Grace"]);
        expect(control("Ada")).toHaveAccessibleName("Select row 2");
        expect(control("Alan")).toHaveAccessibleName("Select row 3");
        expect(control("Grace")).toHaveAccessibleName("Select row 1");
      });

      it("names each row's control with selectRowLabel, given the row and its index in rows", () => {
        const selectRowLabel = vi.fn((member: Member, rowIndex: number) => `Pick ${member.name} (${rowIndex})`);
        renderMembers({ selectionMode: "single", selectRowLabel });
        expect(screen.getByRole("radio", { name: "Pick Ada (1)" })).toBe(control("Ada"));
        expect(screen.getByRole("radio", { name: "Pick Alan (2)" })).toBe(control("Alan"));
        expect(selectRowLabel).toHaveBeenCalledWith(members[0], 0);
      });

      it("names the select-all checkbox, overridable with selectAllLabel", () => {
        const { unmount } = renderMembers({ selectionMode: "multiple" });
        expect(selectAll().closest("th")).toBe(screen.getAllByRole("columnheader")[0]);
        unmount();
        renderMembers({ selectionMode: "multiple", selectAllLabel: "Alle auswählen" });
        expect(screen.getByRole("checkbox", { name: "Alle auswählen" }).closest("th")).not.toBeNull();
      });

      it("names the single-mode column header with visually hidden text and holds no control there", () => {
        const { unmount } = renderMembers({ selectionMode: "single" });
        const header = screen.getAllByRole("columnheader")[0] as HTMLElement;
        expect(header).toHaveAccessibleName("Selection");
        expect(within(header).getByText("Selection")).toHaveClass("vpg-data-table-visually-hidden");
        expect(within(header).queryByRole("checkbox")).toBeNull();
        expect(within(header).queryByRole("radio")).toBeNull();
        unmount();
        renderMembers({ selectionMode: "single", selectionColumnLabel: "Auswahl" });
        expect(screen.getAllByRole("columnheader")[0]).toHaveAccessibleName("Auswahl");
      });
    });

    describe("the select-all checkbox", () => {
      it("is unchecked with no rows selected, indeterminate with some and checked with all", () => {
        const { rerender } = renderMembers({ selectionMode: "multiple", selectedRowIds: [] });
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(false);

        rerender(
          <DataTable
            columns={memberColumns}
            rows={members}
            getRowId={(member) => member.id}
            selectionMode="multiple"
            selectedRowIds={["m-ada"]}
          />,
        );
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(true);

        rerender(
          <DataTable
            columns={memberColumns}
            rows={members}
            getRowId={(member) => member.id}
            selectionMode="multiple"
            selectedRowIds={["m-ada", "m-grace", "m-alan"]}
          />,
        );
        expect(selectAll().checked).toBe(true);
        expect(selectAll().indeterminate).toBe(false);
      });

      it("counts only ids naming a drawn row toward its state", () => {
        renderMembers({ selectionMode: "multiple", selectedRowIds: ["m-gone"] });
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(false);
      });

      it("selects every drawn row in drawn order, keeping ids naming no drawn row", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-gone", "m-alan"], onSelectionChange });
        sortByName();
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["m-gone", "m-alan", "m-ada", "m-grace"]);
        expect(selectedNames()).toEqual(["Ada", "Alan", "Grace"]);
        expect(selectAll().checked).toBe(true);
      });

      it("selects every drawn row from the indeterminate state", () => {
        renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-ada"] });
        expect(selectAll().indeterminate).toBe(true);
        fireEvent.click(selectAll());
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
      });

      it("deselects every drawn row once all are selected, keeping ids naming no drawn row", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", selectedRowIds: ["m-alan", "m-gone", "m-ada", "m-grace"], onSelectionChange });
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenCalledWith(["m-gone"]);
      });

      it("is disabled and unchecked while no rows are drawn, empty or loading", () => {
        const { unmount } = renderMembers({ selectionMode: "multiple", rows: [], defaultSelectedRowIds: ["m-ada"] });
        expect(selectAll()).toBeDisabled();
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(false);
        unmount();
        renderMembers({ selectionMode: "multiple", loading: true, defaultSelectedRowIds: ["m-ada", "m-grace", "m-alan"] });
        expect(selectAll()).toBeDisabled();
        expect(selectAll().checked).toBe(false);
      });

      it("is enabled while rows are drawn", () => {
        renderMembers({ selectionMode: "multiple" });
        expect(selectAll()).toBeEnabled();
      });
    });

    describe("the order of reported ids", () => {
      // Integer-like ids, which a record lists in ascending numeric order whatever order they were added in.
      const numericId = (member: Member) => String(members.indexOf(member));

      it("reports select-all in drawn order for the default row ids on a sorted table", () => {
        const onSelectionChange = vi.fn();
        render(<DataTable columns={memberColumns} rows={members} selectionMode="multiple" onSelectionChange={onSelectionChange} />);
        sortByName();
        expect(names()).toEqual(["Ada", "Alan", "Grace"]);
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["1", "2", "0"]);
      });

      it("reports a Shift-range in drawn order for numeric-string row ids on a sorted table", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", getRowId: numericId, onSelectionChange });
        sortByName();
        fireEvent.click(control("Ada"));
        fireEvent.click(control("Grace"), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith(["1", "2", "0"]);
      });

      it("keeps ids already selected in their order and follows them with the added ones in drawn order", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", getRowId: numericId, defaultSelectedRowIds: ["2"], onSelectionChange });
        sortByName();
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["2", "1", "0"]);
      });

      it("keeps selected ids naming no drawn row ahead of the added ones, in their selection order", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", getRowId: numericId, defaultSelectedRowIds: ["9", "2"], onSelectionChange });
        sortByName();
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["9", "2", "1", "0"]);
      });
    });

    describe("range selection", () => {
      it("gives every row from the last toggled one to a Shift-clicked one, in drawn order, the last toggle's state", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", onSelectionChange });
        sortByName();
        expect(names()).toEqual(["Ada", "Alan", "Grace"]);
        fireEvent.click(control("Ada"));
        fireEvent.click(control("Grace"), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith(["m-ada", "m-alan", "m-grace"]);
        expect(selectedNames()).toEqual(["Ada", "Alan", "Grace"]);
      });

      it("ranges upward as well as downward", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Alan"));
        fireEvent.click(control("Grace"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
      });

      it("applies a deselecting toggle's state to the range, whatever the clicked row's own state", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-grace", "m-ada", "m-alan"], onSelectionChange });
        fireEvent.click(control("Grace"));
        expect(selectedNames()).toEqual(["Ada", "Alan"]);
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith([]);
        expect(selectedNames()).toEqual([]);
      });

      it("keeps a Shift-clicked row in the last toggle's state, even when the click would have cleared it", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-alan"], onSelectionChange });
        fireEvent.click(control("Grace"));
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith(["m-alan", "m-grace", "m-ada"]);
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
      });

      it("does not report a range that leaves the same rows selected", () => {
        const onSelectionChange = vi.fn();
        renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-alan", "m-ada"], onSelectionChange });
        fireEvent.click(control("Ada"));
        fireEvent.click(control("Ada"));
        expect(onSelectionChange).toHaveBeenCalledTimes(2);
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenCalledTimes(2);
        expect(selectedNames()).toEqual(["Ada", "Alan"]);
      });

      it("makes the Shift-clicked row the one the next range starts from", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        fireEvent.click(control("Ada"), { shiftKey: true });
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
      });

      it("toggles only the clicked row with Shift when no row has been toggled", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Alan"]);
      });

      it("toggles only the last toggled row itself on a Shift-click on it", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        fireEvent.click(control("Grace"), { shiftKey: true });
        expect(selectedNames()).toEqual([]);
      });

      it("toggles only the clicked row when the last toggled row is no longer drawn", () => {
        const { rerender } = renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        rerender(<DataTable columns={memberColumns} rows={members.slice(1)} getRowId={(member) => member.id} selectionMode="multiple" />);
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Alan"]);
      });

      it("starts no range from before a select-all toggle", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        fireEvent.click(selectAll());
        fireEvent.click(selectAll());
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Alan"]);
      });

      it("ranges with Shift held on the Space keydown when the click carries no modifier", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        fireEvent.keyDown(control("Alan"), { key: " ", shiftKey: true });
        fireEvent.click(control("Alan"), { detail: 0 });
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
      });

      it("does not carry Shift from a Space keydown into a pointer click or the next activation", () => {
        renderMembers({ selectionMode: "multiple" });
        fireEvent.click(control("Grace"));
        fireEvent.keyDown(control("Alan"), { key: " ", shiftKey: true });
        fireEvent.click(control("Alan"), { detail: 1 });
        expect(selectedNames()).toEqual(["Grace", "Alan"]);
        fireEvent.click(control("Ada"), { detail: 0 });
        expect(selectedNames()).toEqual(["Grace", "Ada", "Alan"]);
        fireEvent.click(control("Grace"));
        fireEvent.keyDown(control("Ada"), { key: "Enter", shiftKey: true });
        fireEvent.click(control("Alan"), { detail: 0 });
        expect(selectedNames()).toEqual(["Ada"]);
      });

      it("never ranges in single mode", () => {
        renderMembers({ selectionMode: "single" });
        fireEvent.click(control("Grace"));
        fireEvent.click(control("Alan"), { shiftKey: true });
        expect(selectedNames()).toEqual(["Alan"]);
      });
    });

    it("marks each selected row with a class and never sets aria-selected", () => {
      const { unmount } = renderMembers({ selectionMode: "multiple", defaultSelectedRowIds: ["m-ada"] });
      expect(rowOf("Ada")).toHaveClass("vpg-data-table-row-selected");
      expect(rowOf("Grace")).not.toHaveClass("vpg-data-table-row-selected");
      for (const row of bodyRows()) expect(row).not.toHaveAttribute("aria-selected");
      fireEvent.click(control("Grace"));
      expect(rowOf("Grace")).toHaveClass("vpg-data-table-row-selected");
      unmount();
      renderMembers({ defaultSelectedRowIds: ["m-ada"] });
      expect(rowOf("Ada")).not.toHaveClass("vpg-data-table-row-selected");
    });

    it("selects nothing on a click on a row outside its control", () => {
      const onSelectionChange = vi.fn();
      renderMembers({ selectionMode: "multiple", onSelectionChange });
      fireEvent.click(rowOf("Ada"));
      fireEvent.click(within(rowOf("Ada")).getByText("Ada"));
      fireEvent.click(control("Ada").closest("td") as HTMLElement);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("spans the selection column with the empty state and gives skeleton rows a selection cell", () => {
      const { unmount } = renderMembers({ selectionMode: "multiple", rows: [] });
      expect(screen.getByText("No results")).toHaveAttribute("colspan", "3");
      unmount();
      renderMembers({ selectionMode: "single", loading: true, loadingRowCount: 1 });
      const cells = screen.getByRole("table").querySelectorAll("tbody tr td");
      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveClass("vpg-data-table-select");
      expect(cells[0]?.childNodes).toHaveLength(0);
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
  describe("pagination", () => {
    interface Item {
      id: string;
      n: number;
    }

    /** Twenty-five items numbered 1 to 25, three pages at the default size of 10. */
    const items: Item[] = Array.from({ length: 25 }, (_, index) => ({ id: `item-${index + 1}`, n: index + 1 }));
    const itemColumns: DataTableColumn<Item>[] = [{ accessor: "n", header: "Number" }];

    function renderItems(props: StaticProps<Item> = {}) {
      return render(<DataTable columns={itemColumns} rows={items} getRowId={(item) => item.id} paginated {...props} />);
    }

    function drawn(): number[] {
      return bodyRows().map((row) => Number(within(row).getByRole("cell").textContent));
    }

    function range(from: number, to: number): number[] {
      return Array.from({ length: to - from + 1 }, (_, index) => from + index);
    }

    function bar(): HTMLElement {
      return screen.getByRole("navigation");
    }

    function currentPage(): string | null {
      return within(bar()).getByRole("button", { current: "page" }).textContent;
    }

    function pickPageSize(size: number) {
      fireEvent.click(within(bar()).getByRole("combobox"));
      fireEvent.click(screen.getByRole("option", { name: String(size) }));
    }

    function sortByNumber() {
      fireEvent.click(within(screen.getByRole("columnheader")).getByRole("button"), { detail: 1 });
    }

    it("draws every row and renders no bar unless paginated", () => {
      renderItems({ paginated: undefined, page: 2, pageSize: 5 });
      expect(drawn()).toEqual(range(1, 25));
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("draws the first page of 10 rows by default, with the bar below the table counting every row", () => {
      renderItems();
      expect(drawn()).toEqual(range(1, 10));
      const table = screen.getByRole("table");
      expect(table.compareDocumentPosition(bar()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(table.contains(bar())).toBe(false);
      expect(within(bar()).getByRole("status")).toHaveTextContent("1–10 of 25");
      expect(currentPage()).toBe("1");
    });

    it("moves through the pages uncontrolled, reporting each through onPageChange", () => {
      const onPageChange = vi.fn();
      renderItems({ onPageChange });
      fireEvent.click(screen.getByRole("button", { name: "Next page" }));
      expect(onPageChange).toHaveBeenLastCalledWith(2);
      expect(drawn()).toEqual(range(11, 20));
      fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
      expect(onPageChange).toHaveBeenLastCalledWith(3);
      expect(drawn()).toEqual(range(21, 25));
      expect(within(bar()).getByRole("status")).toHaveTextContent("21–25 of 25");
    });

    it("starts at defaultPage and defaultPageSize", () => {
      renderItems({ defaultPage: 2, defaultPageSize: 5 });
      expect(drawn()).toEqual(range(6, 10));
      expect(currentPage()).toBe("2");
    });

    it("draws a controlled page and changes it only through onPageChange", () => {
      const onPageChange = vi.fn();
      renderItems({ page: 2, onPageChange });
      expect(drawn()).toEqual(range(11, 20));
      fireEvent.click(screen.getByRole("button", { name: "Next page" }));
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(3);
      expect(drawn()).toEqual(range(11, 20));
      expect(currentPage()).toBe("2");
    });

    it("follows a controlled page that the parent updates", () => {
      function Controlled() {
        const [page, setPage] = useState(1);
        return <DataTable columns={itemColumns} rows={items} paginated page={page} onPageChange={setPage} />;
      }
      render(<Controlled />);
      fireEvent.click(screen.getByRole("button", { name: "Last page" }));
      expect(drawn()).toEqual(range(21, 25));
    });

    it("draws an out-of-range page clamped into range and never reports the clamp", () => {
      const onPageChange = vi.fn();
      const { rerender } = render(
        <StrictMode>
          <DataTable columns={itemColumns} rows={items} paginated page={99} onPageChange={onPageChange} />
        </StrictMode>,
      );
      expect(drawn()).toEqual(range(21, 25));
      expect(currentPage()).toBe("3");
      rerender(
        <StrictMode>
          <DataTable columns={itemColumns} rows={items.slice(0, 12)} paginated page={99} onPageChange={onPageChange} />
        </StrictMode>,
      );
      expect(drawn()).toEqual(range(11, 12));
      rerender(
        <StrictMode>
          <DataTable columns={itemColumns} rows={items} paginated page={0} onPageChange={onPageChange} />
        </StrictMode>,
      );
      expect(drawn()).toEqual(range(1, 10));
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("reads a NaN page as page 1 and a fractional page as the page it floors to", () => {
      const { rerender } = renderItems({ page: Number.NaN });
      expect(drawn()).toEqual(range(1, 10));
      rerender(<DataTable columns={itemColumns} rows={items} paginated page={2.7} />);
      expect(drawn()).toEqual(range(11, 20));
    });

    it("keeps an uncontrolled page past the end when the rows shrink, drawing the last page without reporting it", () => {
      const onPageChange = vi.fn();
      const { rerender } = renderItems({ defaultPage: 3, onPageChange });
      expect(drawn()).toEqual(range(21, 25));
      rerender(<DataTable columns={itemColumns} rows={items.slice(0, 15)} paginated defaultPage={3} onPageChange={onPageChange} />);
      expect(drawn()).toEqual(range(11, 15));
      rerender(<DataTable columns={itemColumns} rows={items} paginated defaultPage={3} onPageChange={onPageChange} />);
      expect(drawn()).toEqual(range(21, 25));
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("changes the page size from the bar, keeping the first row in view", () => {
      const onPageSizeChange = vi.fn();
      const onPageChange = vi.fn();
      renderItems({ defaultPage: 3, onPageSizeChange, onPageChange });
      pickPageSize(20);
      expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(20);
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
      expect(drawn()).toEqual(range(21, 25));
      pickPageSize(50);
      expect(onPageChange).toHaveBeenLastCalledWith(1);
      expect(drawn()).toEqual(range(1, 25));
    });

    it("draws a controlled page size and changes it only through onPageSizeChange", () => {
      const onPageSizeChange = vi.fn();
      renderItems({ pageSize: 5, onPageSizeChange, pageSizeOptions: [5, 10] });
      expect(drawn()).toEqual(range(1, 5));
      pickPageSize(10);
      expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(10);
      expect(drawn()).toEqual(range(1, 5));
    });

    it("reads a page size below one as one row per page", () => {
      renderItems({ pageSize: 0, page: 4 });
      expect(drawn()).toEqual([4]);
    });

    it("offers pageSizeOptions in the bar and starts at the first of them", () => {
      renderItems({ pageSizeOptions: [4, 8] });
      expect(drawn()).toEqual(range(1, 4));
      fireEvent.click(within(bar()).getByRole("combobox"));
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["4", "8"]);
    });

    it("starts at 10 rows per page when pageSizeOptions is empty", () => {
      renderItems({ pageSizeOptions: [] });
      expect(drawn()).toEqual(range(1, 10));
      expect(within(bar()).queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("passes the variant and every label override through to the bar", () => {
      renderItems({
        defaultPage: 2,
        paginationVariant: "simple",
        paginationLabels: {
          "aria-label": "Item pages",
          firstPageLabel: "Erste",
          previousPageLabel: "Zurück",
          nextPageLabel: "Weiter",
          lastPageLabel: "Letzte",
          pageStatusLabel: ({ page, pageCount }) => `Seite ${page} von ${pageCount}`,
        },
      });
      const nav = screen.getByRole("navigation", { name: "Item pages" });
      expect(within(nav).getByRole("status")).toHaveTextContent("Seite 2 von 3");
      expect(within(nav).getByRole("button", { name: "Zurück" })).toBeInTheDocument();
      expect(within(nav).getByRole("button", { name: "Weiter" })).toBeInTheDocument();
      expect(within(nav).queryByRole("button", { name: "Erste" })).not.toBeInTheDocument();
    });

    it("passes the full bar's label overrides through", () => {
      render(
        <DataTable
          columns={itemColumns}
          rows={[]}
          paginated
          paginationLabels={{ pageLabel: (page) => `Seite ${page}`, pageSizeLabel: "Pro Seite", emptyLabel: "Leer" }}
        />,
      );
      expect(within(bar()).getByRole("status")).toHaveTextContent("Leer");
      expect(within(bar()).getByRole("button", { name: "Seite 1" })).toBeInTheDocument();
      expect(within(bar()).getByRole("combobox", { name: "Pro Seite" })).toBeInTheDocument();
    });

    it("returns to page 1 on a header sort change, reporting the page after the sort", () => {
      const calls: string[] = [];
      renderItems({
        defaultPage: 3,
        onSortChange: (sort) => calls.push(`sort ${sort[0]?.direction}`),
        onPageChange: (page) => calls.push(`page ${page}`),
      });
      sortByNumber();
      sortByNumber();
      expect(drawn()).toEqual(range(16, 25).reverse());
      expect(currentPage()).toBe("1");
      expect(calls).toEqual(["sort asc", "page 1", "sort desc"]);
    });

    it("returns a controlled page to page 1 only through onPageChange", () => {
      const onPageChange = vi.fn();
      renderItems({ page: 2, onPageChange });
      sortByNumber();
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(1);
      expect(drawn()).toEqual(range(11, 20));
    });

    it("keeps the page on a sort change when manual", () => {
      const onPageChange = vi.fn();
      renderItems({ manual: true, defaultPage: 2, onPageChange });
      sortByNumber();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(currentPage()).toBe("2");
    });

    it("reports no page on a sort change when not paginated", () => {
      const onPageChange = vi.fn();
      renderItems({ paginated: false, defaultPage: 2, onPageChange });
      sortByNumber();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(drawn()).toEqual(range(1, 25));
    });

    it("keeps each drawn row's index in rows on later pages", () => {
      const cell = vi.fn(({ rowIndex }: DataTableCellContext<Item>) => rowIndex);
      render(<DataTable columns={[{ accessor: "n", header: "Number", cell }]} rows={items} paginated defaultPage={3} />);
      expect(bodyRows().map((row) => row.textContent)).toEqual(["20", "21", "22", "23", "24"]);
    });

    describe("selection", () => {
      const ids = (from: number, to: number) => range(from, to).map((n) => `item-${n}`);

      function renderSelectable(props: StaticProps<Item> = {}) {
        return renderItems({ selectionMode: "multiple", selectRowLabel: (item) => `Select item ${item.n}`, ...props });
      }

      function selectAll(): HTMLInputElement {
        return screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
      }

      function control(n: number): HTMLInputElement {
        return screen.getByRole("checkbox", { name: `Select item ${n}` }) as HTMLInputElement;
      }

      function checked(): number[] {
        return bodyRows()
          .filter((row) => (row.querySelector("td.vpg-data-table-select input") as HTMLInputElement).checked)
          .map((row) => Number(within(row).getAllByRole("cell")[1]?.textContent));
      }

      function goToPage(page: number) {
        fireEvent.click(within(bar()).getByRole("button", { name: `Page ${page}` }));
      }

      function sortFromHeader() {
        fireEvent.click(screen.getByRole("button", { name: "Number" }), { detail: 1 });
      }

      /** A table holding its selection in the caller, as a controlled consumer does. */
      function ControlledSelection({ onChange }: { onChange: (selected: string[]) => void }) {
        const [selected, setSelected] = useState<string[]>([]);
        return (
          <DataTable
            columns={itemColumns}
            rows={items}
            getRowId={(item) => item.id}
            selectRowLabel={(item) => `Select item ${item.n}`}
            paginated
            selectionMode="multiple"
            selectedRowIds={selected}
            onSelectionChange={(next) => {
              onChange(next);
              setSelected(next);
            }}
          />
        );
      }

      it("selects only the rows of the current page, in drawn order, keeping the ids of other pages", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ defaultSelectedRowIds: ["item-25"], onSelectionChange });
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-25", ...ids(1, 10)]);
        expect(checked()).toEqual(range(1, 10));

        goToPage(3);
        expect(checked()).toEqual([25]);
      });

      it("selects the second page's rows alone when activated there", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ defaultPage: 2, onSelectionChange });
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(ids(11, 20));
      });

      it("is checked once its page is fully selected, however the other pages stand", () => {
        renderSelectable({ selectedRowIds: ids(1, 10) });
        expect(selectAll().checked).toBe(true);
        expect(selectAll().indeterminate).toBe(false);
      });

      it("is indeterminate while part of its page is selected", () => {
        renderSelectable({ selectedRowIds: ids(1, 3) });
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(true);
      });

      it("is unchecked and not indeterminate when only another page holds selections", () => {
        renderSelectable({ selectedRowIds: ids(1, 10) });
        goToPage(2);
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(false);
      });

      it("deselects only its page's rows once they are all selected", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ defaultSelectedRowIds: [...ids(1, 10), "item-25"], onSelectionChange });
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-25"]);
        expect(checked()).toEqual([]);
      });

      it("keeps the selection across a page change when uncontrolled", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ onSelectionChange });
        fireEvent.click(control(3));
        goToPage(2);
        expect(checked()).toEqual([]);
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-3", ...ids(11, 20)]);
        goToPage(1);
        expect(checked()).toEqual([3]);
      });

      it("keeps the selection across a page change when controlled", () => {
        const onChange = vi.fn();
        render(<ControlledSelection onChange={onChange} />);
        fireEvent.click(control(3));
        goToPage(2);
        fireEvent.click(selectAll());
        expect(onChange).toHaveBeenLastCalledWith(["item-3", ...ids(11, 20)]);
        goToPage(1);
        expect(checked()).toEqual([3]);
      });

      it("keeps the selection across a page-size change, selecting the rows of the new page", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ onSelectionChange });
        fireEvent.click(control(3));
        goToPage(2);
        pickPageSize(20);
        expect(bodyRows()).toHaveLength(20);
        expect(checked()).toEqual([3]);
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-3", ...ids(1, 2), ...ids(4, 20)]);
      });

      it("covers every row passed when manual, whatever the page", () => {
        const onSelectionChange = vi.fn();
        const props = { columns: itemColumns, getRowId: (item: Item) => item.id, paginated: true, manual: true, totalItems: 100 } as const;
        const selectProps = {
          selectionMode: "multiple",
          selectRowLabel: (item: Item) => `Select item ${item.n}`,
          onSelectionChange,
        } as const;
        const { rerender } = render(<DataTable {...props} {...selectProps} rows={items.slice(0, 5)} selectedRowIds={[]} />);
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(ids(1, 5));

        rerender(<DataTable {...props} {...selectProps} rows={items.slice(5, 10)} page={2} pageSize={5} selectedRowIds={ids(1, 5)} />);
        expect(selectAll().checked).toBe(false);
        expect(selectAll().indeterminate).toBe(false);
        fireEvent.click(selectAll());
        expect(onSelectionChange).toHaveBeenLastCalledWith(ids(1, 10));
      });

      it("ranges within the page, toggling a single row when the last toggled one is on another page", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ onSelectionChange });
        fireEvent.click(control(8));
        goToPage(2);
        fireEvent.click(control(14), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-8", "item-14"]);

        fireEvent.click(control(17), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith(["item-8", ...ids(14, 17)]);
        expect(checked()).toEqual(range(14, 17));
      });

      it("returns to page 1 on a sort change while the selection stays", () => {
        const onSelectionChange = vi.fn();
        renderSelectable({ defaultPage: 2, onSelectionChange });
        fireEvent.click(control(12));
        sortFromHeader();
        expect(currentPage()).toBe("1");
        expect(checked()).toEqual([]);
        goToPage(2);
        expect(checked()).toEqual([12]);
        expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(["item-12"]);
      });
    });

    describe("manual", () => {
      /** The first five items, standing for the page a consumer fetched. */
      const fetched = items.slice(0, 5);

      function renderManual(props: StaticProps<Item> = {}) {
        return renderItems({ manual: true, rows: fetched, ...props });
      }

      function status(): string | null {
        return within(bar()).getByRole("status").textContent;
      }

      it("draws every row passed, unsliced, while the bar counts totalItems", () => {
        renderManual({ pageSize: 2, totalItems: 100 });
        expect(drawn()).toEqual(range(1, 5));
        expect(status()).toBe("1–2 of 100");
        expect(within(bar()).getByRole("button", { name: "Page 50" })).toBeInTheDocument();
      });

      it("draws the rows passed on a later page, slicing nothing", () => {
        renderManual({ pageSize: 2, defaultPage: 3, totalItems: 100 });
        expect(drawn()).toEqual(range(1, 5));
        expect(status()).toBe("5–6 of 100");
        expect(currentPage()).toBe("3");
      });

      it("clamps the page against the page count totalItems gives, never reporting the clamp", () => {
        const onPageChange = vi.fn();
        renderManual({ page: 99, totalItems: 100, onPageChange });
        expect(currentPage()).toBe("10");
        expect(status()).toBe("91–100 of 100");
        expect(drawn()).toEqual(range(1, 5));
        expect(onPageChange).not.toHaveBeenCalled();
      });

      it("reads a negative or non-finite totalItems as no rows and a fractional one as the count it floors to", () => {
        const { rerender } = renderManual({ page: 3, totalItems: Number.NaN });
        expect(status()).toBe("No items");
        expect(currentPage()).toBe("1");
        expect(drawn()).toEqual(range(1, 5));
        rerender(<DataTable columns={itemColumns} rows={fetched} manual paginated page={3} totalItems={-4} />);
        expect(status()).toBe("No items");
        rerender(<DataTable columns={itemColumns} rows={fetched} manual paginated page={3} totalItems={Number.POSITIVE_INFINITY} />);
        expect(status()).toBe("No items");
        rerender(<DataTable columns={itemColumns} rows={fetched} manual paginated page={99} totalItems={42.9} />);
        expect(status()).toBe("41–42 of 42");
        expect(currentPage()).toBe("5");
      });

      it("counts the rows passed when totalItems is omitted, drawing them all", () => {
        renderManual({ rows: items, page: 9 });
        expect(drawn()).toEqual(range(1, 25));
        expect(status()).toBe("21–25 of 25");
        expect(currentPage()).toBe("3");
      });

      it("ignores totalItems when not manual, counting and slicing rows", () => {
        renderItems({ totalItems: 100, page: 99 });
        expect(drawn()).toEqual(range(21, 25));
        expect(status()).toBe("21–25 of 25");
        expect(currentPage()).toBe("3");
      });

      it("moves an uncontrolled page from the bar and reports it, leaving the rows to the consumer", () => {
        const onPageChange = vi.fn();
        const onPageSizeChange = vi.fn();
        renderManual({ totalItems: 100, onPageChange, onPageSizeChange });
        fireEvent.click(screen.getByRole("button", { name: "Next page" }));
        expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
        expect(currentPage()).toBe("2");
        expect(status()).toBe("11–20 of 100");
        expect(drawn()).toEqual(range(1, 5));
        pickPageSize(20);
        expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(20);
        expect(onPageChange).toHaveBeenLastCalledWith(1);
        expect(status()).toBe("1–20 of 100");
        expect(drawn()).toEqual(range(1, 5));
      });

      it("draws each page the consumer fetches in answer to onPageChange", () => {
        function Server() {
          const [page, setPage] = useState(1);
          return (
            <DataTable
              columns={itemColumns}
              rows={items.slice((page - 1) * 10, page * 10)}
              manual
              paginated
              totalItems={items.length}
              page={page}
              onPageChange={setPage}
            />
          );
        }
        render(<Server />);
        expect(drawn()).toEqual(range(1, 10));
        fireEvent.click(screen.getByRole("button", { name: "Next page" }));
        expect(drawn()).toEqual(range(11, 20));
        expect(status()).toBe("11–20 of 25");
        fireEvent.click(screen.getByRole("button", { name: "Last page" }));
        expect(drawn()).toEqual(range(21, 25));
      });

      it("neither reorders the rows nor moves the page on a sort change", () => {
        const onSortChange = vi.fn();
        const onPageChange = vi.fn();
        renderManual({ rows: [...fetched].reverse(), defaultPage: 2, totalItems: 100, onSortChange, onPageChange });
        sortByNumber();
        expect(onSortChange).toHaveBeenCalledExactlyOnceWith([{ columnId: "n", direction: "asc" }]);
        expect(drawn()).toEqual(range(1, 5).reverse());
        expect(currentPage()).toBe("2");
        expect(onPageChange).not.toHaveBeenCalled();
      });
    });
  });

  describe("resizable columns", () => {
    function container(): HTMLElement {
      return screen.getByRole("table").parentElement as HTMLElement;
    }

    function headerWidths(): string[] {
      return screen.getAllByRole("columnheader").map((header) => header.style.width);
    }

    const sized: DataTableColumn<Person>[] = [
      { accessor: "name", header: "Name", size: 240 },
      { accessor: "age", header: "Age", size: 10, minSize: 60, sortable: false },
      { id: "initial", accessor: (person) => person.name.charAt(0), header: "Initial", maxSize: 100, resizable: false },
    ];

    it("leaves the layout automatic when off: no class, no width property and no header width", () => {
      renderDataTable({ columns: sized, columnSizes: { name: 300 }, style: { maxBlockSize: "20rem" } });
      expect(container()).not.toHaveClass("vpg-data-table-fixed");
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("");
      expect(container().getAttribute("style")).toBe("max-block-size: 20rem;");
      for (const header of screen.getAllByRole("columnheader")) expect(header).not.toHaveAttribute("style");
    });

    it("sets each header's width from its size, clamped into its bounds, and the columns' total on the container", () => {
      renderDataTable({ columns: sized, resizableColumns: true });
      expect(container()).toHaveClass("vpg-data-table", "vpg-data-table-fixed");
      expect(headerWidths()).toEqual(["240px", "60px", "100px"]);
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("400px");
    });

    it("draws a column with no size at 150 pixels", () => {
      renderDataTable({ resizableColumns: true });
      expect(headerWidths()).toEqual(["150px", "150px", "150px"]);
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("450px");
    });

    it("draws controlled sizes clamped and never reports the clamp", () => {
      const onColumnSizesChange = vi.fn();
      const { rerender } = render(
        <DataTable
          columns={sized}
          rows={people}
          resizableColumns
          columnSizes={{ name: 5, age: 90, initial: 400, gone: 1 }}
          onColumnSizesChange={onColumnSizesChange}
        />,
      );
      expect(headerWidths()).toEqual(["20px", "90px", "100px"]);
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("210px");
      rerender(
        <DataTable columns={sized} rows={people} resizableColumns columnSizes={{ name: 320 }} onColumnSizesChange={onColumnSizesChange} />,
      );
      expect(headerWidths()).toEqual(["320px", "60px", "100px"]);
      expect(onColumnSizesChange).not.toHaveBeenCalled();
    });

    it("starts from defaultColumnSizes while uncontrolled", () => {
      renderDataTable({ columns: sized, resizableColumns: true, defaultColumnSizes: { age: 75 } });
      expect(headerWidths()).toEqual(["240px", "75px", "100px"]);
    });

    it("merges the consumer's style into the container, whose own entries win", () => {
      renderDataTable({ resizableColumns: true, style: { maxBlockSize: "20rem" } });
      expect(container().style.maxBlockSize).toBe("20rem");
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("450px");
    });

    it("leaves the selection column out of the sizes and its header without a width", () => {
      renderDataTable({ columns: sized, resizableColumns: true, selectionMode: "multiple", getRowId: (person) => person.id });
      const [selection, ...data] = screen.getAllByRole("columnheader");
      expect(selection).toHaveClass("vpg-data-table-select");
      expect(selection).not.toHaveAttribute("style");
      expect(data.map((header) => header.style.width)).toEqual(["240px", "60px", "100px"]);
      expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("400px");
    });

    describe("in a measured container", () => {
      function measureContainerAt(width: number) {
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
          if (this.classList.contains("vpg-table-container")) return { width } as DOMRect;
          if (this.classList.contains("vpg-data-table-select")) return { width: 44 } as DOMRect;
          return { width: 0 } as DOMRect;
        });
      }

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("shares a wider container among the data columns in proportion to their sizes, up to each maxSize", () => {
        measureContainerAt(600);
        const onColumnSizesChange = vi.fn();
        renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
        // The third, with resizable: false, keeps its 100; 240 and 60 share the other 200 4:1.
        expect(headerWidths()).toEqual(["400px", "100px", "100px"]);
        expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("600px");
        expect(onColumnSizesChange).not.toHaveBeenCalled();
      });

      it("leaves the selection column out of the share", () => {
        measureContainerAt(644);
        renderDataTable({ columns: sized, resizableColumns: true, selectionMode: "multiple", getRowId: (person) => person.id });
        const [selection, ...data] = screen.getAllByRole("columnheader");
        expect(selection).not.toHaveAttribute("style");
        expect(data.map((header) => header.style.width)).toEqual(["400px", "100px", "100px"]);
        expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("600px");
      });

      it("keeps the sizes in a narrower container", () => {
        measureContainerAt(300);
        renderDataTable({ columns: sized, resizableColumns: true });
        expect(headerWidths()).toEqual(["240px", "60px", "100px"]);
        expect(container().style.getPropertyValue("--vpg-data-table-columns-width")).toBe("400px");
      });

      it("measures nothing without resizableColumns", () => {
        measureContainerAt(600);
        renderDataTable({ columns: sized });
        for (const header of screen.getAllByRole("columnheader")) expect(header).not.toHaveAttribute("style");
      });
    });

    describe("resize handles", () => {
      function handle(name: string): HTMLElement {
        return screen.getByRole("separator", { name: `Resize ${name}` });
      }

      /** Fires a pointer event at the handle; jsdom implements no pointer capture, so every event
       * is fired at the handle as a captured pointer's would be. */
      function pointer(
        type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel" | "lostPointerCapture",
        target: Element,
        {
          x = 0,
          pointerId = 1,
          pointerType = "mouse",
          button = 0,
        }: { x?: number; pointerId?: number; pointerType?: string; button?: number } = {},
      ) {
        fireEvent(target, createEvent[type](target, { clientX: x, pointerId, pointerType, button }));
      }

      beforeEach(() => {
        (HTMLElement.prototype as unknown as Record<string, unknown>).setPointerCapture = vi.fn();
      });

      afterEach(() => {
        Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
      });

      it("puts a named, focusable vertical separator on each resizable column's header", () => {
        renderDataTable({ columns: sized, resizableColumns: true });
        const name = handle("Name");
        expect(name).toHaveAttribute("tabindex", "0");
        expect(name).toHaveAttribute("aria-orientation", "vertical");
        expect(name).toHaveAttribute("aria-valuenow", "240");
        expect(name).toHaveAttribute("aria-valuemin", "20");
        expect(name).toHaveAttribute("aria-valuemax", String(Number.MAX_SAFE_INTEGER));
        expect(name.closest("th")).toHaveClass("vpg-data-table-resizable");
        expect(name.closest("button")).toBeNull();
        const age = handle("Age");
        expect(age).toHaveAttribute("aria-valuenow", "60");
        expect(age).toHaveAttribute("aria-valuemin", "60");
        expect(screen.getAllByRole("separator")).toHaveLength(2);
      });

      it("names each resizable column's header by its content alone, never the handle's name or value", () => {
        renderDataTable({ columns: sized, resizableColumns: true, defaultSort: [{ columnId: "name", direction: "asc" }] });
        expect(screen.getAllByRole("columnheader").map((header) => header.getAttribute("aria-labelledby") !== null)).toEqual([
          true,
          true,
          false,
        ]);
        expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
        expect(screen.getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Initial" })).toBeInTheDocument();
      });

      it("names the handle after a header that is not plain text", () => {
        render(<DataTable columns={[{ accessor: "name", header: <em>Full name</em> }]} rows={people} resizableColumns />);
        expect(handle("Full name")).toBeInTheDocument();
      });

      it("gives a column with a maxSize its aria-valuemax, in whole pixels", () => {
        renderDataTable({
          columns: [{ accessor: "name", header: "Name", size: 120.4, minSize: 40.6, maxSize: 300.2 }],
          resizableColumns: true,
        });
        expect(handle("Name")).toHaveAttribute("aria-valuenow", "120");
        expect(handle("Name")).toHaveAttribute("aria-valuemin", "41");
        expect(handle("Name")).toHaveAttribute("aria-valuemax", "300");
      });

      it("puts no handle on a resizable: false column, the selection column, or a table without resizableColumns", () => {
        renderDataTable({ columns: sized, resizableColumns: true, selectionMode: "multiple", getRowId: (person) => person.id });
        const [selection, , , initial] = screen.getAllByRole("columnheader");
        expect(within(selection as HTMLElement).queryByRole("separator")).toBeNull();
        expect(within(initial as HTMLElement).queryByRole("separator")).toBeNull();
        expect(initial).not.toHaveClass("vpg-data-table-resizable");
        expect(screen.getAllByRole("separator")).toHaveLength(2);
      });

      it("draws no handle without resizableColumns", () => {
        renderDataTable({ columns: sized });
        expect(screen.queryByRole("separator")).toBeNull();
        for (const header of screen.getAllByRole("columnheader")) expect(header).not.toHaveClass("vpg-data-table-resizable");
      });

      describe("from the keyboard", () => {
        it.each([
          ["ArrowRight", false, 250],
          ["ArrowLeft", false, 230],
          ["ArrowRight", true, 290],
          ["ArrowLeft", true, 190],
          ["Home", false, 20],
        ])("resizes the column with %s, Shift %s", (key, shiftKey, width) => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          const event = createEvent.keyDown(handle("Name"), { key, shiftKey });
          fireEvent(handle("Name"), event);
          expect(event.defaultPrevented).toBe(true);
          expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ name: width });
          expect(handle("Name")).toHaveAttribute("aria-valuenow", String(width));
          expect(screen.getAllByRole("columnheader")[0]?.style.width).toBe(`${width}px`);
        });

        it("goes to the maxSize with End, and does nothing with End on a column with none", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({
            columns: [
              { accessor: "name", header: "Name", maxSize: 400 },
              { accessor: "age", header: "Age" },
            ],
            resizableColumns: true,
            onColumnSizesChange,
          });
          fireEvent.keyDown(handle("Name"), { key: "End" });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 400 });
          const event = createEvent.keyDown(handle("Age"), { key: "End" });
          fireEvent(handle("Age"), event);
          expect(event.defaultPrevented).toBe(false);
          expect(onColumnSizesChange).toHaveBeenCalledTimes(1);
        });

        it("clamps a step into the column's bounds and reports nothing once there", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          fireEvent.keyDown(handle("Age"), { key: "ArrowLeft" });
          fireEvent.keyDown(handle("Age"), { key: "Home" });
          expect(onColumnSizesChange).not.toHaveBeenCalled();
          expect(handle("Age")).toHaveAttribute("aria-valuenow", "60");
        });

        it("flips the arrows in a right-to-left table", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange, style: { direction: "rtl" } });
          fireEvent.keyDown(handle("Name"), { key: "ArrowLeft" });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 250 });
          fireEvent.keyDown(handle("Name"), { key: "ArrowRight" });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 240 });
        });

        it("keeps the keys it takes from the header and the table, and leaves every other key alone", () => {
          const onKeyDown = vi.fn();
          const onSortChange = vi.fn();
          const onColumnSizesChange = vi.fn();
          render(
            // biome-ignore lint/a11y/noStaticElementInteractions: a listener catching what bubbles out of the table
            <div onKeyDown={onKeyDown}>
              <DataTable
                columns={sized}
                rows={people}
                resizableColumns
                onSortChange={onSortChange}
                onColumnSizesChange={onColumnSizesChange}
              />
            </div>,
          );
          fireEvent.keyDown(handle("Name"), { key: "ArrowRight" });
          expect(onKeyDown).not.toHaveBeenCalled();
          for (const key of ["Enter", " ", "ArrowUp", "ArrowDown", "a"]) {
            const event = createEvent.keyDown(handle("Name"), { key });
            fireEvent(handle("Name"), event);
            expect(event.defaultPrevented).toBe(false);
          }
          expect(onKeyDown).toHaveBeenCalledTimes(5);
          expect(onColumnSizesChange).toHaveBeenCalledTimes(1);
          expect(onSortChange).not.toHaveBeenCalled();
        });

        it("steps from the width the column is drawn at in a wider container", () => {
          vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
            return { width: this.classList.contains("vpg-table-container") ? 600 : 0 } as DOMRect;
          });
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          expect(handle("Name")).toHaveAttribute("aria-valuenow", "400");
          fireEvent.keyDown(handle("Name"), { key: "ArrowRight" });
          expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ name: 410 });
          // The name column is exact at 410; age takes the 90 left beside the exact initial column.
          expect(headerWidths()).toEqual(["410px", "90px", "100px"]);
          vi.restoreAllMocks();
        });

        it("reports a controlled resize without drawing it", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, columnSizes: { age: 70, gone: 5 }, onColumnSizesChange });
          fireEvent.keyDown(handle("Name"), { key: "ArrowRight" });
          expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ age: 70, gone: 5, name: 250 });
          expect(handle("Name")).toHaveAttribute("aria-valuenow", "240");
        });
      });

      describe("with a pointer", () => {
        it("captures the pointer and resizes live from the width at the press by the distance moved", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          const name = handle("Name");
          pointer("pointerDown", name, { x: 100, pointerId: 3 });
          expect(name.setPointerCapture).toHaveBeenCalledExactlyOnceWith(3);
          pointer("pointerMove", name, { x: 130.4, pointerId: 3 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 270 });
          expect(name).toHaveAttribute("aria-valuenow", "270");
          pointer("pointerMove", name, { x: 60, pointerId: 3 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 200 });
          pointer("pointerMove", name, { x: -500, pointerId: 3 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 20 });
          expect(onColumnSizesChange).toHaveBeenCalledTimes(3);
        });

        it.each(["pointerUp", "pointerCancel", "lostPointerCapture"] as const)("ends the drag on %s", (end) => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          const name = handle("Name");
          pointer("pointerDown", name, { x: 100 });
          pointer(end, name, { x: 120, pointerId: 2 });
          pointer("pointerMove", name, { x: 110 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 250 });
          pointer(end, name, { x: 120 });
          pointer("pointerMove", name, { x: 150 });
          expect(onColumnSizesChange).toHaveBeenCalledTimes(1);
        });

        it("starts a new drag from the width the last one left", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          const name = handle("Name");
          pointer("pointerDown", name, { x: 0 });
          pointer("pointerMove", name, { x: 30 });
          pointer("pointerUp", name, { x: 30 });
          pointer("pointerDown", name, { x: 500 });
          pointer("pointerMove", name, { x: 510 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 280 });
        });

        it("ignores a move with no drag, another pointer, and a press with a secondary mouse button", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange });
          const name = handle("Name");
          pointer("pointerMove", name, { x: 50 });
          pointer("pointerDown", name, { x: 0, button: 2 });
          pointer("pointerMove", name, { x: 50 });
          expect(name.setPointerCapture).not.toHaveBeenCalled();
          pointer("pointerDown", name, { x: 0, pointerId: 1, pointerType: "touch" });
          pointer("pointerDown", name, { x: 0, pointerId: 2, pointerType: "touch" });
          pointer("pointerMove", name, { x: 50, pointerId: 2, pointerType: "touch" });
          expect(name.setPointerCapture).toHaveBeenCalledExactlyOnceWith(1);
          expect(onColumnSizesChange).not.toHaveBeenCalled();
          pointer("pointerMove", name, { x: 15, pointerId: 1, pointerType: "touch" });
          expect(onColumnSizesChange).toHaveBeenCalledExactlyOnceWith({ name: 255 });
        });

        it("drags toward the left edge to widen a column in a right-to-left table", () => {
          const onColumnSizesChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onColumnSizesChange, style: { direction: "rtl" } });
          pointer("pointerDown", handle("Name"), { x: 300 });
          pointer("pointerMove", handle("Name"), { x: 260 });
          expect(onColumnSizesChange).toHaveBeenLastCalledWith({ name: 280 });
        });

        it("never sorts on a press, drag or click on the handle", () => {
          const onSortChange = vi.fn();
          renderDataTable({ columns: sized, resizableColumns: true, onSortChange });
          const name = handle("Name");
          pointer("pointerDown", name, { x: 0 });
          pointer("pointerMove", name, { x: 20 });
          pointer("pointerUp", name, { x: 20 });
          fireEvent.click(name);
          expect(onSortChange).not.toHaveBeenCalled();
          expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute("aria-sort");
        });
      });
    });

    it("keeps sorting from a sized header", () => {
      const onSortChange = vi.fn();
      renderDataTable({ columns: sized, resizableColumns: true, onSortChange });
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      expect(onSortChange).toHaveBeenCalledExactlyOnceWith([{ columnId: "name", direction: "asc" }]);
    });
  });
});

describe("DataTable, virtualized", () => {
  interface Entry {
    id: string;
    name: string;
  }

  const entries: Entry[] = Array.from({ length: 300 }, (_, n) => ({ id: `e-${n}`, name: `Entry ${n}` }));
  const entryColumns: DataTableColumn<Entry>[] = [
    { accessor: "id", header: "Id" },
    { accessor: "name", header: "Name" },
  ];

  function renderEntries(props: HelperProps<Entry, "virtualized" | "rowHeight" | "aria-label"> = {}) {
    return render(
      <DataTable
        aria-label="Entries"
        columns={entryColumns}
        rows={entries}
        getRowId={(entry) => entry.id}
        virtualized
        rowHeight={40}
        {...props}
      />,
    );
  }

  function spacers(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>("tbody > .vpg-data-table-spacer"));
  }

  it("requires a rowHeight and a caption or aria-label", () => {
    const base = { columns: entryColumns, rows: entries };
    // @ts-expect-error -- the window is reckoned from an estimated row height, so it cannot go without one
    const withoutHeight: DataTableProps<Entry> = { ...base, virtualized: true, "aria-label": "Entries" };
    // @ts-expect-error -- the scroll region a keyboard user scrolls the window from needs a name
    const withoutName: DataTableProps<Entry> = { ...base, virtualized: true, rowHeight: 40 };
    void withoutHeight;
    void withoutName;
    const captioned: DataTableProps<Entry> = { ...base, virtualized: true, rowHeight: 40, caption: "Entries" };
    const labelled: DataTableProps<Entry> = { ...base, virtualized: true, rowHeight: 40, "aria-label": "Entries" };
    const unwindowed: DataTableProps<Entry> = { ...base, virtualized: false, rowHeight: 40 };
    for (const props of [captioned, labelled, unwindowed]) {
      const { unmount } = render(<DataTable {...props} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
      unmount();
    }
  });

  it("takes onLoadMore only with virtualized and hasMore, and never with paging", () => {
    const windowed = { columns: entryColumns, rows: entries, virtualized: true, rowHeight: 40, caption: "Entries" } as const;
    const onLoadMore = () => {};
    const flag = entries.length > 100;
    // @ts-expect-error -- the end of the rows is reckoned from the virtualizer's range, so it needs virtualized
    const unwindowed: DataTableProps<Entry> = { columns: entryColumns, rows: entries, onLoadMore, hasMore: true };
    // @ts-expect-error -- a table that is not virtualized has no range to reckon the end from
    const notVirtualized: DataTableProps<Entry> = { ...windowed, virtualized: false, onLoadMore, hasMore: true };
    // @ts-expect-error -- without hasMore the table cannot tell an exhausted source from one with rows to come
    const withoutHasMore: DataTableProps<Entry> = { ...windowed, onLoadMore };
    // @ts-expect-error -- hasMore means nothing without the callback it gates
    const withoutCallback: DataTableProps<Entry> = { ...windowed, hasMore: true };
    // @ts-expect-error -- loadingMore means nothing without the callback it holds back
    const loadingWithoutCallback: DataTableProps<Entry> = { ...windowed, loadingMore: true };
    // @ts-expect-error -- loadMoreThreshold means nothing without the callback it schedules
    const thresholdWithoutCallback: DataTableProps<Entry> = { ...windowed, loadMoreThreshold: 10 };
    // @ts-expect-error -- an infinite table draws every row it is given and never pages
    const paginated: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, paginated: true };
    // @ts-expect-error -- a paginated flag that may be true is rejected with onLoadMore
    const flagged: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, paginated: flag };
    // @ts-expect-error -- an infinite table has no page
    const page: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, page: 2 };
    // @ts-expect-error -- an infinite table has no page
    const defaultPage: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, defaultPage: 2 };
    // @ts-expect-error -- an infinite table has no page to report
    const onPageChange: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, onPageChange: () => {} };
    // @ts-expect-error -- an infinite table has no page size
    const pageSize: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, pageSize: 20 };
    // @ts-expect-error -- an infinite table has no page size
    const defaultPageSize: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, defaultPageSize: 20 };
    // @ts-expect-error -- an infinite table has no page size to report
    const onPageSizeChange: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, onPageSizeChange: () => {} };
    // @ts-expect-error -- an infinite table has no page-size field
    const pageSizeOptions: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, pageSizeOptions: [10, 20] };
    // @ts-expect-error -- an infinite table has no pagination bar
    const paginationVariant: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, paginationVariant: "simple" };
    // @ts-expect-error -- an infinite table has no pagination bar
    const paginationLabels: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true, paginationLabels: {} };
    const paginatedElement = (
      // @ts-expect-error -- the JSX form rejects a paginated flag with onLoadMore as the object form does
      <DataTable {...windowed} onLoadMore={onLoadMore} hasMore paginated={flag} />
    );
    const infinite: DataTableProps<Entry> = { ...windowed, onLoadMore, hasMore: true };
    const tuned: DataTableProps<Entry> = {
      ...windowed,
      onLoadMore,
      hasMore: false,
      loadingMore: true,
      loadMoreThreshold: 10,
      totalItems: 900,
      paginated: false,
      manual: true,
    };
    const infiniteElement = <DataTable {...windowed} onLoadMore={onLoadMore} hasMore={flag} loadingMore={flag} />;
    const windowedPages: DataTableProps<Entry> = { ...windowed, paginated: flag, page: 2, pageSize: 20, onPageChange: () => {} };
    const plainPages: DataTableProps<Entry> = { columns: entryColumns, rows: entries, paginated: flag, pageSizeOptions: [10, 20] };
    const windowedElement = <DataTable {...windowed} paginated={flag} defaultPageSize={20} paginationVariant="simple" />;
    const plainElement = <DataTable columns={entryColumns} rows={entries} paginated={flag} manual totalItems={900} />;
    void [unwindowed, notVirtualized, withoutHasMore, withoutCallback, loadingWithoutCallback, thresholdWithoutCallback];
    void [paginated, flagged, page, defaultPage, onPageChange, pageSize, defaultPageSize, onPageSizeChange];
    void [pageSizeOptions, paginationVariant, paginationLabels, paginatedElement];
    void [infinite, tuned, infiniteElement, windowedPages, plainPages, windowedElement, plainElement];
  });

  it("lets a wrapper omit props from each arm of the props union, keeping each arm's requirements", () => {
    function EntryTable(props: DataTablePropsOmit<Entry, "columns">) {
      return <DataTable columns={entryColumns} {...props} />;
    }
    function WindowedTable(props: DataTablePropsOmit<Entry, "virtualized" | "rowHeight">) {
      return <DataTable {...props} virtualized rowHeight={40} caption="Entries" />;
    }
    function MergedEntryTable(props: Omit<DataTableProps<Entry>, "columns">) {
      // @ts-expect-error -- Omit on the props union keeps only the keys every arm has and merges their types, which no arm accepts
      return <DataTable columns={entryColumns} {...props} />;
    }
    function MergedWindowedTable(props: Omit<DataTableProps<Entry>, "virtualized" | "rowHeight">) {
      // @ts-expect-error -- the merged onLoadMore is an optional callback, which the finite arms forbid and the infinite arm requires
      return <DataTable {...props} virtualized rowHeight={40} caption="Entries" />;
    }
    void [MergedEntryTable, MergedWindowedTable];
    const infinite = <WindowedTable caption="Entries" columns={entryColumns} rows={entries} onLoadMore={() => {}} hasMore />;
    // @ts-expect-error -- the helper keeps each arm's requirements: onLoadMore still needs hasMore
    const withoutHasMore = <WindowedTable caption="Entries" columns={entryColumns} rows={entries} onLoadMore={() => {}} />;
    void withoutHasMore;
    for (const element of [
      <EntryTable key="plain" rows={entries} />,
      <WindowedTable key="windowed" columns={entryColumns} rows={entries} />,
      infinite,
    ]) {
      const { unmount } = render(element);
      expect(screen.getByRole("table")).toBeInTheDocument();
      unmount();
    }
  });

  it("mounts no row until the scroll container has a size, holding every row's height in one hidden spacer", () => {
    renderEntries({ selectionMode: "multiple" });
    expect(bodyRows()).toHaveLength(0);
    const [spacer] = spacers();
    expect(spacers()).toHaveLength(1);
    expect(spacer).toHaveAttribute("aria-hidden", "true");
    expect(spacer?.querySelectorAll("td")).toHaveLength(1);
    const cell = spacer?.querySelector("td") as HTMLElement;
    expect(cell).toHaveAttribute("colspan", "3");
    expect(cell.style.blockSize).toBe(`${entries.length * 40}px`);
  });

  it("counts the header row and every row on the table, the header row indexed 1", () => {
    renderEntries();
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "301");
    expect(screen.getAllByRole("row")[0]).toHaveAttribute("aria-rowindex", "1");
  });

  it("counts every page's rows of a paginated table, and holds only the page's rows' height", () => {
    renderEntries({ paginated: true, pageSizeOptions: [50], defaultPage: 3 });
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "301");
    expect((spacers()[0] as HTMLElement).querySelector("td")?.style.blockSize).toBe(`${50 * 40}px`);
  });

  it("counts a manual table's rows from totalItems, and never fewer than the pages before and the page passed", () => {
    const { rerender } = renderEntries({
      manual: true,
      paginated: true,
      pageSizeOptions: [50],
      page: 2,
      totalItems: 1000,
      rows: entries.slice(0, 50),
    });
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "1001");

    rerender(
      <DataTable
        aria-label="Entries"
        columns={entryColumns}
        rows={entries.slice(0, 80)}
        getRowId={(entry) => entry.id}
        virtualized
        rowHeight={40}
        manual
        paginated
        pageSizeOptions={[50]}
        page={2}
        totalItems={60}
      />,
    );
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "131");
  });

  it("counts every row passed to a manual table that is not paginated", () => {
    renderEntries({ manual: true, totalItems: 1000 });
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "301");
  });

  it("makes the scroll container a focusable region named by the aria-label", () => {
    renderEntries();
    const region = screen.getByRole("region", { name: "Entries" });
    expect(region).toHaveClass("vpg-table-container");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("table", { name: "Entries" })).toBeInTheDocument();
  });

  it("names the scroll region by a caption", () => {
    render(<DataTable caption="Entries" columns={entryColumns} rows={entries} virtualized rowHeight={40} />);
    expect(screen.getByRole("region", { name: "Entries" })).toHaveAttribute("tabindex", "0");
  });

  it("passes scrollRef on to the scroll container, as an object or a callback", () => {
    const scrollRef = createRef<HTMLDivElement>();
    const { unmount } = renderEntries({ scrollRef });
    expect(scrollRef.current).toBe(screen.getByRole("region"));
    unmount();
    expect(scrollRef.current).toBeNull();

    const calls: (HTMLDivElement | null)[] = [];
    renderEntries({ scrollRef: (node) => void calls.push(node) });
    expect(calls).toEqual([screen.getByRole("region")]);
  });

  it("windows nothing while loading, drawing the skeleton rows with no row count", () => {
    renderEntries({ loading: true, loadingRowCount: 3 });
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-rowcount");
    expect(spacers()).toHaveLength(0);
    expect(document.querySelectorAll("tbody > tr[aria-hidden='true']")).toHaveLength(3);
  });

  it("windows nothing with no rows, drawing the empty state", () => {
    renderEntries({ rows: [] });
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-rowcount");
    expect(spacers()).toHaveLength(0);
    expect(screen.getByRole("cell", { name: "No results" })).toBeInTheDocument();
  });

  it("mounts every row with no spacers, row count, row indexes or measured indexes without virtualized", () => {
    render(<DataTable aria-rowcount={-1} columns={entryColumns} rows={entries} rowHeight={40} />);
    expect(bodyRows()).toHaveLength(entries.length);
    expect(spacers()).toHaveLength(0);
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "-1");
    for (const row of screen.getAllByRole("row")) {
      expect(row).not.toHaveAttribute("aria-rowindex");
      expect(row).not.toHaveAttribute("data-index");
    }
  });
});

describe("DataTable, infinite", () => {
  interface Entry {
    id: string;
    name: string;
  }

  const entries: Entry[] = Array.from({ length: 50 }, (_, n) => ({ id: `e-${n}`, name: `Entry ${n}` }));
  const entryColumns: DataTableColumn<Entry>[] = [{ accessor: "name", header: "Name" }];

  interface InfiniteProps {
    rows?: Entry[];
    hasMore?: boolean;
    loadingMore?: boolean;
    loadMoreThreshold?: number;
    loading?: boolean;
    loadingRowCount?: number;
    totalItems?: number;
    emptyState?: string;
    onSortChange?: (sort: DataTableSortState) => void;
    selectionMode?: "multiple";
    onSelectionChange?: (ids: string[]) => void;
  }

  /** An infinite table with no rows yet, which needs no scroll container size to be at its end. */
  function infinite(onLoadMore: () => void, { hasMore = true, ...props }: InfiniteProps = {}) {
    return (
      <DataTable
        aria-label="Entries"
        columns={entryColumns}
        rows={[]}
        getRowId={(entry) => entry.id}
        virtualized
        rowHeight={40}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        {...props}
      />
    );
  }

  it("asks for rows from the empty state, once", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(infinite(onLoadMore));
    expect(onLoadMore).toHaveBeenCalledOnce();
    rerender(infinite(onLoadMore, { loadMoreThreshold: 10 }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("asks once under StrictMode, whose simulated remount runs the effect again", () => {
    const onLoadMore = vi.fn();
    render(<StrictMode>{infinite(onLoadMore)}</StrictMode>);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("asks for nothing while hasMore is false", () => {
    const onLoadMore = vi.fn();
    render(infinite(onLoadMore, { hasMore: false }));
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByRole("cell", { name: "No results" })).toBeInTheDocument();
  });

  it("asks for nothing while loading, and asks once loading ends with no rows", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(infinite(onLoadMore, { loading: true }));
    expect(onLoadMore).not.toHaveBeenCalled();
    rerender(infinite(onLoadMore));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("asks for nothing while loadingMore, and asks again once a request brings no rows", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(infinite(onLoadMore, { loadingMore: true }));
    expect(onLoadMore).not.toHaveBeenCalled();
    rerender(infinite(onLoadMore));
    expect(onLoadMore).toHaveBeenCalledOnce();
    rerender(infinite(onLoadMore, { loadingMore: true }));
    expect(onLoadMore).toHaveBeenCalledOnce();
    rerender(infinite(onLoadMore));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("asks for nothing while its scroll container has no size, since no row is in view", () => {
    const onLoadMore = vi.fn();
    render(infinite(onLoadMore, { rows: entries }));
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("ignores onLoadMore on a paginated table, and on one that is not virtualized", () => {
    const onLoadMore = vi.fn();
    // Both are type errors; at run time paging wins, and an unwindowed table has no range.
    const paginated = { paginated: true } as unknown as InfiniteProps;
    render(infinite(onLoadMore, paginated));
    const plain = { columns: entryColumns, rows: [], onLoadMore, hasMore: true } as unknown as DataTableProps<Entry>;
    render(<DataTable {...plain} />);
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getAllByRole("table")).toHaveLength(2);
  });

  it("puts neither onLoadMore nor its companions on the table element", () => {
    render(infinite(() => {}, { loadingMore: false, loadMoreThreshold: 3 }));
    const table = screen.getByRole("table");
    for (const name of ["onloadmore", "hasmore", "loadingmore", "loadmorethreshold"]) expect(table).not.toHaveAttribute(name);
  });

  describe("sorting", () => {
    const reversed = [...entries].reverse();

    it("leaves the order to the consumer: a header click reports the sort and the rows stay as given", () => {
      const onSortChange = vi.fn();
      const onSelectionChange = vi.fn();
      render(infinite(vi.fn(), { rows: reversed, onSortChange, selectionMode: "multiple", onSelectionChange }));
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      expect(onSortChange).toHaveBeenCalledOnce();
      expect(onSortChange).toHaveBeenCalledWith([{ columnId: "name", direction: "asc" }]);
      expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
      // Select-all reports ids in the order the rows are drawn.
      fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
      expect(onSelectionChange).toHaveBeenLastCalledWith(reversed.map((entry) => entry.id));
    });

    it("sorts the rows itself on a virtualized table without onLoadMore", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          aria-label="Entries"
          columns={entryColumns}
          rows={reversed}
          getRowId={(entry) => entry.id}
          virtualized
          rowHeight={40}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
      expect(onSelectionChange).toHaveBeenLastCalledWith(entries.map((entry) => entry.id));
    });

    it("asks again after a header sort click only once the rows are replaced", () => {
      const onLoadMore = vi.fn();
      const { rerender } = render(infinite(onLoadMore));
      expect(onLoadMore).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      expect(onLoadMore).toHaveBeenCalledOnce();
      rerender(infinite(onLoadMore));
      expect(onLoadMore).toHaveBeenCalledTimes(2);
      rerender(infinite(onLoadMore));
      expect(onLoadMore).toHaveBeenCalledTimes(2);
    });
  });

  /** The body's rows, spacers and skeleton rows, in order. */
  function bodyChildren(): HTMLElement[] {
    return Array.from((screen.getByRole("table").querySelector("tbody") as HTMLElement).children) as HTMLElement[];
  }

  function skeletons(): HTMLElement[] {
    return bodyChildren().filter((row) => row.querySelector(".vpg-skeleton") !== null);
  }

  describe("loading more", () => {
    it("draws loadingRowCount hidden skeleton rows with no aria-rowindex after the trailing spacer of the loaded rows", () => {
      render(infinite(vi.fn(), { rows: entries, loadingMore: true, loadingRowCount: 3 }));
      const children = bodyChildren();
      expect(children).toHaveLength(4);
      expect(children[0]).toHaveClass("vpg-data-table-spacer");
      expect((children[0] as HTMLElement).querySelector("td")?.style.blockSize).toBe(`${entries.length * 40}px`);
      expect(skeletons()).toEqual(children.slice(1));
      for (const row of skeletons()) {
        expect(row).toHaveAttribute("aria-hidden", "true");
        expect(row).not.toHaveAttribute("aria-rowindex");
        expect(row).not.toHaveAttribute("data-index");
      }
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    });

    it("draws five skeleton rows by default, and none once loadingMore is cleared", () => {
      const { rerender } = render(infinite(vi.fn(), { rows: entries, loadingMore: true }));
      expect(skeletons()).toHaveLength(5);
      rerender(infinite(vi.fn(), { rows: entries }));
      expect(skeletons()).toHaveLength(0);
      expect(bodyChildren()).toHaveLength(1);
    });

    it("draws the skeleton rows in place of the emptyState with no rows, and marks the table busy", () => {
      render(infinite(vi.fn(), { loadingMore: true, loadingRowCount: 2, emptyState: "Nothing" }));
      expect(screen.queryByText("Nothing")).toBeNull();
      expect(bodyChildren()).toHaveLength(2);
      expect(skeletons()).toHaveLength(2);
      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    });

    it("draws neither the emptyState nor a skeleton row with no rows while hasMore is set and nothing is loading", () => {
      render(infinite(vi.fn(), { emptyState: "Nothing" }));
      expect(screen.queryByText("Nothing")).toBeNull();
      expect(bodyChildren()).toHaveLength(0);
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    });

    it("draws the emptyState with no rows once hasMore is false and loadingMore is not set", () => {
      const { rerender } = render(infinite(vi.fn(), { hasMore: false, loadingMore: true, emptyState: "Nothing" }));
      expect(screen.queryByText("Nothing")).toBeNull();
      expect(skeletons()).toHaveLength(5);
      rerender(infinite(vi.fn(), { hasMore: false, emptyState: "Nothing" }));
      expect(screen.getByRole("cell", { name: "Nothing" })).toBeInTheDocument();
      expect(skeletons()).toHaveLength(0);
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    });

    it("draws loading's skeleton rows alone while loading and loadingMore are both set", () => {
      render(infinite(vi.fn(), { rows: entries, loading: true, loadingMore: true, loadingRowCount: 3 }));
      expect(bodyChildren()).toHaveLength(3);
      expect(skeletons()).toHaveLength(3);
      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    });

    it("draws no skeleton rows for loadingMore and the emptyState with no rows on a table that is not infinite", () => {
      // Both are type errors; at run time a paginated or unwindowed table ignores the infinite props.
      const paginated = { paginated: true, loadingMore: true } as unknown as InfiniteProps;
      const { unmount } = render(infinite(vi.fn(), paginated));
      expect(screen.getByRole("cell", { name: "No results" })).toBeInTheDocument();
      expect(skeletons()).toHaveLength(0);
      unmount();
      const plain = {
        columns: entryColumns,
        rows: [],
        onLoadMore: vi.fn(),
        hasMore: true,
        loadingMore: true,
      } as unknown as DataTableProps<Entry>;
      render(<DataTable {...plain} />);
      expect(screen.getByRole("cell", { name: "No results" })).toBeInTheDocument();
      expect(skeletons()).toHaveLength(0);
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    });
  });

  describe("aria-rowcount", () => {
    it("is -1 while hasMore is set and totalItems is not passed, the loaded rows indexed from 2", () => {
      render(infinite(vi.fn(), { rows: entries }));
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "-1");
      expect(screen.getAllByRole("row")[0]).toHaveAttribute("aria-rowindex", "1");
    });

    it("counts totalItems and the header row while totalItems is passed", () => {
      render(infinite(vi.fn(), { rows: entries, totalItems: 1000 }));
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "1001");
    });

    it("counts the loaded rows and the header row once hasMore is false", () => {
      render(infinite(vi.fn(), { rows: entries, hasMore: false }));
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", String(entries.length + 1));
    });

    it("passes the consumer's aria-rowcount through while no row is loaded, since nothing is windowed", () => {
      render(infinite(vi.fn(), { "aria-rowcount": 7 } as InfiniteProps));
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "7");
    });
  });

  describe("the scope onLoadMore starts in", () => {
    it("starts onLoadMore inside the enclosing ScopeProvider's scope", () => {
      let started: unknown;
      const onLoadMore = vi.fn(() => {
        started = Scope.current().get("user.id");
      });
      render(<ScopeProvider attributes={{ "user.id": "u1" }}>{infinite(onLoadMore)}</ScopeProvider>);
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(started).toBe("u1");
    });

    it("starts onLoadMore in the scope of the nearest ScopeProvider", () => {
      let started: unknown;
      const onLoadMore = vi.fn(() => {
        started = Scope.current().get("user.id");
      });
      render(
        <ScopeProvider attributes={{ "user.id": "u1" }}>
          <ScopeProvider attributes={{ "user.id": "u2" }}>{infinite(onLoadMore)}</ScopeProvider>
        </ScopeProvider>,
      );
      expect(started).toBe("u2");
    });

    it("starts onLoadMore in the default scope outside any ScopeProvider", () => {
      let started: Scope | undefined;
      const onLoadMore = vi.fn(() => {
        started = Scope.current();
      });
      render(infinite(onLoadMore));
      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(started).toBe(Scope.current());
      expect(started?.get("user.id")).toBeUndefined();
    });
  });
});

describe("rowCounts", () => {
  const pagination = { page: 1, pageSize: 10, totalItems: 0 };

  function infiniteCounts(hasMore: boolean, totalItems: number | undefined, loadedCount: number) {
    const loadMore: LoadMoreState = { infinite: true, hasMore, totalItems, appending: false, drawsEmptyState: false, busy: false };
    return windowedRowCounts({ paginated: false, pagination, loadMore }, loadedCount);
  }

  it.each([
    { hasMore: true, totalItems: undefined, loaded: 50, count: -1 },
    { hasMore: true, totalItems: 1000, loaded: 50, count: 1001 },
    { hasMore: false, totalItems: 1000, loaded: 50, count: 1001 },
    { hasMore: true, totalItems: 120.9, loaded: 50, count: 121 },
    { hasMore: true, totalItems: 20, loaded: 50, count: 51 },
    { hasMore: true, totalItems: -3, loaded: 50, count: 51 },
    { hasMore: true, totalItems: Number.NaN, loaded: 50, count: 51 },
    { hasMore: true, totalItems: Number.POSITIVE_INFINITY, loaded: 50, count: 51 },
    { hasMore: false, totalItems: undefined, loaded: 50, count: 51 },
    { hasMore: false, totalItems: undefined, loaded: 1, count: 2 },
  ])(
    "counts $loaded loaded rows of an infinite table, hasMore $hasMore and totalItems $totalItems, as $count",
    ({ hasMore, totalItems, loaded, count }) => {
      expect(infiniteCounts(hasMore, totalItems, loaded)).toEqual({ ariaRowCount: count, firstRowIndex: 2 });
    },
  );

  it("counts a table that is not infinite by its drawn rows, or by every page's rows and the pages before when paginated", () => {
    const loadMore = loadMoreState(
      {
        onLoadMore: undefined,
        hasMore: undefined,
        loadingMore: undefined,
        totalItems: undefined,
        virtualized: true,
        paginated: false,
        loading: false,
      },
      300,
    );
    expect(windowedRowCounts({ paginated: false, pagination, loadMore }, 300)).toEqual({ ariaRowCount: 301, firstRowIndex: 2 });
    expect(windowedRowCounts({ paginated: true, pagination: { page: 3, pageSize: 50, totalItems: 300 }, loadMore }, 50)).toEqual({
      ariaRowCount: 301,
      firstRowIndex: 102,
    });
    expect(windowedRowCounts({ paginated: true, pagination: { page: 2, pageSize: 50, totalItems: 60 }, loadMore }, 80)).toEqual({
      ariaRowCount: 131,
      firstRowIndex: 52,
    });
  });

  const onLoadMore = () => {};
  const base = {
    onLoadMore,
    hasMore: true,
    loadingMore: false,
    totalItems: undefined,
    virtualized: true,
    paginated: false,
    loading: false,
  };

  it.each([
    {
      name: "infinite, empty, hasMore",
      props: {},
      rows: 0,
      expected: { infinite: true, appending: false, drawsEmptyState: false, busy: false },
    },
    {
      name: "infinite, empty, loadingMore",
      props: { loadingMore: true },
      rows: 0,
      expected: { infinite: true, appending: true, drawsEmptyState: false, busy: true },
    },
    {
      name: "infinite, rows, loadingMore",
      props: { loadingMore: true },
      rows: 5,
      expected: { infinite: true, appending: true, drawsEmptyState: false, busy: false },
    },
    {
      name: "infinite, empty, exhausted",
      props: { hasMore: false },
      rows: 0,
      expected: { infinite: true, appending: false, drawsEmptyState: true, busy: false },
    },
    {
      name: "infinite, empty, exhausted, loadingMore",
      props: { hasMore: false, loadingMore: true },
      rows: 0,
      expected: { infinite: true, appending: true, drawsEmptyState: false, busy: true },
    },
    {
      name: "infinite, loading and loadingMore",
      props: { loading: true, loadingMore: true },
      rows: 0,
      expected: { infinite: true, appending: false, drawsEmptyState: false, busy: true },
    },
    {
      name: "paginated",
      props: { paginated: true, loadingMore: true },
      rows: 0,
      expected: { infinite: false, appending: false, drawsEmptyState: true, busy: false },
    },
    {
      name: "not virtualized",
      props: { virtualized: false, loadingMore: true },
      rows: 0,
      expected: { infinite: false, appending: false, drawsEmptyState: true, busy: false },
    },
    {
      name: "without onLoadMore",
      props: { onLoadMore: undefined, hasMore: undefined, loadingMore: undefined },
      rows: 0,
      expected: { infinite: false, appending: false, drawsEmptyState: true, busy: false },
    },
    {
      name: "without onLoadMore, loading",
      props: { onLoadMore: undefined, loading: true },
      rows: 0,
      expected: { infinite: false, appending: false, drawsEmptyState: false, busy: true },
    },
  ])("reads a table $name", ({ props, rows, expected }) => {
    expect(loadMoreState({ ...base, ...props }, rows)).toMatchObject(expected);
  });

  it("defaults hasMore to false outside an infinite table", () => {
    expect(loadMoreState({ ...base, onLoadMore: undefined, hasMore: undefined }, 0).hasMore).toBe(false);
  });
});
