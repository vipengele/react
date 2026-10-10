import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Drawer, Dropdown, Popover, Typography } from "@vipengele/react-ui";
import { type ReactNode, useState } from "react";

const meta = {
  title: "Components/Drawer",
  component: Drawer,
  // `aria-label` (or `aria-labelledby`) and `children` are required, so every story that renders
  // its own markup inherits these rather than repeating an args block it doesn't read.
  args: {
    "aria-label": "Filters",
    children: <Typography variant="body-md">Narrow the list by status, owner or date.</Typography>,
  },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

type Side = "left" | "right" | "top" | "bottom";

/** The actions row every story's drawer ends with. */
function Actions({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>{children}</div>;
}

function DefaultDemo() {
  // The drawer is uncontrolled: it closes itself on Escape, a backdrop click or a
  // `method="dialog"` submission. A new `key` mounts a fresh one that opens from `defaultOpen`.
  const [instance, setInstance] = useState(0);
  const [shown, setShown] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setInstance((count) => count + 1);
          setShown(true);
        }}
      >
        Open drawer
      </Button>
      {shown && (
        <Drawer key={instance} defaultOpen aria-labelledby="default-drawer-title" aria-describedby="default-drawer-body">
          <Typography variant="h3" id="default-drawer-title">
            Filters
          </Typography>
          <Typography variant="body-md" id="default-drawer-body">
            Press Escape or click the backdrop to close this drawer.
          </Typography>
          <form method="dialog">
            <Button type="submit">Close</Button>
          </form>
        </Drawer>
      )}
    </>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function SideDemo({ side }: { side: Side }) {
  const [open, setOpen] = useState(false);
  const titleId = `${side}-drawer-title`;

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {side} drawer</Button>
      <Drawer open={open} onOpenChange={setOpen} side={side} aria-labelledby={titleId}>
        <Typography variant="h3" id={titleId}>
          Anchored {side}
        </Typography>
        <Typography variant="body-md">This drawer slides in from the {side} edge of the viewport.</Typography>
        <Actions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Actions>
      </Drawer>
    </>
  );
}

export const Left: Story = {
  render: () => <SideDemo side="left" />,
};

export const Right: Story = {
  render: () => <SideDemo side="right" />,
};

export const Top: Story = {
  render: () => <SideDemo side="top" />,
};

export const Bottom: Story = {
  render: () => <SideDemo side="bottom" />,
};

function ControlledDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <p>The drawer is {open ? "open" : "closed"}.</p>
      {/* The parent holds the state: every close request arrives through `onOpenChange`, and
          the drawer stays open until `open` changes. */}
      <Drawer open={open} onOpenChange={setOpen} aria-labelledby="controlled-drawer-title">
        <Typography variant="h3" id="controlled-drawer-title">
          Filters
        </Typography>
        <Typography variant="body-md">Narrow the list by status, owner or date.</Typography>
        <Actions>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Apply</Button>
        </Actions>
      </Drawer>
    </>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

const paragraphs = Array.from({ length: 30 }, (_, index) => index + 1);

function LongContentDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      {/* Content taller than the viewport scrolls inside the panel rather than past it. */}
      <Drawer open={open} onOpenChange={setOpen} aria-labelledby="long-drawer-title">
        <Typography variant="h3" id="long-drawer-title">
          Release notes
        </Typography>
        {paragraphs.map((paragraph) => (
          <Typography key={paragraph} variant="body-md">
            Entry {paragraph}. The quick brown fox jumps over the lazy dog, and the drawer keeps its panel within the viewport while this
            text scrolls.
          </Typography>
        ))}
        <Actions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Actions>
      </Drawer>
    </>
  );
}

export const LongContent: Story = {
  name: "Long content",
  render: () => <LongContentDemo />,
};

function NestedOverlaysDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      {/* The drawer carries `data-vpg-overlay-root`, so the popover and the listbox opened from
          inside it portal into it and stay interactive; portaled into the page they would sit
          behind the top layer, inert. */}
      <Drawer open={open} onOpenChange={setOpen} aria-labelledby="nested-drawer-title">
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <Typography variant="h3" id="nested-drawer-title">
            Share project
          </Typography>
          <Dropdown aria-label="Role" defaultValue={{ value: "viewer", label: "Viewer" }}>
            <Dropdown.Option value="viewer" label="Viewer" />
            <Dropdown.Option value="editor" label="Editor" />
            <Dropdown.Option value="owner" label="Owner" />
          </Dropdown>
          <div>
            <Popover content={<Typography variant="body-md">Owners can delete the project and manage billing.</Typography>}>
              <Button variant="secondary">What can owners do?</Button>
            </Popover>
          </div>
          <Actions>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </Actions>
        </div>
      </Drawer>
    </>
  );
}

export const NestedOverlays: Story = {
  name: "Nested overlays",
  render: () => <NestedOverlaysDemo />,
};

function NonModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <p>The page behind a non-modal drawer stays scrollable, focusable and clickable.</p>
      <input aria-label="Page field" placeholder="Type here while the drawer is open" />
      <Drawer modal={false} open={open} onOpenChange={setOpen} aria-labelledby="non-modal-drawer-title">
        <Typography variant="h3" id="non-modal-drawer-title">
          Filters
        </Typography>
        <Typography variant="body-md">Press Escape or use the button below to close this drawer.</Typography>
        <Actions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Actions>
      </Drawer>
    </>
  );
}

export const NonModal: Story = {
  name: "Non-modal",
  render: () => <NonModalDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "With `modal={false}` the drawer is a page-layer panel: no backdrop, no focus trap, no scroll lock, and the page behind it stays interactive. Focus moves into the drawer on open and returns to the element that held it on close.",
      },
    },
  },
};

const navItems = ["Overview", "Projects", "Reports", "Settings"];

function DockedPanelDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      {/* `closeOnOutsideClick` is off, so clicks on the page beside the panel leave it open. */}
      <Drawer modal={false} side="left" open={open} onOpenChange={setOpen} aria-label="Navigation">
        <nav aria-label="Primary">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
            {navItems.map((item) => (
              <li key={item}>
                <Button variant="secondary" onClick={() => {}}>
                  {item}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
      <div style={{ marginInlineStart: open ? "20rem" : 0 }}>
        <Button onClick={() => setOpen((current) => !current)}>{open ? "Hide navigation" : "Show navigation"}</Button>
        <p>The panel stays open while this content is used.</p>
        <input aria-label="Search" placeholder="Search" />
      </div>
    </div>
  );
}

export const DockedPanel: Story = {
  name: "Docked panel",
  render: () => <DockedPanelDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "A SideNav-like left panel that stays open while the page beside it remains interactive. `closeOnOutsideClick` defaults to off, which is what lets a docked panel survive clicks on the page.",
      },
    },
  },
};

function ToggleButtonDemo() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button onClick={() => setOpen((current) => !current)}>Toggle drawer</Button>
      <p>The drawer is {open ? "open" : "closed"}.</p>
      <Drawer modal={false} closeOnOutsideClick open={open} onOpenChange={setOpen} aria-labelledby="toggle-drawer-title">
        <Typography variant="h3" id="toggle-drawer-title">
          Outside click
        </Typography>
        <Typography variant="body-md">Click anywhere on the page to dismiss this drawer.</Typography>
        <Actions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Actions>
      </Drawer>
    </>
  );
}

export const OutsideClickToggleButton: Story = {
  name: "Outside click and a toggle button",
  render: () => <ToggleButtonDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "With `closeOnOutsideClick` on, a press outside the drawer requests a close. The drawer has no reference element, so the consumer's own toggle button counts as outside: pressing it while the drawer is open dismisses through `onOpenChange(false)`, and the button's own handler reopens it in the same tick, so the drawer appears not to close. There is no way to exempt an element. A drawer opened by a toggle button leaves `closeOnOutsideClick` off, or closes from a control inside it.",
      },
    },
  },
};
