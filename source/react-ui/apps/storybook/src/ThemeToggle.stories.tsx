import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ThemeToggle, Typography } from "@vipengele/react-ui";
import { type FormEvent, useState } from "react";

const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Drives the ambient provider's preference. The global decorator writes every `setColorMode` call
 * back to the toolbar, so the toggle and the toolbar stay in agreement. */
export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <ThemeToggle key={size} {...args} aria-label={`Color mode, ${size}`} size={size} />
      ))}
    </div>
  ),
};

export const FullWidth: Story = {
  name: "Full width",
  render: (args) => (
    <div style={{ width: "20rem", maxWidth: "100%" }}>
      <ThemeToggle {...args} fullWidth />
    </div>
  ),
};

// Each label is the accessible name of its icon-only segment.
export const CustomLabels: Story = {
  name: "Custom labels",
  args: {
    "aria-label": "Aspecto",
    labels: { light: "Claro", dark: "Escuro", system: "Sistema" },
  },
};

function ThemeToggleForm() {
  const [submitted, setSubmitted] = useState<string>();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(String(new FormData(event.currentTarget).get("theme")));
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <ThemeToggle name="theme" />
      <Button type="submit">Submit</Button>
      <Typography variant="body-sm" color="secondary">
        Submitted theme: {submitted ?? "none"}
      </Typography>
    </form>
  );
}

// `name` is the form field the selected preference submits under.
export const InAForm: Story = {
  name: "In a form",
  render: () => <ThemeToggleForm />,
};
