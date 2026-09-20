import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Minus, Plus, User } from "@tandiko/icons";
import { Dropdown, type DropdownAsyncOption, type DropdownValue, FormField } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  // `children` is required, so every story needs a set of options — the stories below that render
  // their own markup inherit these rather than repeating an args block they don't read.
  args: {
    "aria-label": "Size",
    defaultValue: { value: "medium", label: "Medium" },
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

/** The popover opens under a search row: a magnifier, the `searchPlaceholder` hint and a divider,
 * then the options. Typing filters them by any fragment of a label, the caret stays in the input
 * while the arrow keys move the highlight, and Escape or a pick hands focus back to the trigger. */
export const Default: Story = {};

export const WithIcons: Story = {
  name: "With icons",
  render: () => (
    <div style={stage}>
      {/* The selected option's icon in the trigger renders at the same 16px step as the icon
          beside it in the list. */}
      <Dropdown aria-label="Adjustment" defaultValue={{ value: "add", label: "Add", icon: Plus }}>
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
        {/* Skipped by the arrow keys, never the top match a query highlights, and not
            selectable. */}
        <Dropdown.Option value="enterprise" label="Enterprise" disabled />
      </Dropdown>
    </div>
  ),
};

export const MultiSelect: Story = {
  name: "Multi-select",
  render: () => (
    <div style={stage}>
      {/* Picking leaves the popover open, so a query can be replaced and the next option picked
          without reopening; a selection the query filters out of the list keeps its chip. */}
      <Dropdown multiple aria-label="Sizes" defaultValue={[{ value: "small", label: "Small", icon: Minus }]} placeholder="Pick sizes">
        <Dropdown.Option value="small" label="Small" icon={Minus} />
        <Dropdown.Option value="medium" label="Medium" />
        <Dropdown.Option value="large" label="Large" icon={Plus} />
        <Dropdown.Option value="custom" label="Custom" disabled />
      </Dropdown>
    </div>
  ),
};

const fruits = ["Apple", "Banana", "Cherry", "Damson", "Elderberry", "Fig", "Grape", "Honeydew"];

/** A fruit as the value object `Dropdown` takes and reports for its option. */
function fruitValue(fruit: string): DropdownValue {
  return { value: fruit.toLowerCase(), label: fruit };
}

const fruitValues = fruits.map(fruitValue);

export const ManySelections: Story = {
  name: "Many selections",
  render: () => (
    <div style={stage}>
      {/* The chips that fit stay on one row and the rest give way to an indicator counting them,
          so the field stands at the control step however much is selected; the trigger and its
          chevron keep the space to the right of them. Drag the preview narrower and the row
          re-measures: chips leave it one by one and the count goes up.

          Hover the indicator to read the selections it stands for. It takes no tab stop — one of
          those selections is removed by unchecking it in the listbox, since the chip carrying it
          is not on screen to remove it from — and a screen reader hears all of them in the
          trigger's description. */}
      <div style={{ width: "16rem" }}>
        <Dropdown multiple aria-label="Fruit" defaultValue={fruitValues} placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

export const WrappedChips: Story = {
  name: "Wrapped chips",
  render: () => (
    <div style={stage}>
      {/* `wrapChips` measures nothing: every chip shows, wrapping onto further lines inside the
          field's border, and the field grows downwards rather than past the width of its
          container. The same selection at the same width as "Many selections" above. */}
      <div style={{ width: "16rem" }}>
        <Dropdown wrapChips multiple aria-label="Fruit" defaultValue={fruitValues} placeholder="Pick fruit">
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
      {/* A field with no chips, one row of 24px chips, a selection collapsed onto that one row,
          and the same selection wrapped, at one width. The first three stand at the same
          control-step height, so neither choosing the first option nor choosing four more makes
          the field jump; only the wrapping field grows, by a row, keeping air between its chips
          and its border. */}
      <div style={{ width: "16rem", display: "grid", gap: "1rem" }}>
        <Dropdown multiple aria-label="No fruit" defaultValue={[]} placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
        <Dropdown multiple aria-label="One row of fruit" defaultValue={[fruitValue("Apple"), fruitValue("Fig")]}>
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
        <Dropdown multiple aria-label="Collapsed fruit" defaultValue={fruitValues.slice(0, 4)}>
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
        <Dropdown wrapChips multiple aria-label="Two rows of fruit" defaultValue={fruitValues.slice(0, 4)}>
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
        <Dropdown aria-label="Size" defaultValue={{ value: "medium", label: "Medium" }}>
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
        <Dropdown multiple aria-label="Region" defaultValue={[{ value: "emea", label: "Europe, the Middle East and Africa" }]}>
          <Dropdown.Option value="emea" label="Europe, the Middle East and Africa" />
          <Dropdown.Option value="apac" label="Asia-Pacific" />
        </Dropdown>
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<DropdownValue | null>(null);

    return (
      <div style={stage}>
        <Dropdown aria-label="Size" value={value} onChange={setValue}>
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="medium" label="Medium" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>
        <p>Selected: {value?.label ?? "nothing"}</p>
      </div>
    );
  },
};

function InFormFieldDemo() {
  const [value, setValue] = useState<DropdownValue | null>(null);
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

function MultiSelectInFormFieldDemo() {
  const [value, setValue] = useState<DropdownValue[]>(fruitValues);
  return (
    <div style={stage}>
      {/* Three descriptions reach the trigger through one `aria-describedby`: the hint's, the
          error's, and the selection's — which names every fruit picked, including the ones behind
          the indicator. Inspect the trigger to read the three ids side by side. */}
      <div style={{ width: "18rem" }}>
        <FormField label="Fruit" hint="Anything in season" error={value.length === 0 ? "Pick at least one" : undefined}>
          <Dropdown multiple placeholder="Pick fruit" value={value} onChange={setValue}>
            {fruits.map((fruit) => (
              <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
            ))}
          </Dropdown>
        </FormField>
      </div>
    </div>
  );
}

export const MultiSelectInFormField: Story = {
  name: "Multi-select in a FormField",
  render: () => <MultiSelectInFormFieldDemo />,
};

export const CustomSearchHint: Story = {
  name: "Custom search hint",
  render: () => (
    <div style={stage}>
      {/* `searchPlaceholder` is the input's hint and its accessible name, for a list whose
          contents the field alone does not describe. */}
      <div style={{ width: "18rem" }}>
        <Dropdown aria-label="Assignee" searchPlaceholder="Search people" placeholder="Unassigned">
          <Dropdown.Option value="ada" label="Ada Lovelace" icon={User} />
          <Dropdown.Option value="grace" label="Grace Hopper" icon={User} />
          <Dropdown.Option value="alan" label="Alan Turing" icon={User} />
        </Dropdown>
      </div>
    </div>
  ),
};

export const SearchFlow: Story = {
  name: "Search flow",
  render: () => (
    <div style={stage}>
      {/* Every keystroke belongs to the search once a search row exists. Typing a character on
          the closed trigger opens the popover and seeds the query with it; picking an option
          keeps the popover open and clears the query, so the next character searches every fruit
          again; Backspace in an empty query removes the last chip, which is `multiple`'s own —
          single-select's `onChange` has no empty selection to report; and closing the popover
          leaves the query empty for the next open. */}
      <div style={{ width: "18rem" }}>
        <Dropdown multiple aria-label="Fruit" placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

export const Grouped: Story = {
  render: () => (
    <div style={stage}>
      {/* An ungrouped option, then two groups. The headings are not options: the arrow keys pass
          from one group's last option straight to the next group's first, and Home and End reach
          the same two options they reach with no group declared. The line between the groups is
          drawn by the group that follows another, so there is none above the first or below the
          last; narrowing the query to "lim" leaves the Stone group with no option and it goes
          entirely. */}
      <div style={{ width: "18rem" }}>
        <Dropdown aria-label="Fruit" placeholder="Pick fruit">
          <Dropdown.Option value="all" label="All fruit" />
          <Dropdown.Group label="Citrus">
            <Dropdown.Option value="lemon" label="Lemon" />
            <Dropdown.Option value="lime" label="Lime" />
          </Dropdown.Group>
          <Dropdown.Group label="Stone">
            <Dropdown.Option value="peach" label="Peach" />
            <Dropdown.Option value="plum" label="Plum" />
          </Dropdown.Group>
        </Dropdown>
      </div>
    </div>
  ),
};

export const NoResults: Story = {
  name: "No results",
  render: () => (
    <div style={stage}>
      {/* A query matching nothing says so: a blank popover reads as a control that has stopped
          answering. Type anything that is not a fruit here to see it. */}
      <div style={{ width: "18rem" }}>
        <Dropdown aria-label="Fruit" placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

export const WithoutSearch: Story = {
  name: "Without search",
  render: () => (
    <div style={stage}>
      {/* `searchable={false}` opens straight onto the options, and real focus stays on the
          trigger: typing a character there jumps the highlight to the next label starting with
          it, and `Space` selects the highlighted option. */}
      <div style={{ width: "18rem" }}>
        <Dropdown searchable={false} aria-label="Fruit" placeholder="Pick fruit">
          {fruits.map((fruit) => (
            <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />
          ))}
        </Dropdown>
      </div>
    </div>
  ),
};

/** Stands in for a remote catalog: matches server-side and resolves after a simulated network
 * delay, so the story exercises the same loading state a real API call would. */
const catalog: DropdownAsyncOption[] = [
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

function fetchCountries(query: string): Promise<DropdownAsyncOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(catalog.filter((country) => country.label.toLowerCase().includes(query.toLowerCase())));
    }, 400);
  });
}

export const AsyncDataSource: Story = {
  name: "Async data source (API)",
  render: () => (
    <div style={stage}>
      {/* The search row calls `loadOptions` once the query settles, shows the loading message
          while the call is in flight and renders the results as the API returned them. The
          selection below it was handed straight to `Dropdown`: it carries its own label, so the
          trigger names it with nothing fetched yet. */}
      <div style={{ width: "18rem" }}>
        <Dropdown
          aria-label="Country"
          placeholder="Pick a country"
          defaultValue={{ value: "jp", label: "Japan" }}
          loadOptions={fetchCountries}
        />
      </div>
    </div>
  ),
};

/** The same catalog with a continent on most entries, deliberately interleaved: the two entries
 * carrying no group at all come first whatever their place here, and the groups follow in the
 * order their own first entry appears. */
const groupedCatalog: DropdownAsyncOption[] = [
  { value: "us", label: "United States", group: "Americas" },
  { value: "gb", label: "United Kingdom", group: "Europe" },
  { value: "worldwide", label: "Worldwide" },
  { value: "ca", label: "Canada", group: "Americas" },
  { value: "jp", label: "Japan", group: "Asia-Pacific" },
  { value: "fr", label: "France", group: "Europe" },
  { value: "unassigned", label: "Unassigned" },
  { value: "au", label: "Australia", group: "Asia-Pacific" },
];

function fetchRegions(query: string): Promise<DropdownAsyncOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(groupedCatalog.filter((country) => country.label.toLowerCase().includes(query.toLowerCase())));
    }, 400);
  });
}

export const AsyncGrouped: Story = {
  name: "Async data source, grouped",
  render: () => (
    <div style={stage}>
      {/* A result's `group` is the heading it stands under. The ungrouped results come first, the
          groups follow in the order their first result arrived, and a group the next search
          returns nothing for disappears with its heading and its separator. */}
      <div style={{ width: "18rem" }}>
        <Dropdown aria-label="Region" placeholder="Pick a region" loadOptions={fetchRegions} />
      </div>
    </div>
  ),
};

export const AsyncMultiSelect: Story = {
  name: "Async data source, multi-select",
  render: () => (
    <div style={stage}>
      {/* Each pick clears the query and keeps the popover open, and its chip keeps the label it
          was picked with however far the next search moves away from it. */}
      <div style={{ width: "18rem" }}>
        <Dropdown multiple aria-label="Countries" placeholder="Pick countries" loadOptions={fetchCountries} />
      </div>
    </div>
  ),
};
