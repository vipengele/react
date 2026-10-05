import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ConfirmDialog, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/ConfirmDialog",
  component: ConfirmDialog,
  // `title` and `onConfirm` are required, so every story that renders its own markup inherits
  // these rather than repeating an args block it doesn't read.
  args: {
    title: "Publish this page?",
    description: "Anyone with the link will be able to read it.",
    onConfirm: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function DefaultDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Publish page</Button>
      {/* A synchronous `onConfirm` closes the dialog as soon as it returns. */}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish this page?"
        description="Anyone with the link will be able to read it."
        onConfirm={() => {}}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function DangerDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete project
      </Button>
      {/* The danger tone draws the confirm button as a destructive action and gives the initial
          focus to the cancel button. */}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Delete this project?"
        description="This permanently removes the project and cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {}}
      />
    </>
  );
}

export const Danger: Story = {
  render: () => <DangerDemo />,
};

function AsyncPendingDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Publish page</Button>
      {/* While the promise is pending the confirm button shows loading and every close request,
          `Escape` and a backdrop click included, is ignored. The dialog closes on resolution. */}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish this page?"
        description="Publishing takes about two seconds."
        confirmLabel="Publish"
        onConfirm={() => wait(2000)}
      />
    </>
  );
}

export const AsyncPending: Story = {
  name: "Async pending",
  render: () => <AsyncPendingDemo />,
};

function RejectingDemo() {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Publish page</Button>
      <Typography variant="body-md">Failed attempts: {attempts}</Typography>
      {/* A rejection leaves the dialog open and re-enables its buttons so the action can be
          retried. The dialog never rethrows, so `onConfirm` reports its own failure. */}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish this page?"
        description="This request fails after one second."
        confirmLabel="Publish"
        onConfirm={async () => {
          await wait(1000);
          setAttempts((count) => count + 1);
          throw new Error("Publishing failed");
        }}
      />
    </>
  );
}

export const Rejecting: Story = {
  render: () => <RejectingDemo />,
};

function CustomLabelsDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Leave page</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Leave without saving?"
        description="Your changes to this page will be lost."
        confirmLabel="Leave page"
        cancelLabel="Keep editing"
        onConfirm={() => {}}
      />
    </>
  );
}

export const CustomLabels: Story = {
  name: "Custom labels",
  render: () => <CustomLabelsDemo />,
};
