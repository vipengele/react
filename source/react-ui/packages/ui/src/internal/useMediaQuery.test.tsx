import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NARROW_VIEWPORT_QUERY, useMediaQuery } from "./useMediaQuery.js";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

/** Replaces `window.matchMedia` with a controllable list and returns its handles. */
function stubMatchMedia(initial: boolean) {
  let listener: (() => void) | undefined;
  const list = {
    matches: initial,
    addEventListener: vi.fn((_type: string, next: () => void) => {
      listener = next;
    }),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn(() => list as unknown as MediaQueryList);
  return {
    list,
    change(matches: boolean) {
      list.matches = matches;
      listener?.();
    },
  };
}

describe("useMediaQuery", () => {
  it("renders false on the server", () => {
    function Probe() {
      return <span>{String(useMediaQuery(NARROW_VIEWPORT_QUERY))}</span>;
    }
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("reports the current match", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery(NARROW_VIEWPORT_QUERY));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(NARROW_VIEWPORT_QUERY);
  });

  it("re-renders when the match changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(NARROW_VIEWPORT_QUERY));
    expect(result.current).toBe(false);
    act(() => media.change(true));
    expect(result.current).toBe(true);
  });

  it("stops listening on unmount", () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery(NARROW_VIEWPORT_QUERY));
    expect(media.list.removeEventListener).not.toHaveBeenCalled();
    unmount();
    expect(media.list.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("is false under the default jsdom stub", () => {
    const { result } = renderHook(() => useMediaQuery(NARROW_VIEWPORT_QUERY));
    expect(result.current).toBe(false);
  });
});
