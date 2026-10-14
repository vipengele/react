import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAvailableWidth } from "./useAvailableWidth.js";

/** A `ResizeObserver` whose instances the test can fire, and whose observed targets it can read. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly targets = new Set<Element>();
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }
  fire() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

/** The border-box widths `getBoundingClientRect` reports, by the class the element carries. */
const widths = { container: 600.6, select: 44 };

function rectWidth(element: Element): number {
  if (element.classList.contains("vpg-table-container")) return widths.container;
  if (element.classList.contains("vpg-data-table-select")) return widths.select;
  return 0;
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  widths.container = 600.6;
  widths.select = 44;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return { width: rectWidth(this) } as DOMRect;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface Props {
  enabled?: boolean;
  selectable?: boolean;
  padding?: string;
  onRender?: (width: number) => void;
}

function Measured({ enabled = true, selectable = false, padding, onRender }: Props) {
  const { rowRef, availableWidth } = useAvailableWidth(enabled, selectable);
  onRender?.(availableWidth);
  return (
    <div className="vpg-table-container" style={padding === undefined ? undefined : { padding }}>
      <table>
        <thead>
          <tr ref={rowRef} data-available={availableWidth}>
            {selectable ? <th className="vpg-data-table-select" /> : null}
            <th />
          </tr>
        </thead>
      </table>
    </div>
  );
}

function available(container: HTMLElement): number {
  return Number(container.querySelector("tr")?.getAttribute("data-available"));
}

function observer(): FakeResizeObserver {
  return FakeResizeObserver.instances.at(-1) as FakeResizeObserver;
}

describe("useAvailableWidth", () => {
  it("measures the container's content width in whole pixels, rounded down", () => {
    const { container } = render(<Measured />);
    expect(available(container)).toBe(600);
  });

  it("subtracts the container's padding", () => {
    const { container } = render(<Measured padding="0 8px" />);
    expect(available(container)).toBe(584);
  });

  it("subtracts the container's borders and scrollbar", () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(601);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(586);
    const { container } = render(<Measured />);
    expect(available(container)).toBe(585);
  });

  it("subtracts the selection column's header cell and observes it beside the container", () => {
    const { container } = render(<Measured selectable />);
    expect(available(container)).toBe(556);
    const targets = [...observer().targets].map((target) => target.className);
    expect(targets).toEqual(["vpg-table-container", "vpg-data-table-select"]);
  });

  it("never reports a negative width", () => {
    widths.container = 30;
    const { container } = render(<Measured selectable />);
    expect(available(container)).toBe(0);
  });

  it("re-measures on a resize and renders only when the whole-pixel width changes", () => {
    const onRender = vi.fn();
    const { container } = render(<Measured onRender={onRender} />);
    onRender.mockClear();
    widths.container = 600.9;
    act(() => observer().fire());
    expect(onRender).not.toHaveBeenCalled();
    widths.container = 720;
    act(() => observer().fire());
    expect(available(container)).toBe(720);
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it("observes again when the selection column comes or goes", () => {
    const { container, rerender } = render(<Measured />);
    const first = observer();
    rerender(<Measured selectable />);
    expect(first.disconnected).toBe(true);
    expect(observer()).not.toBe(first);
    expect(available(container)).toBe(556);
  });

  it("is 0 and observes nothing while disabled", () => {
    const { container } = render(<Measured enabled={false} />);
    expect(available(container)).toBe(0);
    expect(FakeResizeObserver.instances).toHaveLength(0);
  });

  it("returns to 0 and disconnects when disabled after measuring", () => {
    const { container, rerender } = render(<Measured />);
    const first = observer();
    rerender(<Measured enabled={false} />);
    expect(available(container)).toBe(0);
    expect(first.disconnected).toBe(true);
  });

  it("disconnects its observer on unmount", () => {
    const { unmount } = render(<Measured selectable />);
    const first = observer();
    unmount();
    expect(first.disconnected).toBe(true);
  });

  it("is 0 while its ref is attached to no row", () => {
    const { result } = renderHook(() => useAvailableWidth(true, false));
    expect(result.current.availableWidth).toBe(0);
    expect(FakeResizeObserver.instances).toHaveLength(0);
  });
});
