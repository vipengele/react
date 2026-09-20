import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "@vipengele/react-ui";

const PORTRAIT = "https://i.pravatar.cc/160?img=47";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { name: "Ada Lovelace" },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <Avatar key={size} size={size} name="Ada Lovelace" />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {(["circle", "square"] as const).map((shape) => (
        <Avatar key={shape} shape={shape} size="lg" src={PORTRAIT} name="Ada Lovelace" />
      ))}
    </div>
  ),
};

export const WithImage: Story = {
  args: { src: PORTRAIT, size: "lg" },
};

export const FallbackChain: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Avatar size="lg" src={PORTRAIT} name="Ada Lovelace" />
      <Avatar size="lg" name="Ada Lovelace" />
      <Avatar size="lg" src="https://example.invalid/missing.png" name="Grace Hopper" />
      <Avatar size="lg" />
    </div>
  ),
};
