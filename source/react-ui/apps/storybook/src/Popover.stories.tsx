import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Popover, Tooltip, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Popover",
  component: Popover,
  args: {
    content: (
      <>
        <Typography variant="body-md">Discard the unsaved changes in this draft?</Typography>
        <Button variant="secondary">Discard</Button>
      </>
    ),
    children: <Button>Options</Button>,
  },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placements: Story = {
  render: () => (
    // Padded on every side so a panel on any placement has room rather than flipping.
    <div style={{ display: "flex", gap: "1rem", justifyContent: "center", padding: "8rem" }}>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Popover key={placement} placement={placement} content={<Typography variant="body-md">Placed {placement}</Typography>}>
          <Button variant="secondary">{placement}</Button>
        </Popover>
      ))}
    </div>
  ),
};

export const TooltipOverPanel: Story = {
  name: "Tooltip over the panel",
  render: () => (
    <div style={{ display: "flex", justifyContent: "center", padding: "8rem" }}>
      <Popover
        content={
          <>
            <Typography variant="body-md">Discard the unsaved changes in this draft?</Typography>
            {/* Both surfaces portal into the same `.vpg-root`, so they are siblings in one
                stacking context: the tooltip draws over the panel it was triggered from because
                its layer step sits above the popover's, not because it mounted later. */}
            <Tooltip content="Deletes the draft and everything in it">
              <Button variant="danger">Discard</Button>
            </Tooltip>
          </>
        }
      >
        <Button>Options</Button>
      </Popover>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        content={
          <>
            <Typography variant="body-md">Discard the unsaved changes in this draft?</Typography>
            {/* The controlled form is what lets content close the popover itself. */}
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Discard
            </Button>
          </>
        }
      >
        <Button>Options</Button>
      </Popover>
    );
  },
};
