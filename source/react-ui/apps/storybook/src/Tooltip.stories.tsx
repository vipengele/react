import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Tooltip } from "@tandiko/ui";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  args: {
    content: "Saves the draft without publishing it",
    children: <Button>Save</Button>,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placements: Story = {
  render: () => (
    // Padded on every side so a bubble on any placement has room rather than flipping.
    <div style={{ display: "flex", gap: "1rem", justifyContent: "center", padding: "5rem" }}>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Tooltip key={placement} placement={placement} content={`Placed ${placement}`}>
          <Button variant="secondary">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const OnLongContent: Story = {
  args: {
    content: "Wraps against the bubble's max-width instead of stretching off the side of the page",
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: <Button disabled>Save</Button> },
};
