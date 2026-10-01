import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@vipengele/react-ui";

const meta = {
  title: "Components/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "18rem", color: "var(--vpg-ink)" }}>
      <p style={{ margin: 0 }}>Account settings</p>
      <Separator {...args} />
      <p style={{ margin: 0 }}>Notification preferences</p>
    </div>
  ),
};

/** A vertical separator takes its height from a flex or grid parent, so the row sets one. */
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "var(--vpg-space-4)",
        height: "2rem",
        color: "var(--vpg-ink)",
      }}
    >
      <span>Docs</span>
      <Separator {...args} />
      <span>Source</span>
      <Separator {...args} />
      <span>Releases</span>
    </div>
  ),
};

/** A decorative separator is hidden from assistive technology rather than announced. */
export const Decorative: Story = {
  args: { decorative: true },
  render: (args) => (
    <div style={{ width: "18rem", color: "var(--vpg-ink)" }}>
      <p style={{ margin: 0 }}>Heading</p>
      <Separator {...args} />
      <p style={{ margin: 0 }}>Body</p>
    </div>
  ),
};
