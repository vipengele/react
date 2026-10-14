import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, DataTable, type DataTableColumn, type DataTableSortState } from "@vipengele/react-ui";
import { useEffect, useState } from "react";

interface Invoice {
  id: string;
  customer: string;
  status: "Paid" | "Pending" | "Overdue";
  amount: number;
  due: Date;
  lines: number;
}

const customers = ["Acme Corp", "Globex", "Initech", "Umbrella", "Hooli"];
const statuses = ["Paid", "Pending", "Overdue"] as const;

function makeInvoices(count: number): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `INV-${1001 + index}`,
    customer: customers[index % customers.length] as string,
    status: statuses[(index * 2) % statuses.length] as Invoice["status"],
    amount: 100 + ((index * 137) % 900) + (index % 4) * 0.5,
    due: new Date(Date.UTC(2026, index % 12, 1 + ((index * 7) % 28))),
    lines: 1 + (index % 6),
  }));
}

const invoices = makeInvoices(8);
const manyInvoices = makeInvoices(40);
const serverInvoices = makeInvoices(95);

const formatAmount = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const formatDate = (date: Date) => date.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });

const columns: DataTableColumn<Invoice>[] = [
  { accessor: "id", header: "Invoice" },
  { accessor: "customer", header: "Customer" },
  { accessor: "status", header: "Status" },
  { accessor: "due", header: "Due", cell: ({ value }) => formatDate(value as Date) },
  {
    id: "perLine",
    header: "Per line",
    align: "end",
    accessor: (row) => row.amount / row.lines,
    cell: ({ value }) => formatAmount(value as number),
  },
  { accessor: "amount", header: "Amount", align: "end", cell: ({ value }) => formatAmount(value as number) },
];

const getRowId = (row: Invoice) => row.id;

const selectRowLabel = (row: Invoice) => `Select ${row.id}`;

const meta = {
  title: "Components/DataTable",
  component: DataTable<Invoice>,
  args: { columns, rows: invoices, getRowId, caption: "Invoices" },
  parameters: {
    docs: {
      description: {
        component:
          "A data table over `columns` and `rows`, built on native table semantics: a `<table>` with column headers, so assistive technology reads it as a table. Each sortable column's header holds a button, and those buttons are the table's tab stops. Sorting is on by default: a click on a header sorts by that column, and a column opts out with `sortable: false`. A column is a `header` and an `accessor`, either a property name or a function of the row (which then needs an `id`); `cell` draws the cell, `align` aligns it and `sortFn` replaces the default comparison. With `manual`, DataTable draws `rows` in the order given and the consumer sorts them in response to `onSortChange`. With `selectionMode`, a leading column holds a checkbox (`multiple`) or a radio button (`single`) per row; the selected rows are the ids `getRowId` gives, so a selectable table supplies `getRowId` and a `selectRowLabel` that names each row from its data. With `paginated`, a `Pagination` bar below the table draws the rows a page at a time; with `manual` as well, the consumer passes the current page's rows and `totalItems`, the count across every page. The header checkbox of a paginated table selects the current page's rows, and the selection persists across pages. The table's height comes from `className` or `style`, which apply to its scroll container; give a table that scrolls a `caption`.",
      },
    },
  },
} satisfies Meta<typeof DataTable<Invoice>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MultiColumnSort: Story = {
  args: {
    defaultSort: [
      { columnId: "status", direction: "asc" },
      { columnId: "amount", direction: "desc" },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "With several columns sorted, each header shows its priority number. A click sorts by one column alone; Shift-click, or Shift+Enter or Shift+Space on a focused header, adds the column to the sort or cycles it in place.",
      },
    },
  },
};

function ControlledSortTable() {
  const [sort, setSort] = useState<DataTableSortState>([{ columnId: "customer", direction: "asc" }]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <DataTable columns={columns} rows={invoices} getRowId={getRowId} caption="Invoices" sort={sort} onSortChange={setSort} />
      <code>{JSON.stringify(sort)}</code>
    </div>
  );
}

export const ControlledSort: Story = {
  render: () => <ControlledSortTable />,
};

function sortInvoices(rows: Invoice[], sort: DataTableSortState): Invoice[] {
  return [...rows].sort((a, b) => {
    for (const { columnId, direction } of sort) {
      if (columnId !== "customer" && columnId !== "amount") continue;
      const order = columnId === "amount" ? a.amount - b.amount : a.customer.localeCompare(b.customer);
      if (order !== 0) return direction === "asc" ? order : -order;
    }
    return 0;
  });
}

function ManualSortTable() {
  const [sort, setSort] = useState<DataTableSortState>([]);
  const rows = sortInvoices(invoices, sort);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        caption="Invoices, sorted by the story"
        manual
        sort={sort}
        onSortChange={setSort}
      />
      <code>{JSON.stringify(sort)}</code>
    </div>
  );
}

export const ManualSort: Story = {
  render: () => <ManualSortTable />,
  parameters: {
    docs: {
      description: {
        story:
          "With `manual`, DataTable never reorders `rows`. The story sorts them itself when `onSortChange` fires, standing in for a server, and only the customer and amount columns are ordered; the other headers show their state but leave the rows as they are.",
      },
    },
  },
};

const severityOrder = ["Overdue", "Pending", "Paid"];

export const NonSortableColumn: Story = {
  args: {
    columns: [
      { accessor: "id", header: "Invoice", sortable: false },
      { accessor: "customer", header: "Customer" },
      {
        accessor: "status",
        header: "Status",
        sortFn: (a, b) => severityOrder.indexOf(a as string) - severityOrder.indexOf(b as string),
      },
      { accessor: "amount", header: "Amount", align: "end", cell: ({ value }) => formatAmount(value as number) },
    ],
    defaultSort: [{ columnId: "status", direction: "asc" }],
  },
  parameters: {
    docs: {
      description: {
        story:
          "The Invoice header has `sortable: false`, so it is plain text with no sort control. The Status column's `sortFn` orders by severity, Overdue first, rather than alphabetically.",
      },
    },
  },
};

export const MultipleSelection: Story = {
  args: { selectionMode: "multiple", selectRowLabel, defaultSelectedRowIds: ["INV-1002"], caption: "Invoices, any number selectable" },
  parameters: {
    docs: {
      description: {
        story:
          "In `multiple` mode the header checkbox selects every row and shows a mixed state while only some are selected. Shift-click on a row's checkbox selects the range between it and the last row toggled.",
      },
    },
  },
};

export const SingleSelection: Story = {
  args: { selectionMode: "single", selectRowLabel, defaultSelectedRowIds: ["INV-1003"], caption: "Invoices, one selectable" },
  parameters: {
    docs: {
      description: {
        story:
          "In `single` mode each row holds a radio button and selecting a row replaces the selection. The header holds no control, so `selectionColumnLabel` names the column for assistive technology.",
      },
    },
  },
};

function ControlledSelectionTable() {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>(["INV-1001", "INV-1004"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <DataTable
        columns={columns}
        rows={invoices}
        getRowId={getRowId}
        caption="Invoices"
        selectionMode="multiple"
        selectRowLabel={selectRowLabel}
        selectedRowIds={selectedRowIds}
        onSelectionChange={setSelectedRowIds}
      />
      <Button onClick={() => setSelectedRowIds([])} disabled={selectedRowIds.length === 0}>
        Clear selection
      </Button>
      <code>{JSON.stringify(selectedRowIds)}</code>
    </div>
  );
}

export const ControlledSelection: Story = {
  render: () => <ControlledSelectionTable />,
  parameters: {
    docs: {
      description: {
        story:
          "With `selectedRowIds`, DataTable draws the selection it is given and changes it only through `onSelectionChange`. The story holds the ids, shows them, and can clear them from outside the table.",
      },
    },
  },
};

export const SelectionWithSorting: Story = {
  args: {
    selectionMode: "multiple",
    selectRowLabel,
    defaultSelectedRowIds: ["INV-1002", "INV-1005"],
    defaultSort: [{ columnId: "amount", direction: "desc" }],
    caption: "Invoices, sortable and selectable",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The selection holds row ids, so sorting reorders the selected rows with the rest and never changes which are selected. Sort by another column to see the same rows stay selected.",
      },
    },
  },
};

export const Loading: Story = {
  args: { loading: true, loadingRowCount: 4 },
  parameters: {
    docs: {
      description: {
        story: "While `loading`, the header stays and `loadingRowCount` skeleton rows take the place of the body rows.",
      },
    },
  },
};

function LoadingToggleTable() {
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <Button onClick={() => setLoading((current) => !current)}>{loading ? "Show rows" : "Show loading"}</Button>
      <DataTable columns={columns} rows={invoices} getRowId={getRowId} caption="Invoices" loading={loading} />
    </div>
  );
}

export const LoadingToggle: Story = {
  render: () => <LoadingToggleTable />,
};

export const Empty: Story = {
  args: { rows: [] },
  parameters: {
    docs: {
      description: {
        story: 'With no rows and not `loading`, the body shows a single cell spanning every column, reading "No results" by default.',
      },
    },
  },
};

export const CustomEmptyState: Story = {
  args: { rows: [], emptyState: <p>No invoices match this filter. Clear the filter to see them all.</p> },
};

export const CompactStickyHeader: Story = {
  args: {
    rows: manyInvoices,
    density: "compact",
    stickyHeader: true,
    caption: "All invoices",
    style: { blockSize: "20rem" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "The consumer bounds the height through `style` or `className`, which apply to the scroll container; the header stays pinned while the rows scroll under it.",
      },
    },
  },
};

export const Paginated: Story = {
  args: { rows: manyInvoices, paginated: true, defaultPageSize: 10, caption: "Invoices, paginated" },
  parameters: {
    docs: {
      description: {
        story:
          "With `paginated`, the table draws one page of `rows` and a `Pagination` bar below it counts every row. Uncontrolled, it starts at `defaultPage` and `defaultPageSize`. Sorting returns the table to page 1, because a new order puts different rows on every page.",
      },
    },
  },
};

function ControlledPaginationTable() {
  const [page, setPage] = useState(2);
  const [pageSize, setPageSize] = useState(5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <DataTable
        columns={columns}
        rows={manyInvoices}
        getRowId={getRowId}
        caption="Invoices, paginated"
        paginated
        pageSizeOptions={[5, 10, 20]}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      <code>{JSON.stringify({ page, pageSize })}</code>
    </div>
  );
}

export const ControlledPagination: Story = {
  render: () => <ControlledPaginationTable />,
  parameters: {
    docs: {
      description: {
        story:
          "With `page` and `pageSize`, DataTable draws the page it is given and changes it only through `onPageChange` and `onPageSizeChange`. The story holds both and shows them. A page out of range is drawn clamped, and the clamp is never reported.",
      },
    },
  },
};

interface InvoiceQuery {
  page: number;
  pageSize: number;
  sort: DataTableSortState;
}

interface InvoicePage {
  query: InvoiceQuery;
  rows: Invoice[];
  total: number;
}

function fetchInvoicePage(query: InvoiceQuery): InvoicePage {
  const start = (query.page - 1) * query.pageSize;
  return {
    query,
    rows: sortInvoices(serverInvoices, query.sort).slice(start, start + query.pageSize),
    total: serverInvoices.length,
  };
}

const serverLatencyMs = 600;

function ManualPaginationTable() {
  const [query, setQuery] = useState<InvoiceQuery>({ page: 1, pageSize: 10, sort: [] });
  const [result, setResult] = useState(() => fetchInvoicePage(query));
  const loading = result.query !== query;

  useEffect(() => {
    if (result.query === query) return;
    const timer = setTimeout(() => setResult(fetchInvoicePage(query)), serverLatencyMs);
    return () => clearTimeout(timer);
  }, [query, result.query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <DataTable
        columns={columns}
        rows={result.rows}
        getRowId={getRowId}
        caption="Invoices, paged by the story"
        manual
        paginated
        totalItems={result.total}
        loading={loading}
        loadingRowCount={query.pageSize}
        sort={query.sort}
        onSortChange={(sort) => setQuery((current) => ({ ...current, sort, page: 1 }))}
        page={query.page}
        onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        pageSize={query.pageSize}
        onPageSizeChange={(pageSize) => setQuery((current) => ({ ...current, pageSize }))}
      />
      <code>{JSON.stringify(query)}</code>
    </div>
  );
}

export const ManualPagination: Story = {
  render: () => <ManualPaginationTable />,
  parameters: {
    docs: {
      description: {
        story:
          "With `manual`, DataTable neither sorts nor slices `rows`. The story stands in for a server: each change to the page, page size or sort starts a request that answers after a short delay with one sorted page of 95 invoices. While it is in flight the table is `loading` with `loadingRowCount` equal to the page size, and `totalItems` keeps the bar counting every invoice. A new sort returns to page 1 because the story chooses so; only the customer and amount columns are ordered.",
      },
    },
  },
};

function PaginatedSelectionTable() {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>(["INV-1002"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <DataTable
        columns={columns}
        rows={manyInvoices}
        getRowId={getRowId}
        caption="Invoices, paginated and selectable"
        paginated
        defaultPageSize={5}
        pageSizeOptions={[5, 10, 20]}
        selectionMode="multiple"
        selectRowLabel={selectRowLabel}
        selectedRowIds={selectedRowIds}
        onSelectionChange={setSelectedRowIds}
      />
      <p>{selectedRowIds.length} selected</p>
      <code>{JSON.stringify(selectedRowIds)}</code>
    </div>
  );
}

export const PaginatedSelection: Story = {
  render: () => <PaginatedSelectionTable />,
  parameters: {
    docs: {
      description: {
        story:
          "In a paginated table the header checkbox selects the rows of the current page only, and shows a mixed state while only some of them are selected. The selection holds row ids, so it persists across pages: select a page, move to the next and the earlier ids stay in the list below the table.",
      },
    },
  },
};

const resizableColumnDefs: DataTableColumn<Invoice>[] = [
  { accessor: "id", header: "Invoice", size: 120 },
  { accessor: "customer", header: "Customer", size: 180 },
  { accessor: "status", header: "Status", size: 120 },
  { accessor: "due", header: "Due", size: 140, cell: ({ value }) => formatDate(value as Date) },
  {
    id: "perLine",
    header: "Per line",
    align: "end",
    size: 130,
    accessor: (row) => row.amount / row.lines,
    cell: ({ value }) => formatAmount(value as number),
  },
  { accessor: "amount", header: "Amount", align: "end", size: 130, cell: ({ value }) => formatAmount(value as number) },
];

export const ResizableColumns: Story = {
  args: { columns: resizableColumnDefs, resizableColumns: true, caption: "Invoices, resizable columns" },
  parameters: {
    docs: {
      description: {
        story:
          "With `resizableColumns`, the table lays its columns out at fixed widths and each header carries a resize handle on its trailing edge. Drag a handle to resize live, or Tab to it and use the arrow keys (10 pixels, 50 with Shift) and Home and End (the column's `minSize` and `maxSize`). A column's `size` is its starting width. While the columns are narrower than the container, those you have not resized share the surplus; a column you resize is drawn at exactly the width you give it. A table wider than its container scrolls.",
      },
    },
  },
};

const initialColumnSizes = { id: 120, customer: 220, status: 120 };

function ControlledColumnSizesTable() {
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>(initialColumnSizes);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <DataTable
        columns={resizableColumnDefs}
        rows={invoices}
        getRowId={getRowId}
        caption="Invoices, column sizes held by the story"
        resizableColumns
        columnSizes={columnSizes}
        onColumnSizesChange={setColumnSizes}
      />
      <Button onClick={() => setColumnSizes(initialColumnSizes)}>Reset sizes</Button>
      <code>{JSON.stringify(columnSizes)}</code>
    </div>
  );
}

export const ControlledColumnSizes: Story = {
  render: () => <ControlledColumnSizesTable />,
  parameters: {
    docs: {
      description: {
        story:
          "With `columnSizes`, DataTable draws the widths it is given, in pixels by column id, and changes them only through `onColumnSizesChange`, which fires on every move of a drag. A column with an entry is drawn at exactly that width; the columns without one share the surplus of a wider container. The story holds the sizes, shows them, and can reset them from outside the table.",
      },
    },
  },
};

export const MinMaxConstraints: Story = {
  args: {
    columns: [
      { accessor: "id", header: "Invoice", size: 120, resizable: false },
      { accessor: "customer", header: "Customer", size: 180, minSize: 120, maxSize: 300 },
      { accessor: "status", header: "Status", size: 120, minSize: 100, maxSize: 160 },
      { accessor: "due", header: "Due", size: 140, minSize: 140, cell: ({ value }) => formatDate(value as Date) },
      { accessor: "amount", header: "Amount", align: "end", size: 130, minSize: 80, cell: ({ value }) => formatAmount(value as number) },
    ],
    resizableColumns: true,
    caption: "Invoices, constrained column widths",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A resize is clamped into the column's `minSize` and `maxSize`, and the handle announces both. Customer stays between 120 and 300 pixels and Status between 100 and 160; Due and Amount have a `minSize` and no `maxSize`, so End on their handles does nothing. Invoice has `resizable: false`: it has no handle and is drawn at exactly its `size`, taking no share of a wider container.",
      },
    },
  },
};

export const ResizableWithSortingAndSelection: Story = {
  args: {
    columns: resizableColumnDefs,
    resizableColumns: true,
    selectionMode: "multiple",
    selectRowLabel,
    defaultSelectedRowIds: ["INV-1002"],
    defaultSort: [{ columnId: "amount", direction: "desc" }],
    caption: "Invoices, resizable, sortable and selectable",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Each header holds a sort button and, beside it, a resize handle. The button sorts and the handle only resizes: dragging or using the keys on a handle never changes the sort. The selection column keeps its fixed width, has no handle, and takes no share of a wider container.",
      },
    },
  },
};
