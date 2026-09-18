import type { Meta, StoryObj } from "@storybook/react-vite";
import { Minus, Plus } from "@tandiko/icons";
import { Autocomplete, type AutocompleteAsyncOption, FormField } from "@tandiko/ui";
import { useState } from "react";

/** Stands in for a remote catalog: filters server-side and resolves after a simulated network
 * delay, so the story exercises the same loading state a real API call would. */
const catalog: AutocompleteAsyncOption[] = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "mx", label: "Mexico" },
  { value: "br", label: "Brazil" },
  { value: "ar", label: "Argentina" },
  { value: "gb", label: "United Kingdom" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "jp", label: "Japan" },
  { value: "au", label: "Australia" },
];

function fetchCountries(query: string): Promise<AutocompleteAsyncOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(catalog.filter((country) => country.label.toLowerCase().includes(query.toLowerCase())));
    }, 400);
  });
}

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

/** Enough room below the input for the listbox to open downwards rather than flipping. Every
 * story's field is a `FieldShell` — the same border, fill, focus ring and hover as a `TextField`
 * — with a chevron at its trailing edge that opens the listbox when clicked. */
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

const fruits = ["Apple", "Banana", "Cherry", "Damson", "Elderberry", "Fig", "Grape", "Honeydew"];

export const ManySelections: Story = {
  name: "Many selections",
  render: () => (
    <div style={stage}>
      {/* The chips wrap onto further lines inside the field's border, and the field grows
          downwards rather than past the width of its container; the input keeps the space to the
          right of them for the next query, and the chevron keeps the trailing edge. */}
      <div style={{ width: "16rem" }}>
        <Autocomplete multiple aria-label="Fruit" defaultValue={fruits.map((fruit) => fruit.toLowerCase())} placeholder="Add fruit">
          {fruits.map((fruit) => (
            <Autocomplete.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Autocomplete>
      </div>
    </div>
  ),
};

export const NarrowContainer: Story = {
  name: "Narrow container",
  render: () => (
    <div style={stage}>
      {/* A container narrower than the field's 12rem floor: the floor yields and the field takes
          the container's width, and a chip label too long for the field is cut short. */}
      <div style={{ width: "9rem", display: "grid", gap: "1rem" }}>
        <Autocomplete aria-label="Size" placeholder="Size">
          <Autocomplete.Option value="small" label="Small" />
          <Autocomplete.Option value="medium" label="Medium" />
          <Autocomplete.Option value="large" label="Large" />
        </Autocomplete>
        <Autocomplete multiple aria-label="Region" defaultValue={["emea"]}>
          <Autocomplete.Option value="emea" label="Europe, the Middle East and Africa" />
          <Autocomplete.Option value="apac" label="Asia-Pacific" />
        </Autocomplete>
      </div>
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

function InFormFieldDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={stage}>
      {/* The label, hint and error land on the input itself, which is the element that takes
          focus. The error is driven by real selection state, not a hardcoded string, so picking
          an option clears it — the same way a consumer wires validation in a real form. */}
      <FormField label="Size" hint="Type to search" error={value === null ? "Pick a size to continue" : undefined}>
        <Autocomplete placeholder="Search sizes" value={value} onChange={setValue}>
          <Autocomplete.Option value="small" label="Small" />
          <Autocomplete.Option value="medium" label="Medium" />
          <Autocomplete.Option value="large" label="Large" />
        </Autocomplete>
      </FormField>
    </div>
  );
}

export const InFormField: Story = {
  name: "In a FormField",
  render: () => <InFormFieldDemo />,
};

export const AsyncDataSource: Story = {
  name: "Async data source (API)",
  render: () => (
    <div style={stage}>
      <Autocomplete aria-label="Country" placeholder="Search countries…" loadOptions={fetchCountries} />
    </div>
  ),
};

export const AsyncMultiSelect: Story = {
  name: "Async data source, multi-select",
  render: () => (
    <div style={stage}>
      <Autocomplete multiple aria-label="Countries" placeholder="Search countries…" loadOptions={fetchCountries} />
    </div>
  ),
};
