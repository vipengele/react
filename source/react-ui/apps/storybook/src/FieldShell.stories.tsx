import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { FieldShell } from "@vipengele/react-ui";

/**
 * The shell draws the field's border, background and states; the control it wraps keeps its own
 * element and typography. These stories wrap a bare `<input>` stripped of its native chrome, so
 * what is on screen is the shell's own box and nothing else.
 */
const control = {
  border: "none",
  background: "transparent",
  outline: "none",
  padding: 0,
  font: "inherit",
  color: "var(--vpg-ink)",
};

const meta = {
  title: "Components/FieldShell",
  component: FieldShell,
  // `children` is required: the shell renders no field element of its own.
  args: {
    children: <input aria-label="Search" placeholder="Search projects" style={control} />,
  },
} satisfies Meta<typeof FieldShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "No adornments",
};

export const Leading: Story = {
  name: "Leading adornment",
  args: {
    leading: <Icon icon={Search} />,
  },
};

export const Trailing: Story = {
  name: "Trailing adornment",
  args: {
    trailing: <kbd>⌘K</kbd>,
  },
};

export const BothAdornments: Story = {
  name: "Both adornments",
  args: {
    leading: <Icon icon={Search} />,
    trailing: <kbd>⌘K</kbd>,
  },
};

/** A control whose listbox is open marks the field with the accent border, however it was opened —
 * a pointer press matches no `:focus-visible`, so without this the field gives no sign that the
 * listbox is its own. */
export const Open: Story = {
  name: "Open control",
  args: {
    leading: <Icon icon={Search} />,
    children: <input aria-label="Search" role="combobox" aria-expanded="true" defaultValue="Search projects" style={control} />,
  },
};

export const Invalid: Story = {
  name: "Invalid control",
  args: {
    leading: <Icon icon={Search} />,
    children: <input aria-label="Search" aria-invalid defaultValue="???" style={control} />,
  },
};

export const Disabled: Story = {
  name: "Disabled control",
  args: {
    leading: <Icon icon={Search} />,
    children: <input aria-label="Search" disabled defaultValue="Search projects" style={control} />,
  },
};

/** A disabled button in an adornment slot is the adornment's own state: the shell stays undimmed,
 * and only the wrapped control's own disabledness dims the field. */
export const DisabledAdornmentButton: Story = {
  name: "Disabled adornment button",
  args: {
    trailing: (
      <button type="button" disabled>
        Clear
      </button>
    ),
  },
};
