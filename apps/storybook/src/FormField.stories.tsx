import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, PasswordInput, RadioButton, TextField, Toggle } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/FormField",
  component: FormField,
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlainInput: Story = {
  name: "Text field",
  args: {
    label: "Email",
    hint: "We'll never share this with anyone else.",
    children: <TextField type="email" placeholder="you@example.com" />,
  },
};

export const WrappedPasswordInput: Story = {
  name: "Wrapped PasswordInput",
  args: {
    label: "Password",
    hint: "At least 8 characters",
    children: <PasswordInput placeholder="••••••••" />,
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
    children: <TextField type="email" />,
  },
};

export const HintAndError: Story = {
  name: "Hint and error together",
  args: {
    label: "Email",
    hint: "We'll never share this with anyone else.",
    error: "This field is required.",
    children: <TextField type="email" />,
  },
};

function ClearingValidationDemo() {
  const [value, setValue] = useState("");
  const isValid = /^\S+@\S+\.\S+$/.test(value);
  return (
    <FormField
      label="Email"
      hint="We'll never share this with anyone else."
      error={value !== "" && !isValid ? "Enter a valid email address." : undefined}
    >
      <TextField
        type="email"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </FormField>
  );
}

export const ClearingValidation: Story = {
  name: "Validation clears as you type",
  args: {
    label: "Email",
    children: <TextField type="email" />,
  },
  render: () => <ClearingValidationDemo />,
};
