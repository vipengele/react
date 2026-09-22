import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ErrorBoundary, Typography } from "@vipengele/react-ui";
import { useState } from "react";

/**
 * Throws while `armed`, so a story controls when the boundary below it sees an error rather than
 * showing the fallback from first render. Local `useState`, not module-level state, so each
 * story instance arms and disarms independently of any other mounted at the same time.
 */
function Bomb({ armed }: { armed: boolean }) {
  if (armed) {
    throw new Error("kaboom");
  }
  return <Typography variant="body-sm">Working fine.</Typography>;
}

const meta = {
  title: "Components/ErrorBoundary",
  component: ErrorBoundary,
  /**
   * Every story below supplies its own `children` via `render`; this placeholder only satisfies
   * `children`'s required type at the `meta` level.
   *
   * `toRootErrorHandlers` spreads one reporter across React's root-level `onCaughtError` /
   * `onUncaughtError` options (`createRoot(el, { ...toRootErrorHandlers(report) })`). It has no
   * story here: Storybook renders every story into its own React root, so there is no root left
   * for this app to configure — the export is documented, not demonstrated.
   */
  args: { children: null },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ErrorBoundary>
      <Bomb armed={false} />
    </ErrorBoundary>
  ),
};

function CaughtErrorDemo() {
  const [armed, setArmed] = useState(false);

  return (
    <>
      <Button onClick={() => setArmed(true)} disabled={armed}>
        Throw an error
      </Button>
      <ErrorBoundary>
        <Bomb armed={armed} />
      </ErrorBoundary>
    </>
  );
}

/** Starts healthy; clicking the button outside the boundary arms `Bomb` for its next render. */
export const CaughtError: Story = {
  name: "Caught error",
  render: () => <CaughtErrorDemo />,
};

function CustomFallbackDemo() {
  const [armed, setArmed] = useState(false);

  return (
    <>
      <Button onClick={() => setArmed(true)} disabled={armed}>
        Throw an error
      </Button>
      <ErrorBoundary fallback={<Typography variant="body-sm">This section could not load.</Typography>}>
        <Bomb armed={armed} />
      </ErrorBoundary>
    </>
  );
}

/** `fallback` as a plain node, supplied by the caller instead of the default `StatePanel`. */
export const CustomFallback: Story = {
  name: "Custom fallback",
  render: () => <CustomFallbackDemo />,
};

function WithRetryDemo() {
  const [armed, setArmed] = useState(false);

  return (
    <>
      <Button onClick={() => setArmed(true)} disabled={armed}>
        Throw an error
      </Button>
      <ErrorBoundary
        fallback={(error, reset) => (
          <>
            <Typography variant="body-sm">{error instanceof Error ? error.message : "Something went wrong."}</Typography>
            <Button
              onClick={() => {
                setArmed(false);
                reset();
              }}
            >
              Try again
            </Button>
          </>
        )}
      >
        <Bomb armed={armed} />
      </ErrorBoundary>
    </>
  );
}

/** `fallback` as a render prop: `reset()` clears the boundary's error state, paired here with
 * disarming `Bomb` so the retried render actually succeeds. */
export const WithRetry: Story = {
  name: "With retry",
  render: () => <WithRetryDemo />,
};
