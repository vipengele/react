import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
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

// jsdom implements no `matchMedia`. The stub answers `(width < N)` queries, in `px` or `rem`
// (1rem = 16px), from a simulated viewport width that tests set with `setViewportWidth`, which
// also fires `change` at every subscribed listener. Every other query never matches, and still
// takes listeners. The width and the listeners reset before each test.
const DEFAULT_VIEWPORT_WIDTH = 1024;
const WIDTH_QUERY = /^\(\s*width\s*<\s*(\d+(?:\.\d+)?)(px|rem)\s*\)$/;
const PX_PER_REM = 16;

let viewportWidth = DEFAULT_VIEWPORT_WIDTH;
const mediaListeners = new Set<{ query: string; listener: EventListenerOrEventListenerObject }>();

function matchesQuery(query: string): boolean {
  const match = WIDTH_QUERY.exec(query);
  if (match === null) return false;
  const limit = Number(match[1]) * (match[2] === "rem" ? PX_PER_REM : 1);
  return viewportWidth < limit;
}

/** Sets the simulated viewport width in px and fires `change` at every `matchMedia` listener. */
export function setViewportWidth(width: number): void {
  viewportWidth = width;
  const event = new Event("change");
  for (const { listener } of [...mediaListeners]) {
    if (typeof listener === "function") listener(event);
    else listener.handleEvent(event);
  }
}

/** How many `change` listeners are subscribed across every `matchMedia` query. */
export function mediaQueryListenerCount(): number {
  return mediaListeners.size;
}

function matchMedia(query: string): MediaQueryList {
  return {
    media: query,
    get matches() {
      return matchesQuery(query);
    },
    onchange: null,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type !== "change") return;
      for (const entry of mediaListeners) {
        if (entry.query === query && entry.listener === listener) return;
      }
      mediaListeners.add({ query, listener });
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type !== "change") return;
      for (const entry of mediaListeners) {
        if (entry.query === query && entry.listener === listener) mediaListeners.delete(entry);
      }
    },
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return true;
    },
  } as MediaQueryList;
}

Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });

beforeEach(() => {
  viewportWidth = DEFAULT_VIEWPORT_WIDTH;
  mediaListeners.clear();
  window.matchMedia = matchMedia;
});
