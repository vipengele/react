import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, RadioButton, Toggle } from "@tandiko/ui";

const meta = {
  title: "Components/FormField",
  component: FormField,
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlainInput: Story = {
  name: "Plain input",
  args: {
    label: "Email",
    hint: "We'll never share this with anyone else.",
    children: <input type="email" placeholder="you@example.com" />,
  },
};

export const WrappedToggle: Story = {
  name: "Wrapped Toggle",
  args: {
    label: "Enable notifications",
    children: <Toggle />,
  },
};

export const WrappedRadioButton: Story = {
  name: "Wrapped RadioButton",
  args: {
    label: "Small size",
    hint: "Recommended for compact layouts",
    children: <RadioButton value="small" />,
  },
};

export const ErrorState: Story = {
  name: "Error state",
  args: {
    label: "Email",
    error: "This field is required.",
    children: <input type="email" />,
  },
};

export const HintAndError: Story = {
  name: "Hint and error together",
  args: {
    label: "Email",
    hint: "We'll never share this with anyone else.",
    error: "This field is required.",
    children: <input type="email" />,
  },
};
