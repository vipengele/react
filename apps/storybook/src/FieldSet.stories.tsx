import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldSet, FormField } from "@tandiko/ui";

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
          <input type="text" placeholder="123 Main St" />
        </FormField>
        <FormField label="City">
          <input type="text" placeholder="Springfield" />
        </FormField>
        <FormField label="Postal code" hint="5 digits">
          <input type="text" placeholder="00000" />
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
          <input type="text" placeholder="4242 4242 4242 4242" />
        </FormField>
        <FormField label="Expiry">
          <input type="text" placeholder="MM/YY" />
        </FormField>
      </>
    ),
  },
};
