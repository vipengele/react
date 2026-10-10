import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp } from "vitest/browser";
import { Dialog } from "../Dialog/Dialog.js";
import { ToastRegion } from "./ToastRegion.js";
import { createToaster, type Toaster } from "./toaster.js";

/**
 * jsdom has no top layer, so which of a dialog and the toast region paints on top is only
 * provable in an engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the jsdom
// project's does; without this a dialog left open by one test keeps the page inert for the next.
afterEach(() => {
  cleanup();
});

function popoverElement(): HTMLElement {
  const popover = document.querySelector<HTMLElement>(".vpg-toast-region");
  if (popover === null) {
    throw new Error("no toast region popover was rendered");
  }
  return popover;
}

function announcer(): HTMLElement {
  const element = document.querySelector<HTMLElement>(".vpg-toast-announcer");
  if (element === null) {
    throw new Error("no announcer was rendered");
  }
  return element;
}

function message(): HTMLElement {
  const element = popoverElement().querySelector<HTMLElement>(".vpg-toast-message");
  if (element === null) {
    throw new Error("no toast was rendered");
  }
  return element;
}

/** Resolves once every transition and animation on the page has finished, so a toast or a dialog
 * is read at rest rather than part-way through its entry. */
async function settled() {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
}

/**
 * The class of what Chromium paints topmost at the centre of `element`, or the node name when
 * that is a pseudo-element such as a dialog's `::backdrop`. A modal dialog makes everything outside
 * itself inert, and `elementFromPoint` skips inert content, so it reports the backdrop over a toast
 * painted above it. CDP's hit test with `ignorePointerEventsNone` counts inert content, so it
 * reports paint order.
 */
async function paintedAtCentreOf(element: Element): Promise<string> {
  const frame = window.frameElement?.getBoundingClientRect();
  const { left, top, width, height } = element.getBoundingClientRect();
  const { backendNodeId } = await cdp().send("DOM.getNodeForLocation", {
    x: Math.round((frame?.left ?? 0) + left + width / 2),
    y: Math.round((frame?.top ?? 0) + top + height / 2),
    ignorePointerEventsNone: true,
  });
  const { node } = await cdp().send("DOM.describeNode", { backendNodeId });
  const attributes = node.attributes ?? [];
  const classIndex = attributes.indexOf("class");
  return classIndex === -1 ? node.nodeName : (attributes[classIndex + 1] as string);
}

function App({ toaster, region = true, open }: { toaster: Toaster; region?: boolean; open: boolean }) {
  return (
    <ThemeProvider>
      {region ? <ToastRegion toaster={toaster} /> : null}
      <Dialog aria-label="Edit" open={open}>
        <button type="button">Inside</button>
      </Dialog>
    </ThemeProvider>
  );
}

async function raise(toaster: Toaster) {
  act(() => {
    toaster.toast("Saved");
  });
  await settled();
}

describe("the toast region over a modal dialog, in a browser", () => {
  it("paints above a dialog opened after it", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    await raise(toaster);
    rerender(<App toaster={toaster} open />);
    await settled();
    expect(document.querySelector("dialog")?.matches(":modal")).toBe(true);
    expect(popoverElement().matches(":popover-open")).toBe(true);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  });

  it("paints above each of two dialogs opened one after the other", async () => {
    const toaster = createToaster();
    const view = (second: boolean) => (
      <ThemeProvider>
        <ToastRegion toaster={toaster} />
        <Dialog aria-label="First" open>
          <Dialog aria-label="Second" open={second}>
            <button type="button">Inside</button>
          </Dialog>
        </Dialog>
      </ThemeProvider>
    );
    const { rerender } = render(view(false));
    await raise(toaster);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
    rerender(view(true));
    await settled();
    expect(document.querySelectorAll("dialog:modal")).toHaveLength(2);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  });

  it("paints above a dialog open in the same render it mounts in", async () => {
    const toaster = createToaster();
    render(<App toaster={toaster} open />);
    await raise(toaster);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  });

  it("paints above a dialog already open when it mounts", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} region={false} open />);
    await settled();
    rerender(<App toaster={toaster} open />);
    await raise(toaster);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  });

  it("leaves the announcer untouched while it shows itself again", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    await raise(toaster);
    const before = announcer().innerHTML;
    const records: MutationRecord[] = [];
    const watcher = new MutationObserver((batch) => records.push(...batch));
    watcher.observe(announcer(), { subtree: true, childList: true, characterData: true, attributes: true });
    const show = vi.spyOn(popoverElement(), "showPopover");
    rerender(<App toaster={toaster} open />);
    await settled();
    expect(show).toHaveBeenCalledTimes(1);
    records.push(...watcher.takeRecords());
    watcher.disconnect();
    expect(records).toEqual([]);
    expect(announcer().innerHTML).toBe(before);
  });

  it("stops showing itself again once it unmounts", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    const popover = popoverElement();
    const show = vi.spyOn(popover, "showPopover");
    const hide = vi.spyOn(popover, "hidePopover");
    rerender(<App toaster={toaster} region={false} open={false} />);
    expect(hide).toHaveBeenCalledTimes(1);
    rerender(<App toaster={toaster} region={false} open />);
    await settled();
    expect(document.querySelector("dialog")?.matches(":modal")).toBe(true);
    expect(show).not.toHaveBeenCalled();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
