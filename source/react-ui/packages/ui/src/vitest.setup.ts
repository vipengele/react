import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Testing Library only auto-cleans when Vitest runs with `globals: true`, which this package
// doesn't. Without this, every render stays in the document and `screen` queries match the
// previous test's markup too.
afterEach(cleanup);

// jsdom implements no `ResizeObserver`. Floating-ui's `autoUpdate` constructs one the moment a
// floating element mounts, so without this stub every test that opens a Tooltip throws
// `ResizeObserver is not defined`. Nothing resizes in jsdom, so the callback never needs firing —
// the constructor only has to exist.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom implements no `Element.prototype.scrollIntoView` either. Floating-ui's list navigation
// scrolls the highlighted option into view on every keyboard move, so without this stub every
// arrow key pressed on an open Dropdown throws `scrollIntoView is not a function`. jsdom lays
// nothing out, so there is nothing for the stub to do.
Element.prototype.scrollIntoView = () => {};

// jsdom reflects a `<dialog>`'s `open` attribute but implements neither `showModal()` nor
// `close()`, so without these stubs every test that opens a modal dialog throws
// `showModal is not a function`. jsdom has no top layer and no inertness, so the stubs only
// toggle `open` and fire the `close` event the spec dispatches when an open dialog closes. The
// guard leaves a jsdom that implements them running its own.
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom reflects the `popover` attribute but implements neither `showPopover()` nor
// `hidePopover()`, so without these stubs every test that mounts a `ToastRegion` throws
// `showPopover is not a function`. Its default stylesheet hides every popover that does not match
// `:popover-open`, which no element ever does here, so a popover's content would be absent from
// every role query. jsdom has no top layer, so the stubs only toggle an inline `display` that
// overrides that rule, as the `<dialog>` stubs toggle `open`. The guard leaves a jsdom that
// implements them running its own.
if (typeof HTMLElement.prototype.showPopover !== "function") {
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.style.setProperty("display", "block");
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.style.removeProperty("display");
  };
}
