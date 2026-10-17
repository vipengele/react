import type { Meta, StoryObj } from "@storybook/react-vite";
import { StackedBarChart, type StackedBarChartProps, type StackedBarChartRow } from "@vipengele/react-charts";

const killed = [41, 44, 47, 46, 52, 55, 58, 57, 61, 63, 66, 70];
const timedOut = [6, 5, 5, 7, 4, 4, 3, 5, 3, 3, 2, 2];
const survived = [18, 16, 15, 14, 12, 11, 9, 9, 8, 6, 6, 4];
const unviable = [5, 5, 6, 5, 6, 6, 7, 6, 7, 8, 7, 8];

/** Mutants by outcome for a history of mutation-testing runs, numbered from 1. */
const runs: StackedBarChartRow[] = killed.map((count, i) => ({
  run: i + 1,
  killed: count,
  timedOut: timedOut[i],
  survived: survived[i],
  unviable: unviable[i],
}));

/** Sixty-four runs, so the bars narrow to fit the plot. */
const manyRuns: StackedBarChartRow[] = Array.from({ length: 64 }, (_, i) => ({
  run: i + 1,
  killed: Math.round(40 + i * 0.5 + 6 * Math.sin(i / 3)),
  timedOut: 3 + (i % 4),
  survived: Math.max(2, Math.round(20 - i * 0.2 + 3 * Math.cos(i / 4))),
  unviable: 5 + (i % 3),
}));

const formatRun = (x: number) => `Run ${x}`;

const outcomes: StackedBarChartProps["series"] = [
  { key: "killed", label: "Killed", color: "success" },
  { key: "timedOut", label: "Timed out", color: "warning" },
  { key: "survived", label: "Survived", color: "danger" },
  { key: "unviable", label: "Unviable", color: "neutral" },
];

const meta: Meta<typeof StackedBarChart> = {
  title: "Components/StackedBarChart",
  component: StackedBarChart,
  parameters: {
    docs: {
      description: {
        component:
          "Counts split by category over x, such as mutants by outcome per run: each x value is one bar, and its series stack in order. Status is set by the caller and never inferred from the data.",
      },
    },
  },
  args: {
    data: runs,
    xKey: "run",
    series: outcomes,
    height: 240,
    formatX: formatRun,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "36rem", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StackedBarChart>;

export const Stacked: Story = {};

export const ManyCategories: Story = {
  args: { data: manyRuns },
};

export const Loading: Story = {
  args: { status: "loading" },
};

export const Empty: Story = {
  args: { status: "empty", data: [] },
};

export const ErrorState: Story = {
  args: { status: "error" },
};

export const CustomMessages: Story = {
  args: {
    status: "empty",
    data: [],
    messages: { empty: "No runs recorded yet" },
  },
};
