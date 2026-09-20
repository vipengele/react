import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "@vipengele/react-ui";

const meta = {
  title: "Components/Typography",
  component: Typography,
  args: { children: "The quick brown fox jumps over the lazy dog" },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {(["display", "h1", "h2", "h3", "h4", "body-lg", "body-md", "body-sm", "caption"] as const).map((variant) => (
        <Typography key={variant} variant={variant}>
          {variant}
        </Typography>
      ))}
    </div>
  ),
};

export const Weights: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
      {(["regular", "medium", "bold"] as const).map((weight) => (
        <Typography key={weight} weight={weight}>
          {weight}
        </Typography>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
      {(["primary", "secondary", "subtle", "accent"] as const).map((color) => (
        <Typography key={color} color={color}>
          {color}
        </Typography>
      ))}
    </div>
  ),
};

export const PolymorphicAs: Story = {
  render: () => (
    <Typography variant="h1" as="div">
      Styled like an h1, rendered as a div
    </Typography>
  ),
};
