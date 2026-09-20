import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { TextField } from "@vipengele/react-ui";

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
