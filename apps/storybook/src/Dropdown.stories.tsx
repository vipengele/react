import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Minus, Plus, User } from "@tandiko/icons";
import { Dropdown, FormField } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  // `children` is required, so every story needs a set of options — the stories below that render
  // their own markup inherit these rather than repeating an args block they don't read.
  args: {
    "aria-label": "Size",
    defaultValue: "medium",
    children: [
      <Dropdown.Option key="small" value="small" label="Small" />,
      <Dropdown.Option key="medium" value="medium" label="Medium" />,
      <Dropdown.Option key="large" value="large" label="Large" />,
    ],
  },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Enough room below the trigger for the listbox to open downwards rather than flipping. */
const stage = { padding: "1rem", minHeight: "20rem" };

export const Default: Story = {};

export const WithIcons: Story = {
  name: "With icons",
  render: () => (
    <div style={stage}>
      <Dropdown aria-label="Adjustment" placeholder="Choose an action">
        <Dropdown.Option value="add" label="Add" icon={Plus} />
        <Dropdown.Option value="remove" label="Remove" icon={Minus} />
        <Dropdown.Option value="approve" label="Approve" icon={Check} />
        <Dropdown.Option value="assign" label="Assign" icon={User} />
      </Dropdown>
    </div>
  ),
};

export const DisabledOptions: Story = {
  name: "Disabled options",
  render: () => (
    <div style={stage}>
      <Dropdown aria-label="Plan" placeholder="Choose a plan">
        <Dropdown.Option value="free" label="Free" />
        <Dropdown.Option value="pro" label="Pro" />
        {/* Skipped by the arrow keys and by type-ahead, and not selectable. */}
        <Dropdown.Option value="enterprise" label="Enterprise" disabled />
      </Dropdown>
    </div>
  ),
};

export const MultiSelect: Story = {
  name: "Multi-select",
  render: () => (
    <div style={stage}>
      <Dropdown multiple aria-label="Sizes" defaultValue={["small"]} placeholder="Pick sizes">
        <Dropdown.Option value="small" label="Small" icon={Minus} />
        <Dropdown.Option value="medium" label="Medium" />
        <Dropdown.Option value="large" label="Large" icon={Plus} />
        <Dropdown.Option value="custom" label="Custom" disabled />
      </Dropdown>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);

    return (
      <div style={stage}>
        <Dropdown aria-label="Size" value={value} onChange={setValue}>
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
        <p>Selected: {value ?? "nothing"}</p>
      </div>
    );
  },
};

export const InFormField: Story = {
  name: "In a FormField",
  render: () => (
    <div style={stage}>
      {/* The label, hint and error land on the trigger itself, which is the element that takes
          focus — a `<label for>` cannot name a `<div role="combobox">`. */}
      <FormField label="Size" hint="Affects packaging" error="Pick a size to continue">
        <Dropdown placeholder="Choose a size">
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
      </FormField>
    </div>
  ),
};
