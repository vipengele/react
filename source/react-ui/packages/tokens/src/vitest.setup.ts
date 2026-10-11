import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// jsdom implements no `matchMedia`. The stub answers `prefers-color-scheme: dark` from a flag
// tests flip with `setSystemPrefersDark`, which also fires `change` at every listener on that
// query; every other query never matches.
let prefersDark = false;
const darkListeners = new Set<EventListenerOrEventListenerObject>();

function notify(listener: EventListenerOrEventListenerObject, event: Event): void {
  if (typeof listener === "function") listener(event);
  else listener.handleEvent(event);
}

/** Sets the stubbed `prefers-color-scheme: dark` and fires `change` at its listeners. */
export function setSystemPrefersDark(matches: boolean): void {
  prefersDark = matches;
  const event = new Event("change");
  for (const listener of darkListeners) notify(listener, event);
}

/** How many `change` listeners are subscribed to `prefers-color-scheme: dark`. */
export function systemColorSchemeListenerCount(): number {
  return darkListeners.size;
}

function matchMedia(query: string): MediaQueryList {
  const isDarkQuery = query === DARK_QUERY;
  return {
    media: query,
    get matches() {
      return isDarkQuery && prefersDark;
    },
    onchange: null,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (isDarkQuery && type === "change") darkListeners.add(listener);
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (isDarkQuery && type === "change") darkListeners.delete(listener);
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
  prefersDark = false;
  darkListeners.clear();
  window.matchMedia = matchMedia;
  document.documentElement.removeAttribute("data-theme");
});

// Unmounting between tests is what disconnects each provider's MutationObserver and media
// listener; without it they accumulate and fire into the next test's renders.
afterEach(() => {
  cleanup();
});
