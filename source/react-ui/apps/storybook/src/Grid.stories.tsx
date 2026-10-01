import type { Meta, StoryObj } from "@storybook/react-vite";
import { Grid, GridItem } from "@vipengele/react-ui";
import type { ReactNode } from "react";

const spaceTokens = ["none", "space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8"] as const;

function Cell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--vpg-surface-raised)",
        color: "var(--vpg-ink)",
        border: "1px solid var(--vpg-border)",
        borderRadius: "var(--vpg-radius)",
        padding: "var(--vpg-space-3)",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function cells(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const label = `Cell ${index + 1}`;
    return <Cell key={label}>{label}</Cell>;
  });
}

const meta = {
  title: "Layout/Grid",
  component: Grid,
  argTypes: {
    gap: { control: "select", options: spaceTokens },
    rowGap: { control: "select", options: spaceTokens },
    columnGap: { control: "select", options: spaceTokens },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FixedColumns: Story = {
  parameters: {
    docs: {
      description: {
        story: "`columns` repeats that many equal-width tracks. It is mutually exclusive with `minColumnWidth`.",
      },
    },
  },
  args: { columns: 3 },
  argTypes: {
    columns: { control: { type: "number", min: 1, step: 1 } },
    minColumnWidth: { table: { disable: true } },
  },
  render: (args) => <Grid {...args}>{cells(6)}</Grid>,
};

export const AutoFit: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Without `columns`, the grid fits as many tracks as its container allows, none narrower than the `minColumnWidth` step (`md` by default). Resize the canvas to watch the track count change with no breakpoint.",
      },
    },
  },
  args: { minColumnWidth: "md" },
  argTypes: {
    minColumnWidth: { control: "select", options: ["sm", "md", "lg", "xl"] },
    columns: { table: { disable: true } },
  },
  render: (args) => <Grid {...args}>{cells(8)}</Grid>,
};

export const ColumnWidthSteps: Story = {
  name: "Column width steps",
  parameters: {
    docs: {
      description: {
        story: "Each `minColumnWidth` step reads the theme's `--vpg-column-*` token, so larger steps fit fewer, wider tracks.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--vpg-space-6)" }}>
      {(["sm", "md", "lg", "xl"] as const).map((step) => (
        <div key={step}>
          <p style={{ color: "var(--vpg-ink-muted)", margin: "0 0 var(--vpg-space-2)" }}>minColumnWidth="{step}"</p>
          <Grid minColumnWidth={step}>{cells(6)}</Grid>
        </div>
      ))}
    </div>
  ),
};

export const Gap: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`gap` sets the space between rows and columns, `space-4` by default. `rowGap` and `columnGap` override it on a single axis.",
      },
    },
  },
  args: { columns: 3, gap: "space-4" },
  argTypes: {
    columns: { control: { type: "number", min: 1, step: 1 } },
    minColumnWidth: { table: { disable: true } },
  },
  render: (args) => <Grid {...args}>{cells(6)}</Grid>,
};

export const RowAndColumnGap: Story = {
  name: "Row and column gap",
  parameters: {
    docs: {
      description: {
        story: "`rowGap` and `columnGap` each override `gap` on their own axis.",
      },
    },
  },
  args: { columns: 3, gap: "space-2", rowGap: "space-6", columnGap: "space-1" },
  argTypes: {
    columns: { control: { type: "number", min: 1, step: 1 } },
    minColumnWidth: { table: { disable: true } },
  },
  render: (args) => <Grid {...args}>{cells(6)}</Grid>,
};

export const ItemSpans: Story = {
  name: "Item spans",
  parameters: {
    docs: {
      description: {
        story:
          "`GridItem` places one child with `colSpan` and `rowSpan`. `colSpan` is meant for fixed-`columns` grids, where the track count is known. In an auto-fit grid it is plain CSS behaviour: a span wider than the tracks that currently fit adds implicit tracks and can overflow the container.",
      },
    },
  },
  args: { columns: 4 },
  argTypes: {
    columns: { control: { type: "number", min: 1, step: 1 } },
    minColumnWidth: { table: { disable: true } },
  },
  render: (args) => (
    <Grid {...args}>
      <GridItem colSpan={2}>
        <Cell>colSpan 2</Cell>
      </GridItem>
      <GridItem rowSpan={2}>
        <Cell>rowSpan 2</Cell>
      </GridItem>
      <GridItem>
        <Cell>Cell</Cell>
      </GridItem>
      <GridItem colSpan={2} rowSpan={2}>
        <Cell>colSpan 2, rowSpan 2</Cell>
      </GridItem>
      <GridItem>
        <Cell>Cell</Cell>
      </GridItem>
      <GridItem>
        <Cell>Cell</Cell>
      </GridItem>
    </Grid>
  ),
};
