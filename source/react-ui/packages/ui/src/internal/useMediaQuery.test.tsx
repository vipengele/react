import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mediaQueryListenerCount, setViewportWidth } from "../vitest.setup.js";
import { useMediaQuery } from "./useMediaQuery.js";

function Probe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <output>{matches === undefined ? "unresolved" : String(matches)}</output>;
}

describe("useMediaQuery", () => {
  it("resolves true when the query matches", () => {
    setViewportWidth(500);
    const { container } = render(<Probe query="(width < 40rem)" />);
    expect(container).toHaveTextContent("true");
  });

  it("resolves false when the query does not match", () => {
    setViewportWidth(800);
    const { container } = render(<Probe query="(width < 600px)" />);
    expect(container).toHaveTextContent("false");
  });

  it("resolves false for a query it does not understand", () => {
    const { container } = render(<Probe query="(prefers-reduced-motion: reduce)" />);
    expect(container).toHaveTextContent("false");
  });

  it("updates when the query's match changes", () => {
    setViewportWidth(800);
    const { container } = render(<Probe query="(width < 600px)" />);
    act(() => setViewportWidth(500));
    expect(container).toHaveTextContent("true");
    act(() => setViewportWidth(700));
    expect(container).toHaveTextContent("false");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<Probe query="(width < 600px)" />);
    expect(mediaQueryListenerCount()).toBe(1);
    unmount();
    expect(mediaQueryListenerCount()).toBe(0);
  });

  it("stays unresolved and subscribes to nothing when matchMedia is not a function", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const { container } = render(<Probe query="(width < 600px)" />);
    expect(container).toHaveTextContent("unresolved");
    expect(mediaQueryListenerCount()).toBe(0);
  });

  it("is unresolved in the server render", () => {
    expect(renderToString(<Probe query="(width < 600px)" />)).toContain("unresolved");
  });
});
