import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTheme, ThemeProvider } from "@vipengele/react-tokens";
import {
  Button,
  createToaster,
  Dialog,
  Inline,
  Stack,
  type Toaster,
  type ToastPlacement,
  ToastRegion,
  type ToastTone,
  Typography,
  toast,
} from "@vipengele/react-ui";
import { type ReactNode, useEffect, useState } from "react";

const meta = {
  title: "Components/Toast",
  component: ToastRegion,
} satisfies Meta<typeof ToastRegion>;

export default meta;

type Story = StoryObj<typeof meta>;

const tones: readonly ToastTone[] = ["neutral", "success", "warning", "info", "danger"];

const placements: readonly ToastPlacement[] = ["top-start", "top-center", "top-end", "bottom-start", "bottom-center", "bottom-end"];

/** A toaster of the story's own, so toasts never leak from one story into another. */
function useToaster(): Toaster {
  const [toaster] = useState(createToaster);
  return toaster;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="space-3">
      <Typography variant="body-md">{title}</Typography>
      {children}
    </Stack>
  );
}

function DefaultDemo() {
  // The default toaster outlives the story, so leaving it drops whatever it still holds.
  useEffect(() => () => toast.dismiss(), []);

  return (
    <Section title="One region, mounted once under the ThemeProvider, receives every call to the exported `toast`.">
      <ToastRegion />
      <Inline gap="space-2">
        <Button onClick={() => toast("Draft saved")}>Neutral</Button>
        <Button onClick={() => toast.success("Profile updated", { description: "Changes apply on your next sign-in." })}>Success</Button>
        <Button variant="secondary" onClick={() => toast.dismiss()}>
          Dismiss all
        </Button>
      </Inline>
    </Section>
  );
}

/** The exported `toast` raises into the package's default toaster; a `ToastRegion` with no
 * `toaster` prop renders it. Press F8 to move focus to the region. */
export const Default: Story = {
  render: () => <DefaultDemo />,
};

function TonesDemo() {
  const toaster = useToaster();
  const { toast: raise } = toaster;

  return (
    <Section title="Each tone draws on its status colour; neutral draws no glyph.">
      <ToastRegion toaster={toaster} />
      <Inline gap="space-2">
        {tones.map((tone) => (
          <Button key={tone} variant="secondary" onClick={() => raise(`This is a ${tone} toast`, { tone, duration: 8000 })}>
            {tone}
          </Button>
        ))}
      </Inline>
    </Section>
  );
}

export const Tones: Story = {
  render: () => <TonesDemo />,
};

function PromiseDemo() {
  const toaster = useToaster();
  const { toast: raise } = toaster;

  return (
    <Section title="A loading toast updates in place when the promise settles.">
      <ToastRegion toaster={toaster} />
      <Inline gap="space-2">
        <Button
          onClick={() =>
            raise.promise(new Promise<string>((resolve) => setTimeout(() => resolve("report.pdf"), 1500)), {
              loading: "Exporting…",
              success: (name) => `Exported ${name}`,
              error: "Export failed",
            })
          }
        >
          Resolving promise
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            raise.promise(new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Disk full")), 1500)), {
              loading: "Exporting…",
              success: "Exported",
              error: (reason) => (reason instanceof Error ? reason.message : "Export failed"),
            })
          }
        >
          Rejecting promise
        </Button>
      </Inline>
    </Section>
  );
}

export const PromiseSettling: Story = {
  render: () => <PromiseDemo />,
};

function PersistentDemo() {
  const toaster = useToaster();
  const { toast: raise } = toaster;

  return (
    <Section title="A toast with an infinite duration stays until dismissed; a danger toast is persistent by default.">
      <ToastRegion toaster={toaster} />
      <Inline gap="space-2">
        <Button onClick={() => raise("Connection lost. Retrying…", { tone: "warning", duration: Number.POSITIVE_INFINITY })}>
          Persistent warning
        </Button>
        <Button variant="danger" onClick={() => raise.danger("Payment failed", { description: "Your card was declined." })}>
          Danger (persistent by default)
        </Button>
        <Button variant="secondary" onClick={() => raise.dismiss()}>
          Dismiss all
        </Button>
      </Inline>
    </Section>
  );
}

export const Persistent: Story = {
  render: () => <PersistentDemo />,
};

function ActionDemo() {
  const toaster = useToaster();
  const { toast: raise } = toaster;
  const [restored, setRestored] = useState(0);

  return (
    <Section title="An action runs its callback and dismisses the toast.">
      <ToastRegion toaster={toaster} />
      <Inline gap="space-2">
        <Button
          onClick={() =>
            raise("Message deleted", {
              duration: 10_000,
              action: { label: "Undo", onAction: () => setRestored((count) => count + 1) },
            })
          }
        >
          Delete message
        </Button>
        <Typography variant="body-md">Restored {restored} times.</Typography>
      </Inline>
    </Section>
  );
}

export const WithAction: Story = {
  render: () => <ActionDemo />,
};

function PlacementDemo() {
  const toaster = useToaster();
  const [placement, setPlacement] = useState<ToastPlacement>("bottom-end");

  return (
    <Section title="The region stacks its toasts against the corner or edge `placement` names.">
      <ToastRegion toaster={toaster} placement={placement} />
      <Inline gap="space-2">
        {placements.map((value) => (
          <Button
            key={value}
            variant={value === placement ? "primary" : "secondary"}
            onClick={() => {
              setPlacement(value);
              toaster.toast(`Placed ${value}`, { duration: 6000 });
            }}
          >
            {value}
          </Button>
        ))}
      </Inline>
    </Section>
  );
}

export const Placement: Story = {
  render: () => <PlacementDemo />,
};

function OverflowDemo() {
  const toaster = useToaster();
  const { toast: raise } = toaster;
  const [raised, setRaised] = useState(0);

  return (
    <Section title="Three toasts are visible at a time; the region counts the rest as `+N more` until they show.">
      <ToastRegion toaster={toaster} />
      <Inline gap="space-2">
        <Button
          onClick={() => {
            for (let index = 1; index <= 6; index++) raise(`Timed toast ${index} of 6`, { duration: 3000 });
          }}
        >
          Raise six timed toasts
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const next = raised + 1;
            setRaised(next);
            raise(`Persistent toast ${next}`, { duration: Number.POSITIVE_INFINITY });
          }}
        >
          Raise a persistent toast
        </Button>
        <Button variant="secondary" onClick={() => raise.dismiss()}>
          Dismiss all
        </Button>
      </Inline>
    </Section>
  );
}

/** Six timed toasts at once show `+3 more` draining as the visible ones expire. With three
 * persistent toasts visible, raising a fourth replaces the oldest rather than queueing behind
 * toasts that never leave by themselves. */
export const Overflow: Story = {
  render: () => <OverflowDemo />,
};

function SecondRootDemo({ colorMode }: { colorMode: "light" | "dark" }) {
  const primary = useToaster();
  const secondary = useToaster();

  return (
    <Inline gap="space-4" align="start">
      <Section title="Ambient theme">
        <ToastRegion toaster={primary} placement="bottom-end" />
        <Button onClick={() => primary.toast.success("Raised in the ambient theme", { duration: 8000 })}>Raise a toast</Button>
      </Section>
      <ThemeProvider
        colorMode={colorMode}
        theme={createTheme({
          accent: "oklch(0.6 0.2 150)",
          ink: "oklch(0.2 0.02 150)",
          surface: "oklch(0.98 0.01 150)",
          radius: "1rem",
        })}
        style={{ background: "var(--vpg-surface)", color: "var(--vpg-ink)", padding: "1rem", borderRadius: "var(--vpg-radius)" }}
      >
        <Section title="Second themed root, with its own toaster">
          <ToastRegion toaster={secondary} placement="top-end" />
          <Button onClick={() => secondary.toast.success("Raised in the second theme", { duration: 8000 })}>Raise a toast</Button>
        </Section>
      </ThemeProvider>
    </Inline>
  );
}

/** A toast is themed by where its region sits, so a second independently seeded root needs its
 * own `createToaster()` and region; the exported `toast` cannot choose a theme per call. The two
 * regions sit on opposite edges: a region is nearly the full viewport width on a narrow screen,
 * and independent regions do not avoid each other, so two on one edge would cover each other. */
export const SecondThemedRoot: Story = {
  render: (_args, context) => <SecondRootDemo colorMode={context.globals.colorMode} />,
};

function NoRegionDemo() {
  const toaster = useToaster();
  const [mounted, setMounted] = useState(false);

  return (
    <Section title="With no region mounted, a raised toast is dropped.">
      {mounted && <ToastRegion toaster={toaster} />}
      <Typography variant="body-md">
        The toast is not queued or replayed once a region mounts. In development the first dropped toast logs one console warning per
        toaster naming the missing region; production stays silent.
      </Typography>
      <Inline gap="space-2">
        <Button onClick={() => toaster.toast("Is anyone there?")}>Raise a toast</Button>
        <Button variant="secondary" onClick={() => setMounted((value) => !value)}>
          {mounted ? "Unmount region" : "Mount region"}
        </Button>
      </Inline>
    </Section>
  );
}

export const NoRegion: Story = {
  render: () => <NoRegionDemo />,
};

function InsideDialogDemo() {
  const toaster = useToaster();
  const [open, setOpen] = useState(false);

  return (
    <Section title="While a modal surface is open the region moves into it, so its toasts stay visible and operable.">
      <ToastRegion toaster={toaster} />
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog aria-labelledby="toast-dialog-title" open={open} onOpenChange={setOpen}>
        <Stack gap="space-3">
          <Typography variant="h3" id="toast-dialog-title">
            Rename project
          </Typography>
          <Typography variant="body-md">Press F8 to reach the toasts. Escape there leaves the dialog open.</Typography>
          <Inline gap="space-2" justify="end">
            <Button
              variant="secondary"
              onClick={() =>
                toaster.toast.info("Name is available", {
                  duration: 10_000,
                  action: { label: "Dismiss", onAction: () => undefined },
                })
              }
            >
              Check name
            </Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </Inline>
        </Stack>
      </Dialog>
    </Section>
  );
}

export const InsideDialog: Story = {
  render: () => <InsideDialogDemo />,
};
