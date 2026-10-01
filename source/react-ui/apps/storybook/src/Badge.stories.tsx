import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check } from "@vipengele/react-icons";
import { Badge } from "@vipengele/react-ui";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const VariantsAndEmphasis: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {(["subtle", "solid"] as const).map((emphasis) => (
        <div key={emphasis} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {(["neutral", "accent", "danger"] as const).map((variant) => (
            <Badge key={variant} variant={variant} emphasis={emphasis}>
              {variant} {emphasis}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {(["sm", "md"] as const).map((size) => (
        <Badge key={size} size={size}>
          {size}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: { variant: "accent", icon: <Check />, children: "Verified" },
};
