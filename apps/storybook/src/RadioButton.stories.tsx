import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioButton, RadioGroup, Typography } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/RadioButton",
  component: RadioButton,
  args: { "aria-label": "Small", value: "small" },
} satisfies Meta<typeof RadioButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standalone: Story = {};

export const StandaloneChecked: Story = {
  name: "Standalone, checked",
  args: { defaultChecked: true },
};

export const StandaloneDisabled: Story = {
  name: "Standalone, disabled",
  args: { disabled: true },
};

export const Grouped: Story = {
  render: () => (
    <RadioGroup aria-label="Size" defaultValue="medium">
      <RadioButton aria-label="Small" value="small" />
      <RadioButton aria-label="Medium" value="medium" />
      <RadioButton aria-label="Large" value="large" />
    </RadioGroup>
  ),
};

export const GroupedWithDisabledOption: Story = {
  name: "Grouped, with a disabled option",
  render: () => (
    <RadioGroup aria-label="Size" defaultValue="small">
      <RadioButton aria-label="Small" value="small" />
      <RadioButton aria-label="Medium (out of stock)" value="medium" disabled />
      <RadioButton aria-label="Large" value="large" />
    </RadioGroup>
  ),
};

function ControlledGroup() {
  const [value, setValue] = useState("medium");

  return (
    <>
      <Typography variant="body-sm" color="secondary">
        Selected: {value}
      </Typography>
      <RadioGroup aria-label="Size" value={value} onChange={setValue}>
        <RadioButton aria-label="Small" value="small" />
        <RadioButton aria-label="Medium" value="medium" />
        <RadioButton aria-label="Large" value="large" />
      </RadioGroup>
    </>
  );
}

export const GroupedControlled: Story = {
  name: "Grouped, controlled",
  render: () => <ControlledGroup />,
};
