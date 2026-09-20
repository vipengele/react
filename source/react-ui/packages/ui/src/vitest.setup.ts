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
