import type { Meta, StoryObj } from "@storybook/react-vite";
import { Table } from "@vipengele/react-ui";

const invoices = [
  { id: "INV-1001", customer: "Acme Corp", status: "Paid", amount: 1250 },
  { id: "INV-1002", customer: "Globex", status: "Pending", amount: 480.5 },
  { id: "INV-1003", customer: "Initech", status: "Paid", amount: 3120 },
  { id: "INV-1004", customer: "Umbrella", status: "Overdue", amount: 89.99 },
  { id: "INV-1005", customer: "Hooli", status: "Paid", amount: 760 },
];

const manyInvoices = Array.from({ length: 30 }, (_, index) => ({
  id: `INV-${2000 + index}`,
  customer: ["Acme Corp", "Globex", "Initech", "Umbrella", "Hooli"][index % 5],
  status: ["Paid", "Pending", "Overdue"][index % 3],
  amount: 100 + ((index * 137) % 900),
}));

const formatAmount = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: {
    docs: {
      description: {
        component:
          "A presentational data table. A table that scrolls should have a `caption`: it names the scroll container and makes it a focusable region, so a keyboard user can scroll it.",
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Invoice</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.customer}</Table.Cell>
            <Table.Cell>{invoice.status}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/** `compact`, `regular` and `relaxed` step the cell padding along the space scale. */
export const Densities: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "2rem" }}>
      {(["compact", "regular", "relaxed"] as const).map((density) => (
        <Table key={density} density={density} caption={`Density: ${density}`}>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Invoice</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {invoices.slice(0, 3).map((invoice) => (
              <Table.Row key={invoice.id}>
                <Table.Cell>{invoice.id}</Table.Cell>
                <Table.Cell>{invoice.customer}</Table.Cell>
                <Table.Cell align="end">{formatAmount(invoice.amount)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ))}
    </div>
  ),
};

/** The consumer bounds the scroll container's height; the header stays pinned while the body
 * scrolls under it. The caption names the scrollable region for assistive technology. */
export const StickyHeader: Story = {
  render: () => (
    <Table stickyHeader caption="Recent invoices" style={{ blockSize: "16rem" }}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Invoice</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {manyInvoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.customer}</Table.Cell>
            <Table.Cell>{invoice.status}</Table.Cell>
            <Table.Cell align="end">{formatAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/** `align` sets the inline alignment of a column's header and cells; numbers read best end-aligned. */
export const Alignment: Story = {
  render: () => (
    <Table caption="Alignment by column">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell align="start">Customer</Table.HeaderCell>
          <Table.HeaderCell align="center">Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell align="start">{invoice.customer}</Table.Cell>
            <Table.Cell align="center">{invoice.status}</Table.Cell>
            <Table.Cell align="end">{formatAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/** A header cell that labels a row passes `scope="row"`; column headers default to `scope="col"`. */
export const RowHeaders: Story = {
  render: () => (
    <Table caption="Invoices by number">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Invoice</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.HeaderCell scope="row">{invoice.id}</Table.HeaderCell>
            <Table.Cell>{invoice.customer}</Table.Cell>
            <Table.Cell align="end">{formatAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

export const Footer: Story = {
  render: () => (
    <Table caption="Invoices with total">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Invoice</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.customer}</Table.Cell>
            <Table.Cell align="end">{formatAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Foot>
        <Table.Row>
          <Table.HeaderCell scope="row" colSpan={2}>
            Total
          </Table.HeaderCell>
          <Table.Cell align="end">{formatAmount(total)}</Table.Cell>
        </Table.Row>
      </Table.Foot>
    </Table>
  ),
};
