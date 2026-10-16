import { act, fireEvent, render, screen } from "@testing-library/react";
import { Locale, LocalDate } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DateRange } from "../internal/localRange.js";
import { RangeCalendar, type RangeCalendarProps } from "./RangeCalendar.js";

// en-US starts its week on Sunday. Every test passes a fixed `today`, so nothing depends on the
// day the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);
const range = (start: LocalDate, end: LocalDate): DateRange => ({ start, end });

function renderCalendar(props: Partial<RangeCalendarProps> = {}) {
  return render(<RangeCalendar locale={enUS} today={TODAY} {...props} />);
}

const day = (value: LocalDate) => screen.getByRole("gridcell", { name: value.format(enUS) });
const selectedDays = () => screen.getAllByRole("gridcell").filter((cell) => cell.getAttribute("aria-selected") === "true");
const tabStops = () => screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0);
/** The day numbers carrying `attribute`, in grid order. */
const daysWith = (attribute: string) =>
  screen
    .getAllByRole("gridcell")
    .filter((cell) => cell.hasAttribute(attribute))
    .map((cell) => Number(cell.textContent));

/** Real focus, not a synthesised event: the preview follows DOM focus. */
const focus = (element: HTMLElement) => act(() => element.focus());
const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });

describe("RangeCalendar", () => {
  describe("structure", () => {
    it("renders Calendar's grid under its own root class", () => {
      renderCalendar({ "data-testid": "root" } as Partial<RangeCalendarProps>);
      const root = screen.getByTestId("root");
      expect(root).toHaveClass("vpg-calendar", "vpg-range-calendar");
      expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    });

    it("injects its stylesheet once for any number of range calendars, beside Calendar's", () => {
      render(
        <>
          <RangeCalendar locale={enUS} today={TODAY} />
          <RangeCalendar locale={enUS} today={TODAY} />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-range-calendar"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-range-calendar {");
      expect(document.head.querySelectorAll('style[data-href="vpg-calendar"]')).toHaveLength(1);
    });

    it("never assigns a style inline", () => {
      const { container } = renderCalendar({ defaultValue: range(date(2026, 10, 3), date(2026, 10, 9)) });
      expect(container.querySelectorAll("[style]")).toHaveLength(0);
    });

    it("forwards its ref and the remaining props to the root, composing className", () => {
      const ref = createRef<HTMLDivElement>();
      renderCalendar({ ref, className: "custom", "data-testid": "root", "aria-label": "Stay" } as Partial<RangeCalendarProps>);
      const root = screen.getByTestId("root");
      expect(ref.current).toBe(root);
      expect(root).toHaveClass("vpg-calendar", "vpg-range-calendar", "custom");
      expect(root).toHaveAttribute("aria-label", "Stay");
    });

    it("focuses the tab-stop day on autoFocus, never the root", () => {
      renderCalendar({
        autoFocus: true,
        defaultValue: range(date(2026, 10, 3), date(2026, 10, 9)),
        "data-testid": "root",
      } as Partial<RangeCalendarProps>);
      expect(day(date(2026, 10, 3))).toHaveFocus();
      expect(screen.getByTestId("root")).not.toHaveAttribute("autofocus");
    });

    it("passes the month props and labels through to the grid", () => {
      const onMonthChange = vi.fn();
      renderCalendar({ defaultMonth: date(2026, 3, 1), onMonthChange, nextMonthLabel: "Later" });
      expect(screen.getByRole("grid", { name: "March 2026" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Later" }));
      expect(onMonthChange).toHaveBeenCalledWith(date(2026, 4, 1));
    });

    it("opens on the range start's month, and on the anchor's over it", () => {
      const { unmount } = renderCalendar({ defaultValue: range(date(2026, 3, 3), date(2026, 5, 9)) });
      expect(screen.getByRole("grid", { name: "March 2026" })).toBeInTheDocument();
      unmount();
      renderCalendar({ defaultValue: range(date(2026, 3, 3), date(2026, 5, 9)), anchor: date(2026, 7, 4) });
      expect(screen.getByRole("grid", { name: "July 2026" })).toBeInTheDocument();
    });
  });

  describe("picking", () => {
    it("anchors on the first pick, reporting the anchor and no range", () => {
      const onChange = vi.fn();
      const onAnchorChange = vi.fn();
      renderCalendar({ onChange, onAnchorChange });

      fireEvent.click(day(date(2026, 10, 9)));

      expect(onAnchorChange).toHaveBeenCalledExactlyOnceWith(date(2026, 10, 9));
      expect(onChange).not.toHaveBeenCalled();
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);
      expect(day(date(2026, 10, 9))).toHaveAttribute("data-range-start", "true");
      expect(day(date(2026, 10, 9))).toHaveAttribute("data-range-end", "true");
    });

    it("completes the range on the second pick, then clears the anchor", () => {
      const calls: string[] = [];
      const onChange = vi.fn((value: DateRange | undefined) => calls.push(`change ${value?.start}..${value?.end}`));
      const onAnchorChange = vi.fn((anchor: LocalDate | undefined) => calls.push(`anchor ${anchor}`));
      renderCalendar({ onChange, onAnchorChange });

      fireEvent.click(day(date(2026, 10, 9)));
      fireEvent.click(day(date(2026, 10, 12)));

      expect(calls).toEqual(["anchor 2026-10-09", "change 2026-10-09..2026-10-12", "anchor undefined"]);
      expect(selectedDays()).toEqual([day(date(2026, 10, 9)), day(date(2026, 10, 12))]);
      expect(daysWith("data-in-range")).toEqual([10, 11]);
      expect(daysWith("data-range-start")).toEqual([9]);
      expect(daysWith("data-range-end")).toEqual([12]);
    });

    it("swaps a second pick earlier than the anchor", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });

      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 9)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 9), date(2026, 10, 12)));
      expect(daysWith("data-range-start")).toEqual([9]);
      expect(daysWith("data-range-end")).toEqual([12]);
    });

    it("completes a one-day range when the anchor is picked again", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });

      fireEvent.click(day(date(2026, 10, 9)));
      fireEvent.click(day(date(2026, 10, 9)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 9), date(2026, 10, 9)));
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);
      expect(daysWith("data-in-range")).toEqual([]);
    });

    it("anchors afresh on a pick after a completed range, keeping the range until the next completion", () => {
      const onChange = vi.fn();
      const onAnchorChange = vi.fn();
      renderCalendar({ defaultValue: range(date(2026, 10, 3), date(2026, 10, 6)), onChange, onAnchorChange });

      fireEvent.click(day(date(2026, 10, 20)));

      expect(onAnchorChange).toHaveBeenCalledExactlyOnceWith(date(2026, 10, 20));
      expect(onChange).not.toHaveBeenCalled();
      // A pending anchor replaces the committed range on screen.
      expect(selectedDays()).toEqual([day(date(2026, 10, 20))]);
      expect(daysWith("data-in-range")).toEqual([]);

      fireEvent.click(day(date(2026, 10, 22)));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 20), date(2026, 10, 22)));
      expect(daysWith("data-in-range")).toEqual([21]);
    });

    it("reports a completion equal to the current range", () => {
      const onChange = vi.fn();
      renderCalendar({ defaultValue: range(date(2026, 10, 3), date(2026, 10, 6)), onChange });

      fireEvent.click(day(date(2026, 10, 3)));
      fireEvent.click(day(date(2026, 10, 6)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 3), date(2026, 10, 6)));
    });

    it("picks with Enter and Space on the focused day", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });

      focus(day(date(2026, 10, 9)));
      press("Enter");
      press("ArrowRight");
      press(" ");

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 9), date(2026, 10, 10)));
    });
  });

  describe("disabled days", () => {
    const weekends = (value: LocalDate) => value.dayOfWeek >= 6;

    it("refuses a disabled day as the anchor or the completing end", () => {
      const onChange = vi.fn();
      const onAnchorChange = vi.fn();
      // 2026-10-10 is a Saturday.
      renderCalendar({ isDateDisabled: weekends, onChange, onAnchorChange });

      fireEvent.click(day(date(2026, 10, 10)));
      expect(onAnchorChange).not.toHaveBeenCalled();

      fireEvent.click(day(date(2026, 10, 9)));
      fireEvent.click(day(date(2026, 10, 11)));
      expect(onChange).not.toHaveBeenCalled();
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);
    });

    it("refuses a day outside min and max as an end", () => {
      const onAnchorChange = vi.fn();
      renderCalendar({ min: date(2026, 10, 5), max: date(2026, 10, 25), onAnchorChange });

      fireEvent.click(day(date(2026, 10, 4)));
      fireEvent.click(day(date(2026, 10, 26)));

      expect(onAnchorChange).not.toHaveBeenCalled();
    });

    it("completes a range that runs across disabled days, drawing them inside it", () => {
      const onChange = vi.fn();
      renderCalendar({ isDateDisabled: weekends, onChange });

      fireEvent.click(day(date(2026, 10, 9)));
      fireEvent.click(day(date(2026, 10, 13)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 9), date(2026, 10, 13)));
      expect(daysWith("data-in-range")).toEqual([10, 11, 12]);
      expect(day(date(2026, 10, 10))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 10))).not.toHaveAttribute("aria-selected");
    });
  });

  describe("controlled and uncontrolled", () => {
    it("draws defaultValue and holds each completed range itself", () => {
      renderCalendar({ defaultValue: range(date(2026, 10, 3), date(2026, 10, 5)) });
      expect(daysWith("data-in-range")).toEqual([4]);

      fireEvent.click(day(date(2026, 10, 20)));
      fireEvent.click(day(date(2026, 10, 23)));
      expect(daysWith("data-in-range")).toEqual([21, 22]);
    });

    it("draws a controlled value and changes it only when the caller does", () => {
      const onChange = vi.fn();
      const { rerender } = renderCalendar({ value: range(date(2026, 10, 3), date(2026, 10, 5)), onChange });

      fireEvent.click(day(date(2026, 10, 20)));
      fireEvent.click(day(date(2026, 10, 23)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 20), date(2026, 10, 23)));
      expect(daysWith("data-in-range")).toEqual([4]);

      rerender(<RangeCalendar locale={enUS} today={TODAY} value={range(date(2026, 10, 20), date(2026, 10, 23))} onChange={onChange} />);
      expect(daysWith("data-in-range")).toEqual([21, 22]);
    });

    it("treats value={undefined} as a controlled calendar with no range", () => {
      const onChange = vi.fn();
      renderCalendar({ value: undefined, defaultValue: range(date(2026, 10, 3), date(2026, 10, 5)), onChange });
      expect(selectedDays()).toEqual([]);

      fireEvent.click(day(date(2026, 10, 7)));
      fireEvent.click(day(date(2026, 10, 9)));

      expect(onChange).toHaveBeenCalledOnce();
      expect(selectedDays()).toEqual([]);
    });

    it("follows a caller that updates the value it controls", () => {
      function Controlled() {
        const [value, setValue] = useState<DateRange | undefined>(undefined);
        return <RangeCalendar locale={enUS} today={TODAY} value={value} onChange={setValue} />;
      }
      render(<Controlled />);

      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 9)));

      expect(daysWith("data-range-start")).toEqual([9]);
      expect(daysWith("data-in-range")).toEqual([10, 11]);
    });

    it("draws a controlled anchor as an endpoint and completes from it", () => {
      const onChange = vi.fn();
      const onAnchorChange = vi.fn();
      renderCalendar({ anchor: date(2026, 10, 9), onChange, onAnchorChange });
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);

      fireEvent.click(day(date(2026, 10, 5)));

      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 5), date(2026, 10, 9)));
      expect(onAnchorChange).toHaveBeenCalledExactlyOnceWith(undefined);
      // The caller has not cleared the anchor it controls, so it is still drawn.
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);
    });

    it("treats anchor={undefined} as a controlled calendar with nothing pending", () => {
      const onChange = vi.fn();
      const onAnchorChange = vi.fn();
      renderCalendar({ anchor: undefined, onChange, onAnchorChange });

      fireEvent.click(day(date(2026, 10, 9)));
      fireEvent.click(day(date(2026, 10, 12)));

      expect(onAnchorChange.mock.calls).toEqual([[date(2026, 10, 9)], [date(2026, 10, 12)]]);
      expect(onChange).not.toHaveBeenCalled();
      expect(selectedDays()).toEqual([]);
    });

    it("follows a caller that updates the anchor it controls", () => {
      const onChange = vi.fn();
      function Controlled() {
        const [anchor, setAnchor] = useState<LocalDate | undefined>(undefined);
        return <RangeCalendar locale={enUS} today={TODAY} anchor={anchor} onAnchorChange={setAnchor} onChange={onChange} />;
      }
      render(<Controlled />);

      fireEvent.click(day(date(2026, 10, 9)));
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);

      fireEvent.click(day(date(2026, 10, 12)));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(range(date(2026, 10, 9), date(2026, 10, 12)));
      expect(selectedDays()).toEqual([day(date(2026, 10, 9)), day(date(2026, 10, 12))]);
    });
  });

  describe("tab stop", () => {
    it("falls back to the anchor, over the range start", () => {
      renderCalendar({ value: range(date(2026, 10, 3), date(2026, 10, 6)), anchor: date(2026, 10, 20) });
      expect(tabStops()).toEqual([day(date(2026, 10, 20))]);
    });

    it("falls back to the range start with no anchor", () => {
      renderCalendar({ value: range(date(2026, 10, 3), date(2026, 10, 6)) });
      expect(tabStops()).toEqual([day(date(2026, 10, 3))]);
    });

    it("falls back to today with neither", () => {
      renderCalendar();
      expect(tabStops()).toEqual([day(TODAY)]);
    });
  });

  describe("preview", () => {
    it("previews the span from the anchor to the hovered day", () => {
      renderCalendar();
      fireEvent.click(day(date(2026, 10, 9)));

      fireEvent.pointerEnter(day(date(2026, 10, 12)));

      expect(daysWith("data-preview")).toEqual([9, 10, 11, 12]);
      expect(daysWith("data-in-range")).toEqual([10, 11]);
      expect(daysWith("data-range-end")).toEqual([12]);
      expect(selectedDays()).toEqual([day(date(2026, 10, 9))]);
    });

    it("previews nothing with no anchor pending", () => {
      renderCalendar({ defaultValue: range(date(2026, 10, 3), date(2026, 10, 5)) });
      fireEvent.pointerEnter(day(date(2026, 10, 12)));
      expect(daysWith("data-preview")).toEqual([]);
      expect(daysWith("data-in-range")).toEqual([4]);
    });

    it("previews the span from the anchor to the focused day as focus moves", () => {
      renderCalendar();
      focus(day(date(2026, 10, 9)));
      press("Enter");

      press("ArrowRight");
      press("ArrowRight");
      expect(day(date(2026, 10, 11))).toHaveFocus();
      expect(daysWith("data-preview")).toEqual([9, 10, 11]);

      press("ArrowUp");
      expect(daysWith("data-preview")).toEqual([4, 5, 6, 7, 8, 9]);
      expect(daysWith("data-range-start")).toEqual([4]);
    });

    it("takes whichever of the pointer and focus moved last, and falls back to the other", () => {
      renderCalendar({ anchor: date(2026, 10, 9) });

      focus(day(date(2026, 10, 11)));
      expect(daysWith("data-range-end")).toEqual([11]);

      fireEvent.pointerEnter(day(date(2026, 10, 13)));
      expect(daysWith("data-range-end")).toEqual([13]);

      fireEvent.pointerLeave(day(date(2026, 10, 13)));
      expect(daysWith("data-range-end")).toEqual([11]);

      fireEvent.pointerEnter(day(date(2026, 10, 15)));
      act(() => (document.activeElement as HTMLElement).blur());
      expect(daysWith("data-range-end")).toEqual([15]);

      fireEvent.pointerLeave(day(date(2026, 10, 15)));
      expect(daysWith("data-preview")).toEqual([]);
      expect(daysWith("data-range-end")).toEqual([9]);
    });

    it("drops the focus preview when focus moves off the days onto a month button", () => {
      renderCalendar({ anchor: date(2026, 10, 9) });
      focus(day(date(2026, 10, 12)));
      expect(daysWith("data-preview")).toEqual([9, 10, 11, 12]);

      focus(screen.getByRole("button", { name: "Next month" }));

      expect(daysWith("data-preview")).toEqual([]);
    });

    it("still calls the caller's onFocus and onBlur", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      renderCalendar({ onFocus, onBlur });

      focus(day(date(2026, 10, 9)));
      act(() => (document.activeElement as HTMLElement).blur());

      expect(onFocus).toHaveBeenCalledOnce();
      expect(onBlur).toHaveBeenCalledOnce();
    });
  });
});
