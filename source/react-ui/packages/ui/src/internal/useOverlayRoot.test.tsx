import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useOverlayRoot } from "./useOverlayRoot.js";

/** Appends `markup` to the document, outside any React tree, and returns its container. */
function mount(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  return container;
}

function resolve(reference: Element | null | undefined): Element | null {
  return renderHook(() => useOverlayRoot(reference)).result.current;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("useOverlayRoot", () => {
  it("resolves the nearest overlay-root ancestor over an enclosing .vpg-root", () => {
    const container = mount(`
      <div class="vpg-root" id="theme">
        <dialog data-vpg-overlay-root id="modal">
          <button id="trigger">Open</button>
        </dialog>
      </div>
    `);
    const trigger = container.querySelector("#trigger");
    expect(resolve(trigger)).toBe(container.querySelector("#modal"));
  });

  it("resolves an overlay-root ancestor even when a nearer .vpg-root sits inside it", () => {
    const container = mount(`
      <dialog data-vpg-overlay-root id="modal">
        <div class="vpg-root">
          <button id="trigger">Open</button>
        </div>
      </dialog>
    `);
    expect(resolve(container.querySelector("#trigger"))).toBe(container.querySelector("#modal"));
  });

  it("falls back to the nearest .vpg-root when no overlay-root ancestor exists", () => {
    const container = mount(`
      <div class="vpg-root" id="outer">
        <div class="vpg-root" id="inner">
          <button id="trigger">Open</button>
        </div>
      </div>
    `);
    expect(resolve(container.querySelector("#trigger"))).toBe(container.querySelector("#inner"));
  });

  it("ignores an overlay root that is not an ancestor of the reference", () => {
    const container = mount(`
      <dialog data-vpg-overlay-root></dialog>
      <div class="vpg-root" id="theme">
        <button id="trigger">Open</button>
      </div>
    `);
    expect(resolve(container.querySelector("#trigger"))).toBe(container.querySelector("#theme"));
  });

  it("resolves null, never document.body, when the reference has neither ancestor", () => {
    const container = mount(`<button id="trigger">Open</button>`);
    expect(resolve(container.querySelector("#trigger"))).toBeNull();
  });

  it("resolves null before the reference element is attached", () => {
    expect(resolve(null)).toBeNull();
    expect(resolve(undefined)).toBeNull();
  });
});
