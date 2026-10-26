import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider } from "@vipengele/react-tokens";
import { NumberInput } from "@vipengele/react-ui";
import { Locale } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/NumberInput",
  component: NumberInput,
  args: { "aria-label": "Quantity" },
} satisfies Meta<typeof NumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GermanLocaleProp: Story = {
  args: { locale: new Locale("de-DE"), defaultValue: 1234.5 },
};

export const UnderLocaleProvider: Story = {
  render: (args) => (
    <LocaleProvider locale={new Locale("de-DE")}>
      <NumberInput {...args} />
    </LocaleProvider>
  ),
  args: { defaultValue: 1234.5 },
};

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

export const Clearable: Story = {
  args: { clearable: true, defaultValue: 5 },
};

export const ClearableWithSteppers: Story = {
  args: { clearable: true, steppers: true, defaultValue: 5 },
};

export const ClearLabel: Story = {
  args: { clearable: true, clearLabel: "Clear quantity", defaultValue: 5 },
};

export const ClearableControlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | undefined>(5);
    return (
      <div style={{ display: "grid", gap: "0.5rem", maxWidth: "20rem" }}>
        {/* Clearing reports `undefined` through `onChange`, so the committed value is empty and the
            button hides. */}
        <NumberInput {...args} clearable value={value} onChange={setValue} />
        <output>{value === undefined ? "Empty" : value}</output>
      </div>
    );
  },
};
