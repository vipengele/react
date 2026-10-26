import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { Textarea } from "@vipengele/react-ui";
import { useState } from "react";

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

export const Clearable: Story = {
  args: {
    "aria-label": "Message",
    clearable: true,
    defaultValue: "Draft of a message to clear.",
  },
};

export const ClearLabel: Story = {
  args: {
    "aria-label": "Message",
    clearable: true,
    clearLabel: "Clear message",
    defaultValue: "Draft of a message to clear.",
  },
};

export const ClearableControlled: Story = {
  render: () => {
    const [value, setValue] = useState("Draft of a message to clear.");
    return (
      <div style={{ display: "grid", gap: "0.5rem", maxWidth: "24rem" }}>
        {/* Clearing reaches `onChange` as an ordinary change to "", so the button hides once the
            state is empty and focus returns to the textarea. */}
        <Textarea aria-label="Message" clearable value={value} onChange={(event) => setValue(event.target.value)} />
        <output>{value === "" ? "Empty" : `${value.length} characters`}</output>
      </div>
    );
  },
};
