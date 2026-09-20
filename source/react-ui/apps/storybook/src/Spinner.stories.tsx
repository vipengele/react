import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "@vipengele/react-ui";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <figure key={size} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <Spinner size={size} />
          <figcaption style={{ fontSize: "0.75rem" }}>{size}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const ColorOverride: Story = {
  args: { size: "lg", color: "oklch(0.68 0.17 35)" },
};
