import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info, Search, User } from "@vipengele/react-icons";
import { SegmentedControl, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const options = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  args: { "aria-label": "Range", options },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: "week" },
};

function ControlledSegmentedControl() {
  const [value, setValue] = useState("week");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <Typography variant="body-sm" color="secondary">
        Selected: {value}
      </Typography>
      <SegmentedControl aria-label="Range" options={options} value={value} onChange={setValue} />
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledSegmentedControl />,
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <SegmentedControl key={size} {...args} aria-label={`Range, ${size}`} size={size} defaultValue="week" />
      ))}
    </div>
  ),
};

export const FullWidth: Story = {
  name: "Full width",
  render: (args) => (
    <div style={{ width: "28rem", maxWidth: "100%" }}>
      <SegmentedControl
        {...args}
        fullWidth
        defaultValue="all"
        options={[
          { value: "all", label: "All" },
          { value: "in-progress", label: "In progress" },
          { value: "awaiting-review", label: "Awaiting review" },
        ]}
      />
    </div>
  ),
};

export const DisabledOption: Story = {
  name: "Disabled option",
  args: {
    defaultValue: "day",
    options: [
      { value: "day", label: "Day" },
      { value: "week", label: "Week", disabled: true },
      { value: "month", label: "Month" },
    ],
  },
};

// Each segment's label is absent, so `aria-label` names its radio.
export const IconOnly: Story = {
  name: "Icon only",
  args: {
    "aria-label": "Section",
    defaultValue: "profile",
    options: [
      { value: "profile", icon: User, "aria-label": "Profile" },
      { value: "search", icon: Search, "aria-label": "Search" },
      { value: "details", icon: Info, "aria-label": "Details" },
    ],
  },
};
