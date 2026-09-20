import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "@tandiko/ui";

const meta = {
  title: "Components/Slider",
  component: Slider,
  args: { "aria-label": "Volume", min: 0, max: 100, defaultValue: 50 },
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Stepped: Story = {
  args: { step: 10 },
};

export const Disabled: Story = {
  args: { disabled: true },
};
