import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate, LocalDateTime } from "@vipengele/ts";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { FormField } from "../FormField/FormField.js";
import type { DateTimeRange } from "../internal/localRange.js";
import { DateTimeRangeField, type DateTimeRangeFieldProps } from "./DateTimeRangeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does.
afterEach(cleanup);

// en-US writes month/day/year on a 12-hour clock. Every test passes a fixed `today`, so nothing
// depends on the day the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const range = (start: string, end: string): DateTimeRange => ({ start: LocalDateTime.parse(start), end: LocalDateTime.parse(end) });
const TODAY = date(2026, 10, 14);

/** The height of the page above and below the field, so the page has room to scroll both ways. */
const SPACER = "1600px";

function renderField(props: Partial<DateTimeRangeFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <FormField label="Shift">
        <DateTimeRangeField locale={enUS} today={TODAY} {...props} />
      </FormField>
      <button type="button">After</button>
    </ThemeProvider>,
  );
}

/** A field with a tall page above and below it. */
function renderTall(props: Partial<DateTimeRangeFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <div style={{ height: SPACER }} />
      <div style={{ width: "480px" }}>
        <DateTimeRangeField aria-label="Shift" locale={enUS} today={TODAY} {...props} />
      </div>
      <div style={{ height: SPACER }} />
    </ThemeProvider>,
  );
}

const shell = () => document.querySelector(".vpg-field-shell") as HTMLElement;
const group = () => screen.getByRole("group", { name: "Shift" });
const start = () => screen.getByRole("textbox", { name: "Shift Start" }) as HTMLInputElement;
const end = () => screen.getByRole("textbox", { name: "Shift End" }) as HTMLInputElement;
const toggle = () => screen.getByRole("button", { name: "Choose dates and times" });
const after = () => screen.getByRole("button", { name: "After" });
const panel = () => document.querySelector(".vpg-date-time-range-field-panel") as HTMLElement | null;
const done = () => screen.getByRole("button", { name: "Done" });
/** A day of the open calendar, by its ISO date. */
const day = (value: LocalDate) => document.querySelector(`[data-date="${value.toString()}"]`) as HTMLElement;
const focusedDay = () => document.activeElement?.getAttribute("data-date");
const timePanel = (name: string) => screen.getByRole("group", { name });
const strip = (panelName: string, name: string) => within(timePanel(panelName)).getByRole("radiogroup", { name });
const option = (panelName: string, stripName: string, label: string) =>
  within(strip(panelName, stripName)).getByRole("radio", { name: label });

/** What `value` resolves to for `property` on a probe inside the themed root. */
function resolved(property: "borderTopColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

describe("DateTimeRangeField", () => {
  describe("pop-up", () => {
    beforeEach(() => page.viewport(1024, 900));

    it("commits once both days and both times are picked, and Done returns focus to the end editor", async () => {
      const onChange = vi.fn();
      renderField({ onChange });

      await userEvent.click(toggle());
      await vi.waitFor(() => expect(focusedDay()).toBe(TODAY.toString()));
      await userEvent.click(day(date(2026, 10, 12)));
      await userEvent.click(day(date(2026, 10, 16)));
      await userEvent.click(option("Start time", "Hour", "09"));
      expect(onChange).not.toHaveBeenCalled();
      await userEvent.click(option("End time", "Hour", "05"));
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T09:00", "2026-10-16T05:00")]]);

      await userEvent.click(done());
      await vi.waitFor(() => expect(panel()).toBeNull());
      await vi.waitFor(() => expect(end()).toHaveFocus());
    });

    it("returns focus to the button on Escape", async () => {
      renderField({ defaultValue: range("2026-10-05T09:00", "2026-10-09T17:30") });

      await userEvent.click(toggle());
      await vi.waitFor(() => expect(focusedDay()).toBe("2026-10-05"));
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(panel()).toBeNull());
      await vi.waitFor(() => expect(toggle()).toHaveFocus());
    });

    it("runs from the calendar through the start time and the end time to Done", async () => {
      renderField();
      toggle().focus();
      await userEvent.keyboard("{Enter}");
      await vi.waitFor(() => expect(focusedDay()).toBe(TODAY.toString()));
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");
      expect(start()).toHaveValue("10/14/2026");
      expect(end()).toHaveValue("10/15/2026");

      await userEvent.tab();
      expect(strip("Start time", "Hour")).toContainElement(document.activeElement as HTMLElement);
      await userEvent.tab();
      expect(strip("End time", "Hour")).toContainElement(document.activeElement as HTMLElement);
      await userEvent.tab();
      expect(done()).toHaveFocus();
    });

    it("keeps a pending day unflagged across the pop-up, and flags it once focus moves past the field", async () => {
      renderField();
      await userEvent.click(toggle());
      await vi.waitFor(() => expect(focusedDay()).toBe(TODAY.toString()));
      await userEvent.keyboard("{Enter}");
      await userEvent.tab();
      expect(group()).not.toHaveAttribute("aria-invalid");

      await userEvent.click(done());
      await vi.waitFor(() => expect(end()).toHaveFocus());
      expect(group()).not.toHaveAttribute("aria-invalid");

      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Clear dates and times" })).toHaveFocus();
      expect(group()).not.toHaveAttribute("aria-invalid");

      await userEvent.tab();
      expect(after()).toHaveFocus();
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("opens without scrolling the page", async () => {
      renderTall({ defaultValue: range("2026-10-05T09:00", "2026-10-09T23:55") });
      toggle().scrollIntoView({ block: "center" });
      const scrolled = window.scrollY;
      expect(scrolled).toBeGreaterThan(0);

      await userEvent.click(toggle());
      await vi.waitFor(() => expect(strip("End time", "Minute").scrollLeft).toBeGreaterThan(0));
      expect(window.scrollY).toBe(scrolled);
    });

    it("is as wide as its calendar, and stacks the calendar, the two time panels and Done below the field", async () => {
      renderField({ defaultValue: range("2026-10-05T09:00", "2026-10-09T17:30") });
      await userEvent.click(toggle());
      await vi.waitFor(() => expect(panel()).not.toBeNull());
      const box = panel() as HTMLElement;
      const calendar = (box.querySelector(".vpg-range-calendar") as HTMLElement).getBoundingClientRect();
      const startTimes = timePanel("Start time").getBoundingClientRect();
      const endTimes = timePanel("End time").getBoundingClientRect();
      const button = done().getBoundingClientRect();

      expect(box.clientWidth).toBeCloseTo(calendar.width, 0);
      expect(startTimes.width).toBeCloseTo(calendar.width, 0);
      expect(endTimes.width).toBeCloseTo(calendar.width, 0);
      expect(box.scrollWidth).toBe(box.clientWidth);
      expect(box.getBoundingClientRect().top).toBeGreaterThanOrEqual(shell().getBoundingClientRect().bottom);
      expect(startTimes.top).toBeGreaterThanOrEqual(calendar.bottom - 0.5);
      expect(endTimes.top).toBeGreaterThanOrEqual(startTimes.bottom - 0.5);
      expect(button.top).toBeGreaterThanOrEqual(endTimes.bottom - 0.5);
    });
  });

  describe("editors", () => {
    it("moves from the start editor to the end editor with Tab, committing once both are in", async () => {
      const onChange = vi.fn();
      renderField({ onChange });
      await userEvent.click(start());
      await userEvent.keyboard("10/1/2026 9:00 AM");
      await userEvent.tab();
      expect(end()).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
      await userEvent.keyboard("10/1/2026 5:00 PM{Enter}");
      expect(onChange.mock.calls).toEqual([[range("2026-10-01T09:00", "2026-10-01T17:00")]]);
    });

    it("submits each named end as ISO 8601 on Enter", async () => {
      const submitted: [string | null, string | null][] = [];
      const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        submitted.push([data.get("from") as string | null, data.get("to") as string | null]);
      };
      render(
        <ThemeProvider>
          <form onSubmit={onSubmit}>
            <DateTimeRangeField aria-label="Shift" locale={enUS} today={TODAY} startName="from" endName="to" />
            {/* A form of two text fields submits on Enter only through its default button. */}
            <button type="submit">Save</button>
          </form>
        </ThemeProvider>,
      );
      await userEvent.click(start());
      await userEvent.keyboard("2026-10-01T09:00");
      await userEvent.click(end());
      await userEvent.keyboard("2026-10-01T17:00{Enter}");
      expect(submitted).toEqual([["2026-10-01T09:00", "2026-10-01T17:00"]]);
    });

    it("fills the field's height with its editors and keeps both inside the field", () => {
      renderTall();
      const startBox = start().getBoundingClientRect();
      const endBox = end().getBoundingClientRect();
      expect(startBox.height).toBeCloseTo(shell().clientHeight, 0);
      expect(startBox.width).toBeCloseTo(endBox.width, 0);
      expect(endBox.right).toBeLessThanOrEqual(shell().getBoundingClientRect().right);
    });

    it("rings the field in the danger colour while keyboard focus is on an editor of a reversed range", async () => {
      renderField({ value: range("2026-10-05T17:00", "2026-10-05T09:00") });
      expect(group()).toHaveAttribute("aria-invalid", "true");
      toggle().focus();
      await userEvent.tab();
      expect(start()).toHaveFocus();
      await expect.poll(() => getComputedStyle(shell()).borderTopColor).toBe(resolved("borderTopColor", "var(--vpg-danger)"));
      expect(getComputedStyle(shell()).boxShadow).not.toBe("none");
    });

    it("dims a disabled field", async () => {
      renderField({ disabled: true });
      await expect.poll(() => getComputedStyle(shell()).opacity).toBe("0.55");
    });
  });
});

describe("the width of a date-time range field", () => {
  const OCTOBER_TO_DECEMBER = range("2026-10-01T08:00", "2026-12-28T12:30");

  function renderIn(width: string, props: Partial<DateTimeRangeFieldProps> = {}) {
    return render(
      <ThemeProvider>
        <div style={{ width }}>
          <DateTimeRangeField aria-label="Shift" locale={enUS} today={TODAY} {...props} />
        </div>
      </ThemeProvider>,
    );
  }

  const separator = () => document.querySelector(".vpg-date-time-range-field-separator") as HTMLElement;
  const box = (element: Element) => element.getBoundingClientRect();
  /** The shell's right padding and border: what lies between its last slot and its outer edge. */
  const shellEndInset = () => {
    const style = getComputedStyle(shell());
    return Number.parseFloat(style.paddingRight) + Number.parseFloat(style.borderRightWidth);
  };
  /** Every editor shows its whole text and the shell shows every one of its children. An editor's
   * `clientWidth` rounds a fractional width down while its `scrollWidth` rounds up, so the text is
   * read against the editor's box instead. */
  const expectNothingClipped = () => {
    for (const input of [start(), end()]) {
      expect(input.scrollWidth).toBeLessThanOrEqual(Math.ceil(box(input).width));
    }
    expect(shell().scrollWidth).toBeLessThanOrEqual(shell().clientWidth);
  };

  it("fits both values at its default width, beside each other in a shell as wide as its content", () => {
    renderIn("900px", { defaultValue: OCTOBER_TO_DECEMBER });
    expectNothingClipped();
    const groupGap = Number.parseFloat(getComputedStyle(group()).columnGap);
    expect(box(end()).left - box(start()).right).toBeLessThanOrEqual(box(separator()).width + 2 * groupGap + 2);
    const clear = screen.getByRole("button", { name: "Clear dates and times" });
    expect(box(shell()).right - box(clear).right - shellEndInset()).toBeCloseTo(0, 0);
    expect(box(shell()).width).toBeLessThan(600);
  });

  it("holds each editor's width while the user types into it, clipping nothing", async () => {
    renderIn("900px");
    const empty = box(start()).width;
    await userEvent.click(start());
    await userEvent.keyboard("1");
    expect(box(start()).width).toBe(empty);
    await userEvent.keyboard("2/28/2026 12:30 PM");
    expect(start()).toHaveValue("12/28/2026 12:30 PM");
    expect(box(start()).width).toBe(empty);
    expectNothingClipped();
    expect(start().scrollLeft).toBe(0);
  });

  it("grows the shell to a width set on the group, the editors sharing the room beyond their text", () => {
    renderIn("900px", { defaultValue: OCTOBER_TO_DECEMBER, style: { width: "48rem" } });
    expect(box(group()).width).toBeCloseTo(768, 0);
    expect(box(shell()).width).toBeGreaterThanOrEqual(768);
    const groupGap = Number.parseFloat(getComputedStyle(group()).columnGap);
    const editors = box(start()).width + box(end()).width;
    expect(editors + box(separator()).width + 2 * groupGap).toBeCloseTo(768, 0);
    expect(Math.abs(box(start()).width - box(end()).width)).toBeLessThanOrEqual(2);
    expectNothingClipped();
  });

  it("caps the shell at a container narrower than its content and keeps the end editor inside it", () => {
    renderIn("240px", { defaultValue: OCTOBER_TO_DECEMBER });
    expect(box(shell()).width).toBeLessThanOrEqual(240);
    expect(box(end()).right).toBeLessThanOrEqual(box(shell()).right);
  });
});
