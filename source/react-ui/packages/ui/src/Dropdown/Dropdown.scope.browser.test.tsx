import { cleanup, render, screen } from "@testing-library/react";
import { Scope, ScopeProvider } from "@vipengele/react-telemetry";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Dropdown, type DropdownAsyncOption } from "./Dropdown.js";

// The chromium project has no automatic Testing Library cleanup.
afterEach(cleanup);

describe("Dropdown's loadOptions in a browser", () => {
  it("starts a loader fired by the debounce timer inside the enclosing ScopeProvider's scope", async () => {
    const started = new Map<string, unknown>();
    const loadOptions = (query: string): Promise<DropdownAsyncOption[]> => {
      started.set(query, Scope.current().get("user.id"));
      return Promise.resolve([{ value: "small", label: "Small" }]);
    };

    render(
      <div className="vpg-root">
        <ScopeProvider attributes={{ "user.id": "u1" }}>
          <Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />
        </ScopeProvider>
      </div>,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Size" }));
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "s");

    // A browser timer runs with no ambient scope, so the provider's attribute reaches the loader
    // only through the scope the Dropdown re-enters around it.
    await expect.poll(() => started.has("s")).toBe(true);
    expect(started.get("s")).toBe("u1");
  });
});
