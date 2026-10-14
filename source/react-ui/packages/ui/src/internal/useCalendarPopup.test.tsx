import { act, renderHook } from "@testing-library/react";
import { LocalDate } from "@vipengele/ts";
import { describe, expect, it, vi } from "vitest";
import { type CalendarPopupOptions, openingMonth, useCalendarPopup, usePanelMonth } from "./useCalendarPopup.js";

const OCTOBER = LocalDate.of(2026, 10, 14);
const MARCH = LocalDate.of(2026, 3, 9);
const JUNE_2027 = LocalDate.of(2027, 6, 1);

describe("openingMonth", () => {
  it("is the committed date when there is one", () => {
    expect(openingMonth(MARCH, OCTOBER, undefined, undefined)).toBe(MARCH);
  });

  it("is today when nothing is committed and no bound excludes it", () => {
    expect(openingMonth(undefined, OCTOBER, MARCH, JUNE_2027)).toBe(OCTOBER);
  });

  it("is min when today lies before it", () => {
    expect(openingMonth(undefined, MARCH, OCTOBER, JUNE_2027)).toBe(OCTOBER);
  });

  it("is max when today lies after it", () => {
    expect(openingMonth(undefined, JUNE_2027, undefined, OCTOBER)).toBe(OCTOBER);
  });

  it("prefers the committed date over a bound today lies past", () => {
    expect(openingMonth(MARCH, JUNE_2027, undefined, OCTOBER)).toBe(MARCH);
  });
});

describe("usePanelMonth", () => {
  it("starts on the opening month", () => {
    const { result } = renderHook(() => usePanelMonth(false, () => OCTOBER));
    expect(result.current[0]).toBe(OCTOBER);
  });

  it("resets to the opening month on each opening and keeps navigation while open", () => {
    let opening = OCTOBER;
    const { result, rerender } = renderHook(({ isOpen }) => usePanelMonth(isOpen, () => opening), { initialProps: { isOpen: false } });

    rerender({ isOpen: true });
    act(() => result.current[1](MARCH));
    expect(result.current[0]).toBe(MARCH);

    rerender({ isOpen: false });
    expect(result.current[0]).toBe(MARCH);

    opening = JUNE_2027;
    rerender({ isOpen: true });
    expect(result.current[0]).toBe(JUNE_2027);
  });

  it("does not reset on a re-render that leaves the pop-up open", () => {
    const { result, rerender } = renderHook(({ isOpen }) => usePanelMonth(isOpen, () => OCTOBER), { initialProps: { isOpen: true } });
    act(() => result.current[1](MARCH));
    rerender({ isOpen: true });
    expect(result.current[0]).toBe(MARCH);
  });
});

describe("useCalendarPopup", () => {
  function renderPopup(overrides: Partial<CalendarPopupOptions> = {}) {
    const onOpenChange = vi.fn();
    const options: CalendarPopupOptions = {
      open: undefined,
      defaultOpen: undefined,
      onOpenChange,
      editable: true,
      opening: () => OCTOBER,
      ...overrides,
    };
    const view = renderHook((props: CalendarPopupOptions) => useCalendarPopup(props), { initialProps: options });
    return { ...view, onOpenChange, options };
  }

  it("is closed by default and opens on request when uncontrolled", () => {
    const { result, onOpenChange } = renderPopup();
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.request(true));
    expect(result.current.isOpen).toBe(true);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("seeds the uncontrolled state from defaultOpen", () => {
    const { result } = renderPopup({ defaultOpen: true });
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.request(false));
    expect(result.current.isOpen).toBe(false);
  });

  it("follows the open prop and only reports requests when controlled", () => {
    const { result, rerender, onOpenChange, options } = renderPopup({ open: false });
    act(() => result.current.request(true));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(result.current.isOpen).toBe(false);
    rerender({ ...options, open: true });
    expect(result.current.isOpen).toBe(true);
  });

  it("never opens when the field is not editable", () => {
    const { result, onOpenChange } = renderPopup({ editable: false });
    act(() => result.current.request(true));
    expect(result.current.isOpen).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows no pop-up for a not-editable field whose open state is true", () => {
    const { result } = renderPopup({ editable: false, open: true });
    expect(result.current.isOpen).toBe(false);
  });

  it("still accepts a request to close when the field is not editable", () => {
    const { result, onOpenChange } = renderPopup({ editable: false, open: true });
    act(() => result.current.request(false));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("shows the opening month on each opening", () => {
    const { result } = renderPopup();
    act(() => result.current.request(true));
    expect(result.current.month).toBe(OCTOBER);
    act(() => result.current.setMonth(MARCH));
    expect(result.current.month).toBe(MARCH);
    act(() => result.current.request(false));
    act(() => result.current.request(true));
    expect(result.current.month).toBe(OCTOBER);
  });

  it("aims the return target at the calendar button on opening", () => {
    const { result } = renderPopup();
    const button = document.createElement("button");
    result.current.buttonRef.current = button;
    act(() => result.current.request(true));
    expect(result.current.returnFocus.current).toBe(button);
  });

  it("closeOnto re-aims the return target and closes", () => {
    const { result, onOpenChange } = renderPopup({ defaultOpen: true });
    const input = document.createElement("input");
    act(() => result.current.closeOnto(input));
    expect(result.current.returnFocus.current).toBe(input);
    expect(result.current.isOpen).toBe(false);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("aims the return target back at the button on the next opening after closeOnto", () => {
    const { result } = renderPopup({ defaultOpen: true });
    const button = document.createElement("button");
    result.current.buttonRef.current = button;
    act(() => result.current.closeOnto(document.createElement("input")));
    act(() => result.current.request(true));
    expect(result.current.returnFocus.current).toBe(button);
  });
});
