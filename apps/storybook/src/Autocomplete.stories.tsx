import type { Meta, StoryObj } from "@storybook/react-vite";
import { Minus, Plus } from "@tandiko/icons";
import { Autocomplete, FormField } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/Autocomplete",
  component: Autocomplete,
  // `children` is required, so every story needs a set of options — the stories below that render
  // their own markup inherit these rather than repeating an args block they don't read.
  args: {
    "aria-label": "Size",
    placeholder: "Start typing…",
    children: [
      <Autocomplete.Option key="small" value="small" label="Small" />,
      <Autocomplete.Option key="medium" value="medium" label="Medium" />,
      <Autocomplete.Option key="large" value="large" label="Large" />,
    ],
  },
} satisfies Meta<typeof Autocomplete>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Enough room below the input for the listbox to open downwards rather than flipping. */
const stage = { padding: "1rem", minHeight: "20rem" };

export const Default: Story = {};

/** Typing narrows the list to the labels containing what was typed, anywhere in them and in any
 * case — "ar" leaves Large, "an" leaves Cranberry. */
export const Filtering: Story = {
  render: () => (
    <div style={stage}>
      <Autocomplete aria-label="Fruit" placeholder="Search fruit">
        <Autocomplete.Option value="apple" label="Apple" />
        <Autocomplete.Option value="apricot" label="Apricot" />
        <Autocomplete.Option value="banana" label="Banana" />
        <Autocomplete.Option value="blackberry" label="Blackberry" />
        <Autocomplete.Option value="cranberry" label="Cranberry" />
        {/* Skipped by the arrow keys and by the top-match highlight, and not selectable. */}
        <Autocomplete.Option value="durian" label="Durian" disabled />
      </Autocomplete>
    </div>
  ),
};

export const NoResults: Story = {
  name: "No results",
  render: () => (
    <div style={stage}>
      {/* Typing anything the labels don't contain — "xyz" — leaves the listbox open on its
          no-results message rather than closing it. */}
      <Autocomplete aria-label="Size" placeholder="Try typing xyz">
        <Autocomplete.Option value="small" label="Small" />
        <Autocomplete.Option value="medium" label="Medium" />
        <Autocomplete.Option value="large" label="Large" />
      </Autocomplete>
    </div>
  ),
};

export const MultiSelect: Story = {
  name: "Multi-select",
  render: () => (
    <div style={stage}>
      {/* Each selection becomes a chip before the input and clears the query, so the next one can
          be typed straight away; Backspace on the empty input removes the last chip. */}
      <Autocomplete multiple aria-label="Sizes" defaultValue={["small"]} placeholder="Add a size">
        <Autocomplete.Option value="small" label="Small" icon={Minus} />
        <Autocomplete.Option value="medium" label="Medium" />
        <Autocomplete.Option value="large" label="Large" icon={Plus} />
        <Autocomplete.Option value="custom" label="Custom" disabled />
      </Autocomplete>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);

    return (
      <div style={stage}>
        <Autocomplete aria-label="Size" value={value} onChange={setValue}>
          <Autocomplete.Option value="small" label="Small" />
          <Autocomplete.Option value="medium" label="Medium" />
          <Autocomplete.Option value="large" label="Large" />
        </Autocomplete>
        <p>Selected: {value ?? "nothing"}</p>
      </div>
    );
  },
};

export const InFormField: Story = {
  name: "In a FormField",
  render: () => (
    <div style={stage}>
      {/* The label, hint and error land on the input itself, which is the element that takes
          focus. */}
      <FormField label="Size" hint="Type to search" error="Pick a size to continue">
        <Autocomplete placeholder="Search sizes">
          <Autocomplete.Option value="small" label="Small" />
          <Autocomplete.Option value="medium" label="Medium" />
          <Autocomplete.Option value="large" label="Large" />
        </Autocomplete>
      </FormField>
    </div>
  ),
};
