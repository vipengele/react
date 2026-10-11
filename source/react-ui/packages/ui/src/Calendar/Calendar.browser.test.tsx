import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Calendar, type CalendarProps } from "./Calendar.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one calendar.
afterEach(cleanup);

// en-US starts its week on Sunday. Every test passes a fixed `today` and month, so nothing
// depends on the day the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);

/** A calendar between two plain buttons, under a real `ThemeProvider`. */
function Page(props: Partial<CalendarProps>) {
  return (
    <ThemeProvider>
      <button type="button">Before</button>
      <Calendar locale={enUS} today={TODAY} data-testid="calendar" {...props} />
      <button type="button">After</button>
    </ThemeProvider>
  );
}

function renderPage(props: Partial<CalendarProps> = {}) {
  return render(<Page {...props} />);
}

const grid = () => screen.getByRole("grid");
const heading = () => document.getElementById(grid().getAttribute("aria-labelledby") as string) as HTMLElement;
const day = (value: LocalDate) => screen.getByRole("gridcell", { name: value.format(enUS) });
const tabStops = () => screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0);
const button = (name: string) => screen.getByRole("button", { name });
const root = () => screen.getByTestId("calendar");

/** Presses `key` on the focused element `times` times in a row. */
async function press(key: string, times = 1) {
  for (let count = 0; count < times; count++) await userEvent.keyboard(`{${key}}`);
}

/** What `value` resolves to for `property` on a probe inside the themed root. A custom property
 * read back off `getPropertyValue` is its authored text, not a computed value; a real property
 * consuming it through `var()` is what resolves it. */
function resolved(property: "width" | "color" | "backgroundColor" | "fontWeight", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

describe("Calendar's tab stop", () => {
  it("holds exactly one tab stop among the days", () => {
    renderPage({ defaultValue: date(2026, 10, 9) });
    expect(tabStops()).toEqual([day(date(2026, 10, 9))]);
  });

  it("enters the grid on its one day and leaves it with one more Tab", async () => {
    renderPage({ defaultValue: date(2026, 10, 9), clearable: true });
    button("Before").focus();

    await userEvent.tab();
    expect(button("Previous month")).toHaveFocus();
    await userEvent.tab();
    expect(button("Next month")).toHaveFocus();
    await userEvent.tab();
    expect(day(date(2026, 10, 9))).toHaveFocus();
    await userEvent.tab();
    expect(button("Clear")).toHaveFocus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();
  });

  it("leaves the grid for the next control on the page when there is no Clear button", async () => {
    renderPage();
    day(TODAY).focus();

    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(day(TODAY)).toHaveFocus();
  });

  it("re-enters the grid on the day the arrows last moved to", async () => {
    renderPage();
    day(TODAY).focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");

    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(day(date(2026, 10, 16))).toHaveFocus();
    expect(tabStops()).toEqual([day(date(2026, 10, 16))]);
  });
});

describe("Calendar's keymap with real focus", () => {
  it("moves a day with Left and Right and a week with Up and Down", async () => {
    renderPage();
    day(TODAY).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(day(date(2026, 10, 15))).toHaveFocus();
    await press("ArrowLeft", 2);
    expect(day(date(2026, 10, 13))).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(day(date(2026, 10, 20))).toHaveFocus();
    await press("ArrowUp", 2);
    expect(day(date(2026, 10, 6))).toHaveFocus();
    expect(tabStops()).toEqual([day(date(2026, 10, 6))]);
  });

  it("moves to the start and end of the locale's week with Home and End", async () => {
    renderPage();
    day(TODAY).focus();

    // 2026-10-14 is a Wednesday; the en-US week runs Sunday to Saturday.
    await userEvent.keyboard("{Home}");
    expect(day(date(2026, 10, 11))).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(day(date(2026, 10, 17))).toHaveFocus();
  });

  it("follows a day move across a month boundary into the newly rendered month", async () => {
    renderPage({ defaultMonth: date(2026, 10, 1) });
    day(date(2026, 10, 31)).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(heading()).toHaveTextContent("November 2026");
    expect(day(date(2026, 11, 1))).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(heading()).toHaveTextContent("October 2026");
    expect(day(date(2026, 10, 25))).toHaveFocus();
    expect(tabStops()).toEqual([day(date(2026, 10, 25))]);
  });

  it("pages a month with Page Up and Page Down, keeping focus on the same day of the month", async () => {
    renderPage();
    day(TODAY).focus();

    await userEvent.keyboard("{PageDown}");
    expect(heading()).toHaveTextContent("November 2026");
    expect(day(date(2026, 11, 14))).toHaveFocus();
    await press("PageUp", 2);
    expect(heading()).toHaveTextContent("September 2026");
    expect(day(date(2026, 9, 14))).toHaveFocus();
  });

  it("clamps the day at the end of a shorter month when paging", async () => {
    renderPage({ defaultMonth: date(2026, 10, 1) });
    day(date(2026, 10, 31)).focus();

    await userEvent.keyboard("{PageDown}");
    expect(heading()).toHaveTextContent("November 2026");
    expect(day(date(2026, 11, 30))).toHaveFocus();
  });

  it("pages a year with Shift and Page Up or Page Down", async () => {
    renderPage();
    day(TODAY).focus();

    await userEvent.keyboard("{Shift>}");
    await press("PageDown");
    await userEvent.keyboard("{/Shift}");
    expect(heading()).toHaveTextContent("October 2027");
    expect(day(date(2027, 10, 14))).toHaveFocus();
    await userEvent.keyboard("{Shift>}");
    await press("PageUp", 2);
    await userEvent.keyboard("{/Shift}");
    expect(heading()).toHaveTextContent("October 2025");
    expect(day(date(2025, 10, 14))).toHaveFocus();
  });

  it("selects the focused day with Enter and with Space, keeping focus on it", async () => {
    const onChange = vi.fn();
    renderPage({ onChange });
    day(TODAY).focus();

    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(TODAY);
    expect(day(TODAY)).toHaveAttribute("aria-selected", "true");
    expect(day(TODAY)).toHaveFocus();

    await userEvent.keyboard("{ArrowRight} ");
    expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 15));
    expect(day(date(2026, 10, 15))).toHaveFocus();
  });

  it("keeps focus on the day it left from when a controlled month ignores the move", async () => {
    renderPage({ month: date(2026, 10, 1) });
    day(date(2026, 10, 31)).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(heading()).toHaveTextContent("October 2026");
    expect(day(date(2026, 10, 31))).toHaveFocus();
    expect(tabStops()).toEqual([day(date(2026, 10, 31))]);
  });

  it("follows a move into another month that a controlled month accepts", async () => {
    function Controlled() {
      const [month, setMonth] = useState(date(2026, 10, 1));
      return <Page month={month} onMonthChange={setMonth} />;
    }
    render(<Controlled />);
    day(date(2026, 10, 31)).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(heading()).toHaveTextContent("November 2026");
    expect(day(date(2026, 11, 1))).toHaveFocus();
  });

  it("does not take focus when the value or month changes while focus is outside the grid", async () => {
    const { rerender } = renderPage({ value: date(2026, 10, 9), month: date(2026, 10, 1) });
    day(date(2026, 10, 9)).focus();
    // A move in the grid first, so the calendar has followed focus across a month once.
    await userEvent.keyboard("{PageDown}");
    await userEvent.tab();
    expect(button("After")).toHaveFocus();

    rerender(<Page value={date(2027, 2, 5)} month={date(2027, 2, 1)} />);
    expect(heading()).toHaveTextContent("February 2027");
    expect(button("After")).toHaveFocus();

    rerender(<Page value={date(2027, 2, 6)} month={date(2027, 2, 1)} />);
    expect(day(date(2027, 2, 6))).toHaveAttribute("aria-selected", "true");
    expect(button("After")).toHaveFocus();
  });

  it("does not take focus when an outside control changes the month", async () => {
    function WithOutsideControl() {
      const [month, setMonth] = useState(date(2026, 10, 1));
      return (
        <ThemeProvider>
          <button type="button" onClick={() => setMonth(month.plusMonths(1))}>
            Later
          </button>
          <Calendar locale={enUS} today={TODAY} month={month} onMonthChange={setMonth} />
        </ThemeProvider>
      );
    }
    render(<WithOutsideControl />);

    await userEvent.click(button("Later"));
    expect(heading()).toHaveTextContent("November 2026");
    expect(button("Later")).toHaveFocus();
  });
});

describe("Calendar's Clear button", () => {
  it("keeps focus when Enter clears the selection", async () => {
    const onChange = vi.fn();
    renderPage({ defaultValue: date(2026, 10, 9), clearable: true, onChange });
    button("Clear").focus();

    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(button("Clear")).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(button("Clear"));
    expect(heading()).toHaveTextContent("October 2026");
  });

  it("keeps focus when Space clears the selection", async () => {
    renderPage({ defaultValue: date(2026, 10, 9), clearable: true });
    button("Clear").focus();

    await userEvent.keyboard(" ");
    expect(screen.queryAllByRole("gridcell", { selected: true })).toEqual([]);
    expect(button("Clear")).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(button("Clear"));
  });

  it("stays focusable and inert while nothing is selected", async () => {
    const onChange = vi.fn();
    renderPage({ clearable: true, onChange });

    await userEvent.click(button("Clear"), { force: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button("Clear"));
    expect(button("Clear")).toHaveAttribute("aria-disabled", "true");
    expect(button("Clear")).not.toHaveAttribute("disabled");
  });
});

describe("Calendar's month buttons at a bound", () => {
  it("keeps focus on Next month once it steps to the month of max", async () => {
    const onMonthChange = vi.fn();
    renderPage({ max: date(2026, 12, 20), onMonthChange });
    button("Next month").focus();

    await userEvent.keyboard("{Enter}{Enter}");
    expect(heading()).toHaveTextContent("December 2026");
    expect(button("Next month")).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(button("Next month"));

    await userEvent.keyboard("{Enter}");
    expect(heading()).toHaveTextContent("December 2026");
    expect(onMonthChange).toHaveBeenCalledTimes(2);
    expect(button("Next month")).toHaveAttribute("aria-disabled", "true");
    expect(button("Next month")).not.toHaveAttribute("disabled");
    expect(document.activeElement).toBe(button("Next month"));
  });

  it("keeps focus on Previous month once it steps to the month of min", async () => {
    renderPage({ min: date(2026, 8, 3) });
    button("Previous month").focus();

    await userEvent.keyboard("{Enter}{Enter}{Enter}");
    expect(heading()).toHaveTextContent("August 2026");
    expect(button("Previous month")).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(button("Previous month"));
  });
});

describe("Calendar's autoFocus", () => {
  it("focuses the selected day when it is in the visible month", () => {
    renderPage({ autoFocus: true, defaultValue: date(2026, 10, 9) });
    expect(document.activeElement).toBe(day(date(2026, 10, 9)));
    expect(document.activeElement).not.toBe(root());
    expect(root()).not.toHaveAttribute("tabindex");
  });

  it("focuses today when the selected day is in another month", () => {
    renderPage({ autoFocus: true, defaultValue: date(2026, 9, 9), defaultMonth: date(2026, 10, 1) });
    expect(document.activeElement).toBe(day(TODAY));
  });

  it("focuses the month's first enabled day when neither the selection nor today is visible", () => {
    renderPage({ autoFocus: true, defaultMonth: date(2026, 11, 1), min: date(2026, 11, 3) });
    expect(document.activeElement).toBe(day(date(2026, 11, 3)));
  });

  it("leaves focus alone without autoFocus", () => {
    renderPage({ defaultValue: date(2026, 10, 9) });
    expect(document.activeElement).toBe(document.body);
  });
});

describe("Calendar's tokens and geometry", () => {
  it("sizes every day and blank cell to the same square, the default control size", () => {
    renderPage();
    const size = Number.parseFloat(resolved("width", "var(--vpg-size-md)"));
    const cells = Array.from(grid().querySelectorAll("tbody td")) as HTMLElement[];

    expect(size).toBeGreaterThan(0);
    expect(cells).toHaveLength(42);
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      expect(rect.width).toBeCloseTo(size, 1);
      expect(rect.height).toBeCloseTo(size, 1);
    }
  });

  it("keeps one grid and calendar height across months of four, five and six weeks", () => {
    // In an en-US week, February 2026 fills four weeks, October 2026 five and August 2026 six.
    const months = [
      { month: date(2026, 2, 1), weeks: 4 },
      { month: date(2026, 10, 1), weeks: 5 },
      { month: date(2026, 8, 1), weeks: 6 },
    ];
    const heights = months.map(({ month, weeks }) => {
      renderPage({ month, clearable: true });
      const rows = Array.from(grid().querySelectorAll("tbody tr"));
      expect(rows).toHaveLength(6);
      expect(rows.filter((row) => !row.hasAttribute("aria-hidden"))).toHaveLength(weeks);
      const measured = { grid: grid().getBoundingClientRect().height, root: root().getBoundingClientRect().height };
      cleanup();
      return measured;
    });

    expect(heights[0]?.grid).toBeGreaterThan(0);
    for (const height of heights) {
      expect(height.grid).toBeCloseTo(heights[0]?.grid as number, 1);
      expect(height.root).toBeCloseTo(heights[0]?.root as number, 1);
    }
  });

  it("resolves the calendar's text colour and font from the theme", () => {
    renderPage();
    const style = getComputedStyle(root());
    expect(style.color).toBe(resolved("color", "var(--vpg-ink)"));
    expect(style.fontFamily).not.toBe("");
    expect(Number.parseFloat(style.paddingTop)).toBeGreaterThan(0);
    expect(Number.parseFloat(style.rowGap)).toBeGreaterThan(0);
  });

  it("fills the selected day with the accent and sets it apart from a plain day", () => {
    renderPage({ defaultValue: date(2026, 10, 9) });
    const selected = getComputedStyle(day(date(2026, 10, 9)));
    const plain = getComputedStyle(day(date(2026, 10, 21)));
    const accent = resolved("backgroundColor", "var(--vpg-accent)");

    expect(accent).not.toBe(TRANSPARENT);
    expect(selected.backgroundColor).toBe(accent);
    expect(selected.color).toBe(resolved("color", "var(--vpg-accent-contrast)"));
    expect(plain.backgroundColor).toBe(TRANSPARENT);
    expect(plain.color).toBe(resolved("color", "var(--vpg-ink)"));
    expect(selected.backgroundColor).not.toBe(plain.backgroundColor);
    expect(selected.color).not.toBe(plain.color);
  });

  it("marks today in the accent's ink and weight, apart from a plain day", () => {
    renderPage();
    const today = getComputedStyle(day(TODAY));
    const plain = getComputedStyle(day(date(2026, 10, 21)));

    expect(day(TODAY)).toHaveAttribute("aria-current", "date");
    expect(today.color).toBe(resolved("color", "var(--vpg-accent)"));
    expect(today.fontWeight).toBe(resolved("fontWeight", "var(--vpg-font-weight-semibold)"));
    expect(today.color).not.toBe(plain.color);
    expect(today.fontWeight).not.toBe(plain.fontWeight);
  });

  it("dims a disabled day in the subtle ink", () => {
    renderPage({ min: date(2026, 10, 10) });
    const disabled = getComputedStyle(day(date(2026, 10, 9)));
    expect(disabled.color).toBe(resolved("color", "var(--vpg-ink-subtle)"));
    expect(disabled.color).not.toBe(getComputedStyle(day(date(2026, 10, 21))).color);
  });
});
