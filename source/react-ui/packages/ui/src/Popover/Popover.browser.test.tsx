import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Popover } from "./Popover.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its popover mounted.
afterEach(cleanup);

/** A trigger and a panel holding two buttons under a real provider, followed by a button outside
 * the provider's root. The panel portals to the end of the root, so that button is the next
 * focusable after the panel's last element; with nothing after it, Tab hands focus to the
 * browser itself, the `focusout` carries no `relatedTarget`, and floating-ui leaves the panel
 * open. */
function renderPopover(modal?: boolean) {
  render(
    <>
      <ThemeProvider>
        <Popover
          modal={modal}
          content={
            <>
              <button type="button">First</button>
              <button type="button">Second</button>
            </>
          }
        >
          <button type="button">Open</button>
        </Popover>
      </ThemeProvider>
      <button type="button">After</button>
    </>,
  );
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".vpg-popover");
}

/** Opens the panel from its trigger and waits for focus to land on its first button. */
async function open(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const first = screen.getByRole("button", { name: "First" });
  await expect.poll(() => document.activeElement).toBe(first);
  return panel() as HTMLElement;
}

describe("Popover focus leaving the panel", () => {
  it("closes a non-modal popover when Tab moves focus past its last element", async () => {
    renderPopover(false);
    const panelElement = await open();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Second" }));
    await userEvent.tab();

    await expect.poll(panel).toBeNull();
    expect(panelElement.isConnected).toBe(false);
    expect(document.activeElement).not.toBe(document.body);
    expect(panelElement.contains(document.activeElement)).toBe(false);
  });

  it("keeps a modal popover open and wraps focus to its first element when Tab moves past its last", async () => {
    renderPopover();
    const panelElement = await open();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Second" }));
    await userEvent.tab();

    await expect.poll(() => document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    expect(panel()).toBe(panelElement);
    expect(panelElement.isConnected).toBe(true);
  });
});

describe("Popover returnFocus", () => {
  function renderWithTarget(target: ReturnType<typeof createRef<HTMLInputElement>> | undefined) {
    render(
      <ThemeProvider>
        <input ref={target} aria-label="Date" />
        <Popover returnFocus={target} content={<button type="button">First</button>}>
          <button type="button">Open</button>
        </Popover>
      </ThemeProvider>,
    );
  }

  it("lands focus on the named element, and the overlay's own return to the trigger does not win", async () => {
    const target = createRef<HTMLInputElement>();
    renderWithTarget(target);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await expect.poll(() => document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

    await userEvent.keyboard("{Escape}");
    await expect.poll(panel).toBeNull();
    await expect.poll(() => document.activeElement).toBe(target.current);

    // The focus manager's own return runs in a microtask after the close; focus must still be on
    // the named element once everything queued behind it has settled.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    expect(document.activeElement).toBe(target.current);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Open" }));
  });

  it("returns focus to the trigger when no element is named", async () => {
    renderWithTarget(undefined);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await expect.poll(() => document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

    await userEvent.keyboard("{Escape}");
    await expect.poll(panel).toBeNull();
    await expect.poll(() => document.activeElement).toBe(screen.getByRole("button", { name: "Open" }));
  });
});
