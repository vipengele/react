import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatTile, type StatTileNeutralProps } from "@vipengele/react-ui";

const meta: Meta<StatTileNeutralProps> = {
  title: "Components/StatTile",
  component: StatTile,
  args: { label: "Line coverage", value: "92.4%", supporting: "Up 1.2 points this week" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "20rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<StatTileNeutralProps>;

export const Default: Story = {};

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem" }}>
      <StatTile {...args} tone="neutral" label="Neutral" />
      <StatTile {...args} tone="success" toneLabel="Passing" label="Success" />
      <StatTile {...args} tone="warning" toneLabel="Below target" label="Warning" />
      <StatTile {...args} tone="info" toneLabel="For information" label="Info" />
      <StatTile {...args} tone="danger" toneLabel="Failing" label="Danger" />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "60rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const LongLabel: Story = {
  args: {
    label: "Branch coverage across every package in the workspace, excluding generated files",
    supporting: "A supporting line that is long enough to wrap onto a second line inside the tile",
  },
};

export const MissingValue: Story = {
  args: { value: null, supporting: "No data for this period" },
};

export const CustomPlaceholder: Story = {
  args: { value: undefined, placeholder: "n/a", supporting: "Not reported" },
};

export const WithVisual: Story = {
  args: {
    visual: (
      <svg width="64" height="32" viewBox="0 0 64 32" role="img" aria-label="Trend placeholder">
        <polyline
          points="0,24 12,18 24,22 36,10 48,14 64,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};
