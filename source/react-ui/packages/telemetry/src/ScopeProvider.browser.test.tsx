import { cleanup, render } from "@testing-library/react";
import { Scope } from "@vipengele/ts";
import { afterEach, describe, expect, it } from "vitest";
import { ScopeProvider } from "./ScopeProvider.js";
import { useScope } from "./useScope.js";

// The chromium project has no automatic Testing Library cleanup.
afterEach(cleanup);

type Handler = () => Promise<{ propagated: unknown; ambient: unknown }>;

/** Builds a handler bound to its render-time scope and hands it to `onHandler`. */
function Button({ onHandler }: { onHandler: (handler: Handler) => void }) {
  const scope = useScope();
  onHandler(() =>
    Scope.propagate(scope, async () => {
      await Promise.resolve();
      return {
        propagated: Scope.propagate(scope, () => Scope.current().get("user.id")),
        ambient: Scope.current().get("user.id"),
      };
    }),
  );
  return null;
}

describe("ScopeProvider in a browser", () => {
  it("keeps the provider's attributes for a handler made at render and invoked after an await", async () => {
    let handler: Handler | undefined;

    render(
      <ScopeProvider attributes={{ "user.id": "u1" }}>
        <Button onHandler={(next) => (handler = next)} />
      </ScopeProvider>,
    );

    const result = await handler?.();

    expect(result?.propagated).toBe("u1");
    // Chromium has no carrier that follows a native `await`, so the ambient scope is gone past it.
    expect(result?.ambient).toBeUndefined();
  });
});
