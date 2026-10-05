import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Dialog, Dropdown, Popover, Typography } from "@vipengele/react-ui";
import { type ReactNode, useState } from "react";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  // `aria-label` (or `aria-labelledby`) and `children` are required, so every story that renders
  // its own markup inherits these rather than repeating an args block it doesn't read.
  args: {
    "aria-label": "Discard draft",
    children: <Typography variant="body-md">Discard the unsaved changes in this draft?</Typography>,
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The actions row every story's dialog ends with. */
function Actions({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>{children}</div>;
}

function DefaultDemo() {
  // The dialog is uncontrolled: it closes itself on Escape, a backdrop click or a
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
        Open dialog
      </Button>
      {shown && (
        <Dialog key={instance} defaultOpen aria-labelledby="default-dialog-title" aria-describedby="default-dialog-body">
          <Typography variant="h3" id="default-dialog-title">
            Discard draft
          </Typography>
          <Typography variant="body-md" id="default-dialog-body">
            Press Escape or click the backdrop to close this dialog.
          </Typography>
        </Dialog>
      )}
    </>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function ControlledDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      {/* The parent holds the state: every close request arrives through `onOpenChange`, and
          the dialog stays open until `open` changes. */}
      <Dialog open={open} onOpenChange={setOpen} aria-labelledby="controlled-dialog-title">
        <Typography variant="h3" id="controlled-dialog-title">
          Discard draft
        </Typography>
        <Typography variant="body-md">Discard the unsaved changes in this draft?</Typography>
        <Actions>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            Confirm
          </Button>
        </Actions>
      </Dialog>
    </>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

function AlertDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete project
      </Button>
      {/* `role="alertdialog"` marks a dialog that demands a response, so assistive technology
          announces its description along with its name. */}
      <Dialog
        role="alertdialog"
        open={open}
        onOpenChange={setOpen}
        closeOnBackdropClick={false}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-body"
      >
        <Typography variant="h3" id="alert-dialog-title">
          Delete this project?
        </Typography>
        <Typography variant="body-md" id="alert-dialog-body">
          This permanently removes the project and cannot be undone.
        </Typography>
        <Actions>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            Delete
          </Button>
        </Actions>
      </Dialog>
    </>
  );
}

export const AlertDialog: Story = {
  name: "Alert dialog",
  render: () => <AlertDialogDemo />,
};

const paragraphs = Array.from({ length: 24 }, (_, index) => index + 1);

function LongContentDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      {/* Content taller than the viewport scrolls inside the panel rather than past it. */}
      <Dialog open={open} onOpenChange={setOpen} aria-labelledby="long-dialog-title">
        <Typography variant="h3" id="long-dialog-title">
          Terms of service
        </Typography>
        {paragraphs.map((paragraph) => (
          <Typography key={paragraph} variant="body-md">
            Paragraph {paragraph}. The quick brown fox jumps over the lazy dog, and the dialog keeps its panel within the viewport while
            this text scrolls.
          </Typography>
        ))}
        <Actions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Actions>
      </Dialog>
    </>
  );
}

export const LongContent: Story = {
  name: "Long content",
  render: () => <LongContentDemo />,
};

function FormInsideDemo() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Rename project</Button>
      <p>Submitted: {submitted ?? "nothing"}</p>
      {/* A `method="dialog"` submission is reported through `onOpenChange(false)` like any other
          close request; the form's own `onSubmit` reads the field before that happens. */}
      <Dialog open={open} onOpenChange={setOpen} aria-labelledby="form-dialog-title">
        <form
          method="dialog"
          style={{ display: "grid", gap: "1rem" }}
          onSubmit={(event) => {
            setSubmitted(String(new FormData(event.currentTarget).get("name")));
          }}
        >
          <Typography variant="h3" id="form-dialog-title">
            Rename project
          </Typography>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            Name
            <input name="name" defaultValue="Untitled" required />
          </label>
          <Actions>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </Actions>
        </form>
      </Dialog>
    </>
  );
}

export const FormInside: Story = {
  name: "Form inside",
  render: () => <FormInsideDemo />,
};

function NestedOverlaysDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      {/* The dialog carries `data-vpg-overlay-root`, so the popover and the listbox opened from
          inside it portal into it and stay interactive; portaled into the page they would sit
          behind the top layer, inert. */}
      <Dialog open={open} onOpenChange={setOpen} aria-labelledby="nested-dialog-title">
        <div style={{ display: "grid", gap: "1rem", minHeight: "20rem", alignContent: "start" }}>
          <Typography variant="h3" id="nested-dialog-title">
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
      </Dialog>
    </>
  );
}

export const NestedOverlays: Story = {
  name: "Nested overlays",
  render: () => <NestedOverlaysDemo />,
};
