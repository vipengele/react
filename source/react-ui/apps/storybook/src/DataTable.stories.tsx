import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, DataTable, type DataTableColumn, type DataTableSortState } from "@vipengele/react-ui";
import { useState } from "react";

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

const meta = {
  title: "Components/DataTable",
  component: DataTable<Invoice>,
  args: { columns, rows: invoices, getRowId, caption: "Invoices" },
  parameters: {
    docs: {
      description: {
        component:
          "A data table over `columns` and `rows`, built on native table semantics: a `<table>` with column headers, so assistive technology reads it as a table. Each sortable column's header holds a button, and those buttons are the table's tab stops. Sorting is on by default: a click on a header sorts by that column, and a column opts out with `sortable: false`. A column is a `header` and an `accessor`, either a property name or a function of the row (which then needs an `id`); `cell` draws the cell, `align` aligns it and `sortFn` replaces the default comparison. With `manual`, DataTable draws `rows` in the order given and the consumer sorts them in response to `onSortChange`. The table's height comes from `className` or `style`, which apply to its scroll container; give a table that scrolls a `caption`.",
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
