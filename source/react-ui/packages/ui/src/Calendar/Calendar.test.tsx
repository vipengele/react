import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar, type CalendarProps } from "./Calendar.js";

// en-US starts its week on Sunday and de-DE on Monday, so the two between them pin the weekday
// rotation. Every test passes a fixed `today`, so nothing depends on the day the suite runs.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);

function renderCalendar(props: Partial<CalendarProps> = {}) {
  return render(<Calendar locale={enUS} today={TODAY} {...props} />);
}

const grid = () => screen.getByRole("grid");
const heading = () => document.getElementById(grid().getAttribute("aria-labelledby") as string) as HTMLElement;
/** The grid's week rows, without the weekday header row. */
const weeks = (options: { hidden?: boolean } = {}) => within(grid().querySelector("tbody") as HTMLElement).getAllByRole("row", options);
const day = (value: LocalDate, locale: Locale = enUS) => screen.getByRole("gridcell", { name: value.format(locale) });
const tabStops = () => screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0);
const previousButton = () => screen.getByRole("button", { name: "Previous month" });
const nextButton = () => screen.getByRole("button", { name: "Next month" });
const clearButton = () => screen.getByRole("button", { name: "Clear" });

/** Real focus, not a synthesised event: focus moves are asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement as Element, { key, ...init });

describe("Calendar", () => {
  describe("structure", () => {
    it("labels the grid with a live month heading", () => {
      renderCalendar();
      expect(heading()).toHaveTextContent("October 2026");
      expect(heading()).toHaveAttribute("aria-live", "polite");
      expect(screen.getByRole("grid", { name: "October 2026" })).toBe(grid());
    });

    it("heads the columns with the weekdays from the locale's first day of the week", () => {
      renderCalendar();
      const headers = screen.getAllByRole("columnheader");
      expect(headers.map((header) => header.textContent)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      expect(headers[0]).toHaveAccessibleName("Sunday");
    });

    it("always renders six weeks, hiding the blank rows and the blank cells", () => {
      // February 2026 starts on a Sunday and fills exactly four en-US weeks.
      renderCalendar({ defaultMonth: date(2026, 2, 1) });
      const rows = weeks({ hidden: true });
      expect(rows).toHaveLength(6);
      expect(rows.slice(0, 4).every((row) => !row.hasAttribute("aria-hidden"))).toBe(true);
      expect(rows.slice(4).every((row) => row.getAttribute("aria-hidden") === "true")).toBe(true);
      expect(screen.getAllByRole("gridcell")).toHaveLength(28);
    });

    it("renders the leading and trailing days of other months as inert blanks", () => {
      renderCalendar();
      // October 2026 starts on a Thursday: four blanks before it in an en-US week.
      const [firstWeek] = weeks();
      const cells = [...(firstWeek as HTMLElement).children];
      expect(cells.slice(0, 4).every((cell) => cell.getAttribute("aria-hidden") === "true" && cell.textContent === "")).toBe(true);
      expect(cells.slice(0, 4).every((cell) => !cell.hasAttribute("tabindex"))).toBe(true);
      expect(cells[4]).toHaveAccessibleName(date(2026, 10, 1).format(enUS));
      expect(screen.getAllByRole("gridcell")).toHaveLength(31);
    });

    it("names each day by its formatted date and shows its day number", () => {
      renderCalendar();
      expect(day(date(2026, 10, 3))).toHaveTextContent("3");
      expect(day(date(2026, 10, 3))).toHaveClass("vpg-calendar-day");
    });

    it("marks today with aria-current", () => {
      renderCalendar();
      expect(day(TODAY)).toHaveAttribute("aria-current", "date");
      expect(day(date(2026, 10, 13))).not.toHaveAttribute("aria-current");
    });

    it("defaults today to the current date", () => {
      const now = LocalDate.now();
      render(<Calendar locale={enUS} />);
      expect(heading()).toHaveTextContent(`${enUS.monthNames("long")[now.month - 1]} ${now.year}`);
      expect(day(now)).toHaveAttribute("aria-current", "date");
    });

    it("injects its stylesheet once for any number of calendars", () => {
      render(
        <>
          <Calendar locale={enUS} today={TODAY} />
          <Calendar locale={enUS} today={TODAY} />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-calendar"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-calendar {");
    });

    it("never assigns a style inline", () => {
      const { container } = renderCalendar({ clearable: true, defaultValue: TODAY });
      expect(container.querySelectorAll("[style]")).toHaveLength(0);
    });

    it("forwards its ref and the remaining props to the root, composing className", () => {
      const ref = createRef<HTMLDivElement>();
      renderCalendar({ ref, className: "custom", "data-testid": "root", "aria-label": "Due date" } as Partial<CalendarProps>);
      const root = screen.getByTestId("root");
      expect(ref.current).toBe(root);
      expect(root).toHaveClass("vpg-calendar", "custom");
      expect(root).toHaveAttribute("aria-label", "Due date");
      expect(root).toContainElement(grid());
    });
  });

  describe("locale", () => {
    it("takes its names, labels and first day of the week from the locale prop", () => {
      render(<Calendar locale={deDE} today={TODAY} />);
      expect(heading()).toHaveTextContent("Oktober 2026");
      const headers = screen.getAllByRole("columnheader");
      expect(headers.map((header) => header.textContent)).toEqual(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
      expect(headers[0]).toHaveAccessibleName("Montag");
      expect(day(TODAY, deDE)).toHaveAttribute("aria-current", "date");
      // October 2026 starts on a Thursday: three blanks before it in a de-DE week.
      const [firstWeek] = weeks();
      expect((firstWeek as HTMLElement).querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    });

    it("moves Home and End to the de-DE week's Monday and Sunday", () => {
      render(<Calendar locale={deDE} today={TODAY} />);
      focus(day(TODAY, deDE));
      press("Home");
      expect(document.activeElement).toBe(day(date(2026, 10, 12), deDE));
      press("End");
      expect(document.activeElement).toBe(day(date(2026, 10, 18), deDE));
    });

    it("reads the nearest LocaleProvider without a locale prop", () => {
      render(
        <LocaleProvider locale={deDE}>
          <Calendar today={TODAY} />
        </LocaleProvider>,
      );
      expect(heading()).toHaveTextContent("Oktober 2026");
      expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Mo");
    });

    it("prefers its locale prop over a LocaleProvider's", () => {
      render(
        <LocaleProvider locale={deDE}>
          <Calendar locale={enUS} today={TODAY} />
        </LocaleProvider>,
      );
      expect(heading()).toHaveTextContent("October 2026");
    });

    it("falls back to the runtime's default locale", () => {
      const fallback = Locale.default();
      render(<Calendar today={TODAY} />);
      expect(heading()).toHaveTextContent(`${fallback.monthNames("long")[9]} 2026`);
      expect(day(TODAY, fallback)).toHaveAttribute("aria-current", "date");
    });
  });

  describe("tab stop", () => {
    it("is the selected day when it is in the visible month", () => {
      renderCalendar({ defaultValue: date(2026, 10, 3) });
      expect(tabStops()).toEqual([day(date(2026, 10, 3))]);
    });

    it("is today when nothing in the visible month is selected", () => {
      renderCalendar({ defaultValue: date(2026, 9, 3), defaultMonth: date(2026, 10, 1) });
      expect(tabStops()).toEqual([day(TODAY)]);
    });

    it("is the month's first enabled day when neither the selection nor today is in it", () => {
      renderCalendar({ defaultMonth: date(2026, 11, 1), isDateDisabled: (value) => value.day === 1 });
      expect(tabStops()).toEqual([day(date(2026, 11, 2))]);
    });

    it("follows the day the user last focused while its month is visible", () => {
      renderCalendar();
      focus(day(date(2026, 10, 20)));
      expect(tabStops()).toEqual([day(date(2026, 10, 20))]);
    });
  });

  describe("selection", () => {
    it("selects a clicked day and reports it, uncontrolled", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });
      fireEvent.click(day(date(2026, 10, 5)));
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 5));
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
      expect(day(TODAY)).not.toHaveAttribute("aria-selected");
    });

    it("starts from defaultValue and shows its month", () => {
      renderCalendar({ defaultValue: date(2026, 3, 9) });
      expect(heading()).toHaveTextContent("March 2026");
      expect(day(date(2026, 3, 9))).toHaveAttribute("aria-selected", "true");
    });

    it("does not deselect the selected day when it is clicked again", () => {
      const onChange = vi.fn();
      renderCalendar({ defaultValue: date(2026, 10, 5), onChange });
      fireEvent.click(day(date(2026, 10, 5)));
      expect(onChange).not.toHaveBeenCalled();
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
    });

    it("leaves a controlled selection to its owner", () => {
      const onChange = vi.fn();
      renderCalendar({ value: date(2026, 10, 5), onChange });
      fireEvent.click(day(date(2026, 10, 6)));
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 6));
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
      expect(day(date(2026, 10, 6))).not.toHaveAttribute("aria-selected");
    });

    it("treats value={undefined} as a controlled, empty selection", () => {
      const onChange = vi.fn();
      renderCalendar({ value: undefined, defaultValue: date(2026, 10, 5), onChange });
      expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(0);
      fireEvent.click(day(date(2026, 10, 6)));
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 6));
      expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(0);
    });

    it("follows a controlled value its owner updates", () => {
      function Owner() {
        const [value, setValue] = useState<LocalDate | undefined>(undefined);
        return <Calendar locale={enUS} today={TODAY} value={value} onChange={setValue} />;
      }
      render(<Owner />);
      fireEvent.click(day(date(2026, 10, 6)));
      expect(day(date(2026, 10, 6))).toHaveAttribute("aria-selected", "true");
    });

    it("selects the focused day with Enter and with Space", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });
      focus(day(date(2026, 10, 7)));
      expect(press("Enter")).toBe(false);
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 7));
      focus(day(date(2026, 10, 8)));
      expect(press(" ")).toBe(false);
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 8));
    });

    it("ignores a key it does not handle", () => {
      const onChange = vi.fn();
      renderCalendar({ onChange });
      focus(day(TODAY));
      expect(press("a")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(day(TODAY));
    });
  });

  describe("constraints", () => {
    it("marks days outside min and max aria-disabled and refuses to select them", () => {
      const onChange = vi.fn();
      renderCalendar({ min: date(2026, 10, 5), max: date(2026, 10, 25), onChange });
      expect(day(date(2026, 10, 4))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 26))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 5))).not.toHaveAttribute("aria-disabled");
      fireEvent.click(day(date(2026, 10, 4)));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps a day isDateDisabled reports focusable but unselectable", () => {
      const onChange = vi.fn();
      // Weekends off.
      renderCalendar({ isDateDisabled: (value) => value.dayOfWeek >= 6, onChange });
      const saturday = day(date(2026, 10, 17));
      expect(saturday).toHaveAttribute("aria-disabled", "true");
      focus(saturday);
      expect(document.activeElement).toBe(saturday);
      expect(tabStops()).toEqual([saturday]);
      press("Enter");
      fireEvent.click(saturday);
      expect(onChange).not.toHaveBeenCalled();
      // Arrow keys pass through a disabled day rather than stopping before it.
      press("ArrowRight");
      expect(document.activeElement).toBe(day(date(2026, 10, 18)));
    });

    it("stops a day move at the bounds", () => {
      renderCalendar({ min: date(2026, 10, 14), max: date(2026, 10, 15) });
      focus(day(TODAY));
      press("ArrowLeft");
      expect(document.activeElement).toBe(day(TODAY));
      press("ArrowDown");
      expect(document.activeElement).toBe(day(TODAY));
    });

    it("marks the month buttons aria-disabled at the months of min and max and refuses a press there", () => {
      const onMonthChange = vi.fn();
      renderCalendar({ min: date(2026, 9, 20), max: date(2026, 11, 3), onMonthChange });
      expect(previousButton()).not.toHaveAttribute("aria-disabled");
      fireEvent.click(previousButton());
      expect(heading()).toHaveTextContent("September 2026");
      expect(previousButton()).toHaveAttribute("aria-disabled", "true");
      expect(previousButton()).toBeEnabled();
      fireEvent.click(previousButton());
      expect(heading()).toHaveTextContent("September 2026");
      fireEvent.click(nextButton());
      fireEvent.click(nextButton());
      expect(heading()).toHaveTextContent("November 2026");
      expect(nextButton()).toHaveAttribute("aria-disabled", "true");
      expect(nextButton()).toBeEnabled();
      expect(previousButton()).not.toHaveAttribute("aria-disabled");
      fireEvent.click(nextButton());
      expect(heading()).toHaveTextContent("November 2026");
      expect(onMonthChange.mock.calls.map(([month]) => month.toString())).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    });

    it("keeps focus on a month button that reaches its bound", () => {
      renderCalendar({ min: date(2026, 9, 20), max: date(2026, 11, 3) });
      focus(nextButton());
      fireEvent.click(nextButton());
      expect(nextButton()).toHaveAttribute("aria-disabled", "true");
      expect(nextButton().tabIndex).toBe(0);
      expect(document.activeElement).toBe(nextButton());
      focus(previousButton());
      fireEvent.click(previousButton());
      fireEvent.click(previousButton());
      expect(previousButton()).toHaveAttribute("aria-disabled", "true");
      expect(previousButton().tabIndex).toBe(0);
      expect(document.activeElement).toBe(previousButton());
    });

    it("refuses a month button press at the edges of the range LocalDate holds", () => {
      const onMonthChange = vi.fn();
      const { unmount } = renderCalendar({ defaultMonth: date(1, 1, 1), onMonthChange });
      expect(previousButton()).toHaveAttribute("aria-disabled", "true");
      expect(nextButton()).not.toHaveAttribute("aria-disabled");
      fireEvent.click(previousButton());
      expect(heading()).toHaveTextContent("January 1");
      unmount();
      renderCalendar({ defaultMonth: date(9999, 12, 1), onMonthChange });
      expect(nextButton()).toHaveAttribute("aria-disabled", "true");
      expect(previousButton()).not.toHaveAttribute("aria-disabled");
      fireEvent.click(nextButton());
      expect(heading()).toHaveTextContent("December 9999");
      expect(onMonthChange).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it("moves a day with Left and Right and a week with Up and Down", () => {
      renderCalendar();
      focus(day(TODAY));
      expect(press("ArrowRight")).toBe(false);
      expect(document.activeElement).toBe(day(date(2026, 10, 15)));
      press("ArrowDown");
      expect(document.activeElement).toBe(day(date(2026, 10, 22)));
      press("ArrowLeft");
      expect(document.activeElement).toBe(day(date(2026, 10, 21)));
      press("ArrowUp");
      expect(document.activeElement).toBe(day(date(2026, 10, 14)));
      expect(tabStops()).toEqual([day(TODAY)]);
    });

    it("moves to the start and end of the week with Home and End", () => {
      renderCalendar();
      focus(day(TODAY));
      press("Home");
      expect(document.activeElement).toBe(day(date(2026, 10, 11)));
      press("End");
      expect(document.activeElement).toBe(day(date(2026, 10, 17)));
    });

    it("changes the month and keeps focus when a move leaves the visible month", () => {
      const onMonthChange = vi.fn();
      renderCalendar({ onMonthChange });
      focus(day(date(2026, 10, 31)));
      press("ArrowRight");
      expect(heading()).toHaveTextContent("November 2026");
      expect(onMonthChange).toHaveBeenCalledWith(date(2026, 11, 1));
      expect(document.activeElement).toBe(day(date(2026, 11, 1)));
      expect(tabStops()).toEqual([day(date(2026, 11, 1))]);
    });

    it("pages a month with Page Up and Page Down and a year with Shift", () => {
      renderCalendar();
      focus(day(TODAY));
      press("PageUp");
      expect(document.activeElement).toBe(day(date(2026, 9, 14)));
      press("PageDown");
      expect(document.activeElement).toBe(day(date(2026, 10, 14)));
      press("PageDown", { shiftKey: true });
      expect(heading()).toHaveTextContent("October 2027");
      expect(document.activeElement).toBe(day(date(2027, 10, 14)));
      press("PageUp", { shiftKey: true });
      expect(document.activeElement).toBe(day(date(2026, 10, 14)));
    });

    it("clamps the day when paging into a shorter month", () => {
      renderCalendar({ defaultMonth: date(2026, 1, 1) });
      focus(day(date(2026, 1, 31)));
      press("PageDown");
      expect(document.activeElement).toBe(day(date(2026, 2, 28)));
    });

    it("clamps paging to min and max", () => {
      renderCalendar({ min: date(2026, 9, 20), max: date(2026, 11, 3) });
      focus(day(TODAY));
      press("PageUp");
      expect(document.activeElement).toBe(day(date(2026, 9, 20)));
      press("PageDown", { shiftKey: true });
      expect(document.activeElement).toBe(day(date(2026, 11, 3)));
    });

    it("moves a controlled month its owner follows, and focus with it", () => {
      function Owner() {
        const [month, setMonth] = useState(date(2026, 10, 1));
        return <Calendar locale={enUS} today={TODAY} month={month} onMonthChange={setMonth} />;
      }
      render(<Owner />);
      focus(day(date(2026, 10, 31)));
      press("ArrowDown");
      expect(heading()).toHaveTextContent("November 2026");
      expect(document.activeElement).toBe(day(date(2026, 11, 7)));
    });

    it("keeps focus and the tab stop when a controlled month ignores onMonthChange", () => {
      const onMonthChange = vi.fn();
      renderCalendar({ month: date(2026, 10, 1), onMonthChange });
      const last = day(date(2026, 10, 31));
      focus(last);
      press("ArrowRight");
      expect(onMonthChange).toHaveBeenCalledWith(date(2026, 11, 1));
      expect(heading()).toHaveTextContent("October 2026");
      expect(document.activeElement).toBe(last);
      expect(tabStops()).toEqual([last]);
    });

    it("moves the tab stop without taking focus when the grid does not hold it", () => {
      renderCalendar();
      // Dispatched on a day that is not focused: focus stays on the body.
      fireEvent.keyDown(day(TODAY), { key: "ArrowRight" });
      expect(document.activeElement).toBe(document.body);
      expect(tabStops()).toEqual([day(date(2026, 10, 15))]);
      fireEvent.keyDown(day(date(2026, 10, 15)), { key: "PageDown" });
      expect(heading()).toHaveTextContent("November 2026");
      expect(document.activeElement).toBe(document.body);
      expect(tabStops()).toEqual([day(date(2026, 11, 15))]);
    });
  });

  describe("month", () => {
    it("shows the month of defaultMonth over the selected day's", () => {
      renderCalendar({ defaultValue: date(2026, 3, 9), defaultMonth: date(2026, 5, 20) });
      expect(heading()).toHaveTextContent("May 2026");
    });

    it("reports the first day of the month a month button moves to", () => {
      const onMonthChange = vi.fn();
      renderCalendar({ month: date(2026, 10, 20), onMonthChange });
      fireEvent.click(nextButton());
      expect(onMonthChange).toHaveBeenCalledWith(date(2026, 11, 1));
      fireEvent.click(previousButton());
      expect(onMonthChange).toHaveBeenLastCalledWith(date(2026, 9, 1));
      expect(heading()).toHaveTextContent("October 2026");
    });

    it("keeps its month when the value moves elsewhere", () => {
      const { rerender } = renderCalendar({ value: date(2026, 10, 5) });
      rerender(<Calendar locale={enUS} today={TODAY} value={date(2027, 2, 5)} />);
      expect(heading()).toHaveTextContent("October 2026");
    });

    it("takes the month buttons' names from their label props", () => {
      renderCalendar({ previousMonthLabel: "Vormonat", nextMonthLabel: "Nächster Monat" });
      expect(screen.getByRole("button", { name: "Vormonat" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    });
  });

  describe("clear", () => {
    it("renders no Clear button unless clearable", () => {
      renderCalendar({ defaultValue: TODAY });
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    });

    it("is aria-disabled, not natively disabled, and reports nothing while nothing is selected", () => {
      const onChange = vi.fn();
      renderCalendar({ clearable: true, onChange });
      expect(clearButton()).toHaveAttribute("aria-disabled", "true");
      expect(clearButton()).toBeEnabled();
      fireEvent.click(clearButton());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("empties the selection, keeps the month and keeps focus on the button", () => {
      const onChange = vi.fn();
      renderCalendar({ clearable: true, defaultValue: date(2026, 10, 5), onChange });
      fireEvent.click(nextButton());
      expect(clearButton()).not.toHaveAttribute("aria-disabled");
      focus(clearButton());
      fireEvent.click(clearButton());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(heading()).toHaveTextContent("November 2026");
      expect(document.activeElement).toBe(clearButton());
      expect(clearButton()).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(previousButton());
      expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(0);
    });

    it("reports a clear of a controlled selection to its owner", () => {
      const onChange = vi.fn();
      renderCalendar({ clearable: true, value: date(2026, 10, 5), onChange });
      fireEvent.click(clearButton());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
    });

    it("takes its text from clearLabel", () => {
      renderCalendar({ clearable: true, clearLabel: "Löschen" });
      expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();
    });
  });

  describe("autoFocus", () => {
    it("focuses the tab-stop day on mount, not the root", () => {
      renderCalendar({ autoFocus: true, defaultValue: date(2026, 10, 9), "data-testid": "root" } as Partial<CalendarProps>);
      expect(document.activeElement).toBe(day(date(2026, 10, 9)));
      expect(screen.getByTestId("root")).not.toHaveAttribute("autofocus");
    });

    it("focuses nothing again when the tab stop later changes", () => {
      const { rerender } = renderCalendar({ autoFocus: true, month: date(2026, 10, 1) });
      act(() => (document.activeElement as HTMLElement).blur());
      rerender(<Calendar locale={enUS} today={TODAY} autoFocus month={date(2026, 11, 1)} />);
      expect(tabStops()).toEqual([day(date(2026, 11, 1))]);
      expect(document.activeElement).toBe(document.body);
    });

    it("leaves focus alone without autoFocus", () => {
      renderCalendar();
      expect(document.activeElement).toBe(document.body);
    });
  });
});
