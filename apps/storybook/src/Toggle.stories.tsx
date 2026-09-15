import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toggle } from "@tandiko/ui";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  args: { "aria-label": "Enable notifications" },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};
