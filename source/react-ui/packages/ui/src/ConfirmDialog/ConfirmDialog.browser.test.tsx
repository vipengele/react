import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Button } from "../Button/Button.js";
import { ConfirmDialog, type ConfirmDialogTone } from "./ConfirmDialog.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this a dialog left open by one test keeps the page inert for the
// next.
afterEach(cleanup);

/** The `<dialog>` element, looked up by tag: a closed dialog is `display: none` and so absent
 * from the accessibility tree that a role query searches. */
function dialogElement(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) {
    throw new Error("no <dialog> was rendered");
  }
  return dialog;
}

/** A confirmation that never settles, holding the dialog in its pending state. */
function pendingForever(): Promise<void> {
  return new Promise(() => {});
}

function renderThemed(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/** A confirm dialog a button opens, mounted closed so the open is a real `showModal()` call. */
function Opener({ tone }: { tone: ConfirmDialogTone }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Delete project</Button>
      <ConfirmDialog title="Delete the project?" tone={tone} open={open} onOpenChange={setOpen} onConfirm={pendingForever} />
    </>
  );
}

/** The button each tone gives the initial focus to. */
const initialFocusLabel: Record<ConfirmDialogTone, string> = { default: "Confirm", danger: "Cancel" };

describe("ConfirmDialog in a real engine", () => {
  for (const tone of ["default", "danger"] as const) {
    it(`focuses the ${initialFocusLabel[tone]} button when a ${tone}-tone dialog opens`, async () => {
      renderThemed(<Opener tone={tone} />);

      await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
      const dialog = dialogElement();
      await vi.waitFor(() => expect(dialog.open).toBe(true));

      expect(document.activeElement).toBe(screen.getByRole("button", { name: initialFocusLabel[tone] }));
    });
  }

  it("stays open on Escape while a confirmation is pending", async () => {
    const onOpenChange = vi.fn();
    renderThemed(<ConfirmDialog title="Delete the project?" defaultOpen onOpenChange={onOpenChange} onConfirm={pendingForever} />);
    const dialog = dialogElement();
    let closes = 0;
    dialog.addEventListener("close", () => closes++);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await userEvent.keyboard("{Escape}");

    expect(closes).toBe(0);
    expect(dialog.open).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  for (const tone of ["default", "danger"] as const) {
    // Once the page has spent its user activation, the engine's close watcher refuses to let
    // `cancel` stop the next `Escape` and closes the element itself. How many presses that takes
    // depends on the page's activation history, which persists across tests, so the presses
    // repeat until the engine's own `close` arrives. Every button is disabled while the
    // confirmation is pending, so the `showModal()` that undoes the close finds no focusable
    // `autofocus` target and focuses the `<dialog>` itself.
    it(`reopens a ${tone}-tone dialog the engine force-closes while pending, focusing the dialog itself`, async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ConfirmDialog title="Delete the project?" tone={tone} defaultOpen onOpenChange={onOpenChange} onConfirm={pendingForever} />,
      );
      const dialog = dialogElement();
      let closes = 0;
      dialog.addEventListener("close", () => closes++);

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
      // Bounded so a close that never comes fails here rather than at the test's timeout.
      let presses = 0;
      while (closes === 0 && presses < 5) {
        await userEvent.keyboard("{Escape}");
        presses++;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(closes).toBe(1);

      await vi.waitFor(() => expect(dialog.open).toBe(true));
      expect(dialog.matches(":modal")).toBe(true);
      expect(document.activeElement).toBe(dialog);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  }
});
