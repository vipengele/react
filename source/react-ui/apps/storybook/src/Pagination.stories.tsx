import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  args: { totalItems: 243 },
  parameters: {
    docs: {
      description: {
        component:
          "A pagination bar: the range in view, a page-size field and windowed page buttons. The page and the page size are each controlled or held by the component. The page shown is clamped into range at render; callbacks only fire on user action.",
      },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function ControlledPagination() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Pagination totalItems={243} page={page} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
      <code>{JSON.stringify({ page, pageSize })}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledPagination />,
};

export const PageSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Pagination totalItems={243} pageSizeOptions={[5, 25, 100]} />
      {/* With a single option there is nothing to choose, so the size field is not rendered. */}
      <Pagination totalItems={243} pageSizeOptions={[25]} />
    </div>
  ),
};

export const ManyPages: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Pagination totalItems={5000} defaultPage={250} siblings={1} />
      <Pagination totalItems={5000} defaultPage={250} siblings={2} />
    </div>
  ),
};

export const FewPages: Story = {
  args: { totalItems: 25 },
};

export const Empty: Story = {
  args: { totalItems: 0 },
};

export const Simple: Story = {
  args: { variant: "simple", defaultPage: 3 },
  parameters: {
    docs: {
      description: {
        story: "The compact bar: only the previous arrow, a page indicator and the next arrow, for places with little room.",
      },
    },
  },
};

export const SimpleInNarrowContainer: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* A card-width column: the simple bar stays on one row where the full bar wraps. */}
      <div style={{ width: "220px" }}>
        <Pagination totalItems={243} variant="simple" />
      </div>
      <div style={{ width: "220px" }}>
        <Pagination totalItems={243} variant="simple" pageStatusLabel={({ page, pageCount }) => `${page} / ${pageCount}`} />
      </div>
      <div style={{ width: "220px" }}>
        <Pagination totalItems={243} />
      </div>
    </div>
  ),
};
