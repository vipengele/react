import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox, FieldSet, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Accept the terms" },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const WithLabel: Story = {
  name: "With label",
  args: { "aria-label": undefined, label: "Accept the terms" },
};

function ControlledSelectAll() {
  const [selected, setSelected] = useState<string[]>(["email"]);
  const options = ["email", "sms", "push"];
  const allSelected = selected.length === options.length;

  return (
    <>
      <Typography variant="body-sm" color="secondary">
        Selected: {selected.join(", ") || "none"}
      </Typography>
      <Checkbox
        label="All channels"
        checked={allSelected}
        indeterminate={selected.length > 0 && !allSelected}
        onChange={() => setSelected(allSelected ? [] : options)}
      />
      {options.map((option) => (
        <Checkbox
          key={option}
          label={option}
          checked={selected.includes(option)}
          onChange={(event) => setSelected(event.target.checked ? [...selected, option] : selected.filter((entry) => entry !== option))}
        />
      ))}
    </>
  );
}

export const Controlled: Story = {
  render: () => <ControlledSelectAll />,
};

export const InAFieldSet: Story = {
  name: "In a FieldSet",
  render: () => (
    <FieldSet legend="Notify me by">
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="SMS" />
      <Checkbox label="Push" />
    </FieldSet>
  ),
};
