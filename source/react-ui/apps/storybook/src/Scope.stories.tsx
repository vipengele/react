import type { Meta, StoryObj } from "@storybook/react-vite";
import { Scope, ScopeProvider, useScope } from "@vipengele/react-telemetry";
import { type ReactNode, useState } from "react";

const meta = {
  title: "Telemetry/ScopeProvider",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const KEYS = ["user.id", "region", "plan"] as const;

function format(scope: Scope): string {
  return KEYS.map((key) => `${key}=${String(scope.get(key))}`).join(", ");
}

function Reader({ label }: { label: string }) {
  const scope = useScope();
  const [afterAwait, setAfterAwait] = useState<string>("(not read yet)");

  const readAfterAwait = () =>
    Scope.propagate(scope, async () => {
      await Promise.resolve();
      setAfterAwait(format(Scope.current()));
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <strong>{label}</strong>
      <code>at render: {format(scope)}</code>
      <code>after await: {afterAwait}</code>
      <button type="button" onClick={readAfterAwait} style={{ alignSelf: "flex-start" }}>
        Read after await
      </button>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", border: "1px solid" }}>{children}</div>;
}

export const Nested: Story = {
  render: () => (
    <ScopeProvider tag="app" attributes={{ "user.id": "u-1", region: "eu" }}>
      <Box>
        <Reader label="Outer provider" />
        <ScopeProvider tag="checkout" attributes={{ region: "us", plan: "pro" }}>
          <Box>
            <Reader label="Nested provider (overrides region, adds plan)" />
          </Box>
        </ScopeProvider>
      </Box>
    </ScopeProvider>
  ),
};

export const Isolated: Story = {
  render: () => (
    <ScopeProvider tag="app" attributes={{ "user.id": "u-1", region: "eu" }}>
      <Box>
        <Reader label="Outer provider" />
        <ScopeProvider tag="widget" isolate attributes={{ plan: "free" }}>
          <Box>
            <Reader label="Isolated provider (reads nothing from above)" />
          </Box>
        </ScopeProvider>
      </Box>
    </ScopeProvider>
  ),
};
