import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldSet, FormField, PasswordInput, TextField } from "@tandiko/ui";

const meta = {
  title: "Components/FieldSet",
  component: FieldSet,
} satisfies Meta<typeof FieldSet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShippingAddress: Story = {
  name: "Grouped FormFields",
  args: {
    legend: "Shipping address",
    children: (
      <>
        <FormField label="Street">
          <TextField placeholder="123 Main St" />
        </FormField>
        <FormField label="City">
          <TextField placeholder="Springfield" />
        </FormField>
        <FormField label="Postal code" hint="5 digits">
          <TextField placeholder="00000" />
        </FormField>
      </>
    ),
  },
};

export const Credentials: Story = {
  name: "Grouped rhythm with a password field",
  args: {
    legend: "Sign in",
    children: (
      <>
        <FormField label="Email" hint="The address you registered with">
          <TextField type="email" placeholder="you@example.com" />
        </FormField>
        <FormField label="Password" error="Password is required">
          <PasswordInput placeholder="••••••••" />
        </FormField>
      </>
    ),
  },
};

export const Disabled: Story = {
  name: "Disabled group",
  args: {
    legend: "Payment details",
    disabled: true,
    children: (
      <>
        <FormField label="Card number">
          <TextField placeholder="4242 4242 4242 4242" />
        </FormField>
        <FormField label="Expiry">
          <TextField placeholder="MM/YY" />
        </FormField>
      </>
    ),
  },
};
