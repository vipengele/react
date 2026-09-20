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

/** Enough room below the trigger for the listbox to open downwards rather than flipping. Every
 * story's field is a `FieldShell` — the same border, fill, focus ring and hover as a `TextField`
 * — with a chevron at its trailing edge. */
const stage = { padding: "1rem", minHeight: "20rem" };

export const Default: Story = {};

export const WithIcons: Story = {
  name: "With icons",
  render: () => (
    <div style={stage}>
      {/* The selected option's icon in the trigger renders at the same 16px step as the icon
          beside it in the list. */}
      <Dropdown aria-label="Adjustment" defaultValue="add">
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

const fruits = ["Apple", "Banana", "Cherry", "Damson", "Elderberry", "Fig", "Grape", "Honeydew"];

export const ManySelections: Story = {
  name: "Many selections",
  render: () => (
    <div style={stage}>
      {/* The chips wrap onto further lines inside the field's border, and the field grows
          downwards rather than past the width of its container; the trigger and its chevron keep
          the space to the right of them. */}
      <div style={{ width: "16rem" }}>
        <Dropdown multiple aria-label="Fruit" defaultValue={fruits.map((fruit) => fruit.toLowerCase())} placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

export const ChipRows: Story = {
  name: "Chip rows",
  render: () => (
    <div style={stage}>
      {/* A field with no chips, one row of 24px chips and two wrapped rows, at one width. The
          first two stand at the same control-step height, so choosing the first option never
          makes the field jump; the wrapped field grows by a row and keeps air between its chips
          and its border. The 4 chips in the last field wrap to two rows beside the trigger. */}
      <div style={{ width: "16rem", display: "grid", gap: "1rem" }}>
        <Dropdown multiple aria-label="No fruit" defaultValue={[]} placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
        <Dropdown multiple aria-label="One row of fruit" defaultValue={["apple", "fig"]}>
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
        <Dropdown multiple aria-label="Two rows of fruit" defaultValue={fruits.slice(0, 4).map((fruit) => fruit.toLowerCase())}>
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

export const NarrowContainer: Story = {
  name: "Narrow container",
  render: () => (
    <div style={stage}>
      {/* A container narrower than the field would otherwise need: the field still fills it
          exactly, and a chip label too long for the field is cut short. */}
      <div style={{ width: "9rem", display: "grid", gap: "1rem" }}>
        <Dropdown aria-label="Size" defaultValue="medium">
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
        <Dropdown multiple aria-label="Region" defaultValue={["emea"]}>
          <Dropdown.Option value="emea" label="Europe, the Middle East and Africa" />
          <Dropdown.Option value="apac" label="Asia-Pacific" />
        </Dropdown>
      </div>
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

function InFormFieldDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={stage}>
      {/* The label, hint and error land on the trigger itself, which is the element that takes
          focus — a `<label for>` cannot name a `<div role="combobox">`. The error is driven by
          real selection state, not a hardcoded string, so picking an option clears it — the
          same way a consumer wires validation in a real form. */}
      <FormField label="Size" hint="Affects packaging" error={value === null ? "Pick a size to continue" : undefined}>
        <Dropdown placeholder="Choose a size" value={value} onChange={setValue}>
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
      </FormField>
    </div>
  );
}

export const InFormField: Story = {
  name: "In a FormField",
  render: () => <InFormFieldDemo />,
};
