import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { TextField } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/TextField",
  component: TextField,
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Email",
    placeholder: "you@example.com",
  },
};

export const Password: Story = {
  args: {
    "aria-label": "Password",
    type: "password",
    placeholder: "••••••••",
  },
};

export const Invalid: Story = {
  args: {
    "aria-label": "Email",
    "aria-invalid": true,
    defaultValue: "not-an-email",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Email",
    disabled: true,
    defaultValue: "you@example.com",
  },
};

export const LeadingAdornment: Story = {
  args: {
    "aria-label": "Search",
    leading: <Icon icon={Search} />,
    placeholder: "Search projects",
  },
};

export const TrailingAdornment: Story = {
  args: {
    "aria-label": "Amount",
    trailing: <span>USD</span>,
    placeholder: "0.00",
  },
};

export const BothAdornments: Story = {
  args: {
    "aria-label": "Search",
    leading: <Icon icon={Search} />,
    trailing: <kbd>⌘K</kbd>,
    placeholder: "Search projects",
  },
};

export const Clearable: Story = {
  args: {
    "aria-label": "Search",
    clearable: true,
    defaultValue: "Quarterly report",
    placeholder: "Search projects",
  },
};

export const ClearableWithAdornments: Story = {
  args: {
    "aria-label": "Search",
    clearable: true,
    leading: <Icon icon={Search} />,
    trailing: <kbd>⌘K</kbd>,
    defaultValue: "Quarterly report",
  },
};

export const ClearLabel: Story = {
  args: {
    "aria-label": "Search",
    clearable: true,
    clearLabel: "Clear search",
    defaultValue: "Quarterly report",
  },
};

export const ClearableControlled: Story = {
  render: () => {
    const [value, setValue] = useState("Quarterly report");
    return (
      <div style={{ display: "grid", gap: "0.5rem", maxWidth: "20rem" }}>
        {/* Clearing reaches `onChange` as an ordinary change to "", so the button hides once the
            state is empty and focus returns to the input. */}
        <TextField aria-label="Search" clearable value={value} onChange={(event) => setValue(event.target.value)} />
        <output>{value === "" ? "Empty" : value}</output>
      </div>
    );
  },
};
