import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OVERLAY_ROOT_ATTRIBUTE, useOverlayRoot } from "./useOverlayRoot.js";

/** Builds a chain of nested elements from outermost to innermost, attaches it to the document,
 * and returns every element in the chain in the same order. */
function nest(...elements: HTMLElement[]): HTMLElement[] {
  elements.reduce((parent, child) => {
    parent.append(child);
    return child;
  });
  document.body.append(elements[0] as HTMLElement);
  return elements;
}

function div(attributes: { className?: string; overlayRoot?: boolean } = {}): HTMLElement {
  const element = document.createElement("div");
  if (attributes.className !== undefined) {
    element.className = attributes.className;
  }
  if (attributes.overlayRoot === true) {
    element.setAttribute(OVERLAY_ROOT_ATTRIBUTE, "");
  }
  return element;
}

function resolve(reference: Element | null): Element | null {
  return renderHook(() => useOverlayRoot(reference)).result.current.root;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("useOverlayRoot", () => {
  describe("root", () => {
    it("resolves an overlay root over a nearer .vpg-root", () => {
      const [overlayRoot, , trigger] = nest(div({ overlayRoot: true }), div({ className: "vpg-root" }), div());
      expect(resolve(trigger as HTMLElement)).toBe(overlayRoot);
    });

    it("resolves the nearest of several nested overlay roots", () => {
      const [, inner, trigger] = nest(div({ overlayRoot: true }), div({ overlayRoot: true }), div());
      expect(resolve(trigger as HTMLElement)).toBe(inner);
    });

    it("resolves the nearest .vpg-root when no overlay root is an ancestor", () => {
      const [, inner, trigger] = nest(div({ className: "vpg-root" }), div({ className: "vpg-root" }), div());
      expect(resolve(trigger as HTMLElement)).toBe(inner);
    });

    it("resolves to null when neither an overlay root nor a .vpg-root is an ancestor", () => {
      const [, trigger] = nest(div(), div());
      expect(resolve(trigger as HTMLElement)).toBeNull();
    });

    it("resolves to null before a reference element exists", () => {
      expect(resolve(null)).toBeNull();
    });

    it("resolves a fresh root when the reference moves", () => {
      const [themeRoot, first] = nest(div({ className: "vpg-root" }), div());
      const [overlayRoot, second] = nest(div({ overlayRoot: true }), div());
      const { result, rerender } = renderHook(({ reference }) => useOverlayRoot(reference), {
        initialProps: { reference: first as Element | null },
      });
      expect(result.current.root).toBe(themeRoot);
      rerender({ reference: second as Element });
      expect(result.current.root).toBe(overlayRoot);
    });
  });

  describe("portal", () => {
    function Overlay({ reference }: { reference: Element | null }) {
      const { portal } = useOverlayRoot(reference);
      return <div data-testid="host">{portal(<span data-testid="overlay">overlay</span>)}</div>;
    }

    it("renders the node into the resolved root", () => {
      const [themeRoot, trigger] = nest(div({ className: "vpg-root" }), div());
      render(<Overlay reference={trigger as HTMLElement} />);
      expect(screen.getByTestId("overlay").parentElement).toBe(themeRoot);
    });

    it("renders the node inline, never into document.body, when there is no root", () => {
      const [trigger] = nest(div());
      render(<Overlay reference={trigger as HTMLElement} />);
      expect(screen.getByTestId("overlay").parentElement).toBe(screen.getByTestId("host"));
    });
  });
});
