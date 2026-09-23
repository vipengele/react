import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberInput } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/NumberInput",
  component: NumberInput,
  args: { "aria-label": "Quantity" },
} satisfies Meta<typeof NumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMinMax: Story = {
  args: { min: 0, max: 10, defaultValue: 5 },
};

export const WithSteppers: Story = {
  args: { steppers: true, defaultValue: 5 },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: 5 },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 5 },
};

export const TrailingUnit: Story = {
  args: { trailing: <span>kg</span>, defaultValue: 5 },
};

export const InForm: Story = {
  render: (args) => {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get("quantity")));
        }}
      >
        <NumberInput {...args} name="quantity" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: 5 },
};
