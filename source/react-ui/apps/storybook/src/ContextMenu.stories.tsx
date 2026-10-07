import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ContextMenu, Typography } from "@vipengele/react-ui";
import { type CSSProperties, type ReactNode, useState } from "react";

const regionStyle: CSSProperties = {
  border: "1px dashed var(--vpg-border-strong)",
  borderRadius: "var(--vpg-radius)",
  padding: "var(--vpg-space-4)",
  minHeight: "10rem",
};

function Region({ children }: { children: ReactNode }) {
  return <div style={regionStyle}>{children}</div>;
}

const meta = {
  title: "Components/ContextMenu",
  component: ContextMenu,
  args: {
    target: (
      <Region>
        <Typography variant="body-md">Right-click here, or long-press on touch.</Typography>
      </Region>
    ),
    children: (
      <>
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item>Delete</ContextMenu.Item>
      </>
    ),
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CheckboxAndRadioItems: Story = {
  name: "Checkbox and radio rows",
  render: () => {
    const [showHidden, setShowHidden] = useState(false);
    const [view, setView] = useState("list");

    return (
      <ContextMenu
        target={
          <Region>
            <Typography variant="body-md">Right-click here, or long-press on touch.</Typography>
            <Typography variant="body-md">
              Showing {view} view, hidden files {showHidden ? "shown" : "hidden"}.
            </Typography>
          </Region>
        }
      >
        {/* The caller owns the checked state, and toggling a checkbox row leaves the menu open. */}
        <ContextMenu.CheckboxItem checked={showHidden} onCheckedChange={setShowHidden}>
          Show hidden files
        </ContextMenu.CheckboxItem>
        <ContextMenu.Separator />
        {/* A radio row needs its group, which holds the checked value of the set. */}
        <ContextMenu.Group label="View" value={view} onValueChange={setView}>
          <ContextMenu.RadioItem value="list">List</ContextMenu.RadioItem>
          <ContextMenu.RadioItem value="grid">Grid</ContextMenu.RadioItem>
        </ContextMenu.Group>
      </ContextMenu>
    );
  },
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <ContextMenu
        open={open}
        onOpenChange={setOpen}
        target={
          <Region>
            <Typography variant="body-md">Right-click here, or long-press on touch.</Typography>
            {/* `onOpenChange` reports every request, so the readout follows the menu in both directions. */}
            <Typography variant="body-md">Menu is {open ? "open" : "closed"}.</Typography>
          </Region>
        }
      >
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
      </ContextMenu>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    target: (
      <Region>
        <Typography variant="body-md">Right-click here: the menu is disabled, so the browser's own context menu shows instead.</Typography>
      </Region>
    ),
  },
};

export const LongPressDelay: Story = {
  name: "Long-press delay",
  args: {
    longPressDelay: 1000,
    target: (
      <Region>
        <Typography variant="body-md">
          On touch, hold still for one second to open the menu. `longPressDelay` is in milliseconds, and moving the finger or lifting it
          early cancels the press. A secondary click opens the menu at once.
        </Typography>
      </Region>
    ),
  },
};

export const InsideAScrollArea: Story = {
  name: "Inside a scroll area",
  render: () => (
    <div
      style={{
        height: "16rem",
        overflow: "auto",
        border: "1px solid var(--vpg-border)",
        borderRadius: "var(--vpg-radius)",
        padding: "var(--vpg-space-4)",
      }}
    >
      <Typography variant="body-md">
        Scroll down, then open the menu: it is placed at the pointer wherever the content has scrolled to. Scrolling while a long press is
        pending cancels it.
      </Typography>
      <div style={{ height: "6rem" }} />
      <ContextMenu
        target={
          <Region>
            <Typography variant="body-md">Right-click here, or long-press on touch.</Typography>
          </Region>
        }
      >
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
        <ContextMenu.Item>Delete</ContextMenu.Item>
      </ContextMenu>
      <div style={{ height: "24rem" }} />
    </div>
  ),
};

export const FocusableContent: Story = {
  name: "Focusable content",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--vpg-space-4)" }}>
      <ContextMenu
        target={
          <Region>
            <Typography variant="body-md">
              This target holds a focusable control. With focus on it, Shift+F10 or the ContextMenu key opens the menu below the control.
            </Typography>
            <Button variant="secondary">Focus me</Button>
          </Region>
        }
      >
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
      </ContextMenu>
      <ContextMenu
        target={
          <Region>
            <Typography variant="body-md">
              This target has no focusable content. The wrapper adds no tabIndex, so it is not reachable from the keyboard and its menu
              opens only by pointer or touch.
            </Typography>
          </Region>
        }
      >
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
      </ContextMenu>
    </div>
  ),
};
