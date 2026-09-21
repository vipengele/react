import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { Textarea } from "@vipengele/react-ui";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Message",
    placeholder: "Write a message",
  },
};

export const Invalid: Story = {
  args: {
    "aria-label": "Message",
    "aria-invalid": true,
    defaultValue: "Too short",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Message",
    disabled: true,
    defaultValue: "This message can no longer be edited.",
  },
};

export const AutoGrow: Story = {
  args: {
    "aria-label": "Notes",
    autoGrow: true,
    defaultValue: "Type here and the field grows with its content.",
  },
};

export const AutoGrowMaxRows: Story = {
  args: {
    "aria-label": "Notes",
    autoGrow: true,
    rows: 2,
    maxRows: 5,
    defaultValue: Array.from({ length: 8 }, (_, i) => `Line ${i + 1}`).join("\n"),
  },
};

export const Adornments: Story = {
  args: {
    "aria-label": "Search notes",
    rows: 5,
    leading: <Icon icon={Search} />,
    trailing: <kbd>⌘K</kbd>,
    placeholder: "Search notes",
  },
};
