import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@tandiko/ui";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Skeleton variant="text" width={160} />
      <Skeleton variant="rect" width={160} height={80} />
      <Skeleton variant="circle" width={48} height={48} />
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: "18rem" }}>
      <Skeleton variant="circle" width={40} height={40} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  ),
};
