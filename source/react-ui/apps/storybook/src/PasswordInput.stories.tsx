import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, PasswordInput } from "@vipengele/react-ui";

const meta = {
  title: "Components/PasswordInput",
  component: PasswordInput,
} satisfies Meta<typeof PasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Password",
    placeholder: "••••••••",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Password",
    disabled: true,
    defaultValue: "correct horse battery staple",
  },
};

export const InsideFormField: Story = {
  name: "Inside FormField",
  render: () => (
    <FormField label="Password" hint="At least 8 characters.">
      <PasswordInput placeholder="••••••••" />
    </FormField>
  ),
};
