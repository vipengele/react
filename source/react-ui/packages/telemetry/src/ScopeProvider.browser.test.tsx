import { cleanup, render } from "@testing-library/react";
import { Scope } from "@vipengele/ts";
import { afterEach, describe, expect, it } from "vitest";
import { ScopeProvider } from "./ScopeProvider.js";
import { useScope } from "./useScope.js";

// The chromium project has no automatic Testing Library cleanup.
afterEach(cleanup);

describe("ScopeProvider in a browser", () => {
  it("keeps the provider's attributes for a handler made at render and invoked after an await", async () => {
    let handler: (() => Promise<{ propagated: unknown; ambient: unknown }>) | undefined;

    function Button() {
      const scope = useScope();
      handler = () =>
        Scope.propagate(scope, async () => {
          await Promise.resolve();
          return {
            propagated: Scope.propagate(scope, () => Scope.current().get("user.id")),
            ambient: Scope.current().get("user.id"),
          };
        });
      return null;
    }

    render(
      <ScopeProvider attributes={{ "user.id": "u1" }}>
        <Button />
      </ScopeProvider>,
    );

    const result = await handler?.();

    expect(result?.propagated).toBe("u1");
    // Chromium has no carrier that follows a native `await`, so the ambient scope is gone past it.
    expect(result?.ambient).toBeUndefined();
  });
});
