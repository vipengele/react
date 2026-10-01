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
  const [ambientAfterAwait, setAmbientAfterAwait] = useState<string>("(not read yet)");

  // Nothing ambient follows a native `await` in the browser, so the handler re-enters the scope
  // captured at render once it resumes; `Scope.current()` read outside it is the default scope.
  const readAfterAwait = async () => {
    await Promise.resolve();
    setAfterAwait(Scope.propagate(scope, () => format(Scope.current())));
    setAmbientAfterAwait(format(Scope.current()));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <strong>{label}</strong>
      <code>at render: {format(scope)}</code>
      <code>after await, in Scope.propagate(scope, ...): {afterAwait}</code>
      <code>after await, Scope.current(): {ambientAfterAwait}</code>
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
