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

    it("fills the field's height with its editors and splits the width between them", () => {
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
