import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { Dialog } from "../Dialog/Dialog.js";
import { ToastRegion } from "./ToastRegion.js";
import { createToaster, type Toaster } from "./toaster.js";

/**
 * jsdom has no top layer, no inertness and no accessibility tree, so whether a toast raised under
 * an open modal dialog paints above it, can be focused and clicked, and is exposed to assistive
 * technology is only provable in an engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the jsdom
// project's does; without this a dialog left open by one test keeps the page inert for the next.
afterEach(() => {
  cleanup();
});

function query<T extends Element>(selector: string, scope: ParentNode = document): T {
  const element = scope.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`nothing matches ${selector}`);
  }
  return element;
}

/** The spacing step the region is inset from the viewport by: `--vpg-space-4` in the default theme. */
const INSET = 16;

const popoverElement = () => query<HTMLElement>(".vpg-toast-region");
const hostElement = () => query<HTMLElement>(".vpg-toast-host");
const announcer = () => query<HTMLElement>(".vpg-toast-announcer");
const message = () => query<HTMLElement>(".vpg-toast-message", popoverElement());
const action = () => query<HTMLButtonElement>(".vpg-toast-action", popoverElement());
const viewport = () => query<HTMLElement>(".vpg-toast-viewport", popoverElement());
const dialogNamed = (name: string) => query<HTMLDialogElement>(`dialog[aria-label="${name}"]`);

/** Resolves once every transition and animation on the page has finished, so a toast or a dialog
 * is read at rest rather than part-way through its entry. */
async function settled() {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
}

/**
 * The class of what Chromium paints topmost at the centre of `element`, or the node name when
 * that is a pseudo-element such as a dialog's `::backdrop`. CDP's hit test with
 * `ignorePointerEventsNone` counts inert content, so it reports paint order whether or not the
 * element can be reached.
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

interface DomNode {
  nodeId: number;
  children?: DomNode[];
  contentDocument?: DomNode;
}

/**
 * Whether Chromium leaves `element` out of the accessibility tree. A modal dialog leaves out
 * everything outside its own subtree, reporting it as ignored. The test runs in an iframe, so the
 * element is looked up through every frame's document.
 */
async function ignoredInAccessibilityTree(element: Element): Promise<boolean> {
  element.setAttribute("data-ax-probe", "");
  try {
    const { root } = (await cdp().send("DOM.getDocument", { depth: -1, pierce: true })) as { root: DomNode };
    const documents: DomNode[] = [];
    const walk = (node: DomNode) => {
      if (node.contentDocument !== undefined) documents.push(node.contentDocument);
      for (const child of node.children ?? []) walk(child);
    };
    walk(root);
    for (const document of documents) {
      const { nodeId } = await cdp().send("DOM.querySelector", { nodeId: document.nodeId, selector: "[data-ax-probe]" });
      if (nodeId !== 0) {
        const { nodes } = await cdp().send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
        return (nodes[0] as { ignored: boolean }).ignored;
      }
    }
    throw new Error("the probed element is in no frame");
  } finally {
    element.removeAttribute("data-ax-probe");
  }
}

function App({ toaster, region = true, open, dialog = true }: { toaster: Toaster; region?: boolean; open: boolean; dialog?: boolean }) {
  return (
    <ThemeProvider>
      <button type="button" className="page-button">
        On the page
      </button>
      {region ? <ToastRegion toaster={toaster} /> : null}
      {dialog ? (
        <Dialog aria-label="Edit" open={open}>
          <button type="button">Inside</button>
        </Dialog>
      ) : null}
    </ThemeProvider>
  );
}

async function raise(toaster: Toaster, text = "Saved", onAction: () => void = () => {}) {
  act(() => {
    toaster.toast(text, { action: { label: "Undo", onAction } });
  });
  await settled();
}

/** Asserts the toast paints above everything and that it, its region and the announcer are
 * exposed to assistive technology. */
async function expectReachable() {
  expect(popoverElement().matches(":popover-open")).toBe(true);
  expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  expect(await ignoredInAccessibilityTree(action())).toBe(false);
  expect(await ignoredInAccessibilityTree(viewport())).toBe(false);
  expect(await ignoredInAccessibilityTree(announcer())).toBe(false);
}

describe("the toast region under a modal dialog, in a browser", () => {
  it("is reachable, focusable and clickable above a dialog opened after it", async () => {
    const toaster = createToaster();
    const onAction = vi.fn();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    await raise(toaster, "Saved", onAction);
    rerender(<App toaster={toaster} open />);
    await settled();
    expect(dialogNamed("Edit").matches(":modal")).toBe(true);
    // The probe tells inert content apart: the page behind the dialog is left out.
    expect(await ignoredInAccessibilityTree(query(".page-button"))).toBe(true);
    expect(hostElement().parentElement).toBe(dialogNamed("Edit"));
    await expectReachable();
    act(() => {
      action().focus();
    });
    expect(document.activeElement).toBe(action());
    await userEvent.click(action());
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(popoverElement().querySelector(".vpg-toast")).toBeNull();
    expect(dialogNamed("Edit").open).toBe(true);
  });

  it("is reachable above a dialog already open when it mounts", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} region={false} open />);
    await settled();
    rerender(<App toaster={toaster} open />);
    await raise(toaster);
    expect(hostElement().parentElement).toBe(dialogNamed("Edit"));
    await expectReachable();
  });

  it("is reachable above a dialog open in the same render it mounts in", async () => {
    const toaster = createToaster();
    render(<App toaster={toaster} open />);
    await raise(toaster);
    expect(hostElement().parentElement).toBe(dialogNamed("Edit"));
    await expectReachable();
  });

  it("follows nested dialogs up and back down, keeping its nodes and its timers", async () => {
    const toaster = createToaster();
    // Pinned to the top, away from where an earlier test's click left the pointer, which would
    // otherwise rest on the toast and hold the toaster paused.
    const view = (first: boolean, second: boolean) => (
      <ThemeProvider>
        <ToastRegion toaster={toaster} placement="top-start" />
        <Dialog aria-label="First" open={first}>
          <Dialog aria-label="Second" open={second}>
            <button type="button">Inside</button>
          </Dialog>
        </Dialog>
      </ThemeProvider>
    );
    const { rerender } = render(view(false, false));
    const themedRoot = hostElement().parentElement;
    const raisedAt = performance.now();
    act(() => {
      toaster.toast("Saved", { duration: 2000 });
    });
    await settled();
    const item = query(".vpg-toast", popoverElement());
    const spoken = announcer().firstElementChild;
    const pause = vi.spyOn(toaster.store, "pause");
    const registerRegion = vi.spyOn(toaster.store, "registerRegion");

    rerender(view(true, false));
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("First"));
    await expectReachableWithoutAction();

    rerender(view(true, true));
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("Second"));
    await expectReachableWithoutAction();

    rerender(view(true, false));
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("First"));
    await expectReachableWithoutAction();

    rerender(view(false, false));
    await settled();
    expect(hostElement().parentElement).toBe(themedRoot);
    expect(popoverElement().matches(":popover-open")).toBe(true);

    expect(query(".vpg-toast", popoverElement())).toBe(item);
    expect(announcer().firstElementChild).toBe(spoken);
    expect(pause).not.toHaveBeenCalled();
    expect(registerRegion).not.toHaveBeenCalled();
    expect(performance.now() - raisedAt).toBeLessThan(2000);
    // The store's timer runs from when the toast was raised, untouched by the moves.
    await vi.waitFor(() => expect(popoverElement().querySelector(".vpg-toast")).toBeNull(), { timeout: 3000, interval: 20 });
    expect(performance.now() - raisedAt).toBeLessThan(2400);
  });

  it("moves a toast into a dialog without replaying its entry", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    await raise(toaster);
    const item = query<HTMLElement>(".vpg-toast", popoverElement());
    rerender(<App toaster={toaster} open />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(hostElement().parentElement).toBe(dialogNamed("Edit"));
    expect(item.getAnimations()).toEqual([]);
    expect(getComputedStyle(item).opacity).toBe("1");
  });

  it("follows sibling dialogs by the order they opened in", async () => {
    const toaster = createToaster();
    const view = (first: boolean, second: boolean) => (
      <ThemeProvider>
        <ToastRegion toaster={toaster} />
        <Dialog aria-label="First" open={first}>
          <button type="button">In the first</button>
        </Dialog>
        <Dialog aria-label="Second" open={second}>
          <button type="button">In the second</button>
        </Dialog>
      </ThemeProvider>
    );
    const { rerender } = render(view(false, false));
    await raise(toaster);
    rerender(view(false, true));
    await settled();
    rerender(view(true, true));
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("First"));
    await expectReachable();
    rerender(view(false, true));
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("Second"));
    await expectReachable();
  });

  it("survives a dialog that unmounts while open with the region inside it", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open />);
    await raise(toaster);
    const host = hostElement();
    expect(host.parentElement).toBe(dialogNamed("Edit"));
    rerender(<App toaster={toaster} open dialog={false} />);
    await settled();
    expect(hostElement()).toBe(host);
    expect(host.parentElement).toBe(query(".vpg-root"));
    expect(popoverElement().matches(":popover-open")).toBe(true);
    expect(message()).toHaveTextContent("Saved");
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
    expect(await ignoredInAccessibilityTree(action())).toBe(false);
  });

  it("returns to the page when the dialog closes, still shown", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open />);
    await raise(toaster);
    rerender(<App toaster={toaster} open={false} />);
    await settled();
    expect(hostElement().parentElement).toBe(query(".vpg-root"));
    expect(popoverElement().matches(":popover-open")).toBe(true);
    expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
    expect(await ignoredInAccessibilityTree(action())).toBe(false);
  });

  it("keeps its placement and its theme inside the dialog", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    act(() => {
      toaster.toast.success("Saved");
    });
    await settled();
    const background = getComputedStyle(query(".vpg-toast", popoverElement())).backgroundColor;
    rerender(<App toaster={toaster} open />);
    await settled();
    expect(hostElement().parentElement).toBe(dialogNamed("Edit"));
    // The scroll lock reserves the scrollbar gutter, which narrows the box every fixed top-layer
    // element is placed in, so the region is measured against a popover that never moves.
    const reference = document.createElement("div");
    reference.setAttribute("popover", "manual");
    reference.style.cssText = `position: fixed; inset: auto ${INSET}px ${INSET}px auto; width: 1px; height: 1px; margin: 0; padding: 0; border: 0`;
    document.body.append(reference);
    try {
      reference.showPopover();
      const { bottom, right } = popoverElement().getBoundingClientRect();
      const expected = reference.getBoundingClientRect();
      expect(bottom).toBeCloseTo(expected.bottom, 0);
      expect(right).toBeCloseTo(expected.right, 0);
    } finally {
      reference.remove();
    }
    const toast = query(".vpg-toast", popoverElement());
    expect(getComputedStyle(toast).backgroundColor).toBe(background);
    expect(getComputedStyle(toast).getPropertyValue("--vpg-success-wash")).not.toBe("");
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("leaves the announcer's own nodes untouched while it moves and shows itself again", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    await raise(toaster);
    const before = announcer().innerHTML;
    const inside: MutationRecord[] = [];
    const insideWatcher = new MutationObserver((batch) => inside.push(...batch));
    insideWatcher.observe(announcer(), { subtree: true, childList: true, characterData: true, attributes: true });
    const moves: MutationRecord[] = [];
    const moveWatcher = new MutationObserver((batch) => moves.push(...batch));
    moveWatcher.observe(document.body, { subtree: true, childList: true });
    const show = vi.spyOn(popoverElement(), "showPopover");
    rerender(<App toaster={toaster} open />);
    await settled();
    expect(show).toHaveBeenCalledTimes(1);
    inside.push(...insideWatcher.takeRecords());
    insideWatcher.disconnect();
    moves.push(...moveWatcher.takeRecords());
    moveWatcher.disconnect();
    expect(inside).toEqual([]);
    expect(announcer().innerHTML).toBe(before);
    // The move itself takes the host, with the live region inside it, out of the document and puts
    // it back: the only records naming it.
    const host = hostElement();
    expect(moves.filter((record) => [...record.removedNodes].includes(host)).map((record) => record.target)).toEqual([query(".vpg-root")]);
    expect(moves.filter((record) => [...record.addedNodes].includes(host)).map((record) => record.target)).toEqual([dialogNamed("Edit")]);
  });

  it("removes its host and stops moving once it unmounts", async () => {
    const toaster = createToaster();
    const { rerender } = render(<App toaster={toaster} open={false} />);
    const host = hostElement();
    const popover = popoverElement();
    const show = vi.spyOn(popover, "showPopover");
    rerender(<App toaster={toaster} region={false} open={false} />);
    expect(host.isConnected).toBe(false);
    rerender(<App toaster={toaster} region={false} open />);
    await settled();
    expect(dialogNamed("Edit").matches(":modal")).toBe(true);
    expect(dialogNamed("Edit").contains(host)).toBe(false);
    expect(show).not.toHaveBeenCalled();
  });
});

/** `expectReachable` for a toast raised without an action. */
async function expectReachableWithoutAction() {
  expect(popoverElement().matches(":popover-open")).toBe(true);
  expect(await paintedAtCentreOf(message())).toBe("vpg-toast-message");
  expect(await ignoredInAccessibilityTree(query(".vpg-toast-dismiss", popoverElement()))).toBe(false);
  expect(await ignoredInAccessibilityTree(viewport())).toBe(false);
  expect(await ignoredInAccessibilityTree(announcer())).toBe(false);
}
