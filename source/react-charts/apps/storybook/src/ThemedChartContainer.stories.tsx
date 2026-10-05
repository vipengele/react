import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemedChartContainer } from "@vipengele/react-charts";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const data = [
  { month: "Jan", visits: 40 },
  { month: "Feb", visits: 65 },
  { month: "Mar", visits: 52 },
  { month: "Apr", visits: 88 },
];

const meta: Meta<typeof ThemedChartContainer> = {
  title: "Components/ThemedChartContainer",
  component: ThemedChartContainer,
  args: {
    height: 240,
    children: (
      <LineChart data={data}>
        <CartesianGrid stroke="var(--vpg-border)" />
        <XAxis dataKey="month" stroke="currentColor" />
        <YAxis stroke="currentColor" />
        <Line type="monotone" dataKey="visits" stroke="currentColor" strokeWidth={2} />
      </LineChart>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "32rem", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ThemedChartContainer>;

export const Default: Story = {};

export const Aspect: Story = {
  args: { height: undefined, aspect: 2 },
};
