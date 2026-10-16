import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { FormField } from "../FormField/FormField.js";
import type { DateRange } from "../internal/localRange.js";
import { DateRangeField, type DateRangeFieldProps } from "./DateRangeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does.
afterEach(cleanup);

// en-US writes month/day/year. Every test passes a fixed `today`, so nothing depends on the day
// the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const range = (start: LocalDate, end: LocalDate): DateRange => ({ start, end });
const TODAY = date(2026, 10, 14);

function renderField(props: Partial<DateRangeFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <FormField label="Stay">
        <DateRangeField locale={enUS} today={TODAY} {...props} />
      </FormField>
    </ThemeProvider>,
  );
}

const shell = () => document.querySelector(".vpg-field-shell") as HTMLElement;
const group = () => screen.getByRole("group", { name: "Stay" });
const start = () => screen.getByRole("textbox", { name: "Stay Start" }) as HTMLInputElement;
const end = () => screen.getByRole("textbox", { name: "Stay End" }) as HTMLInputElement;
const toggle = () => screen.getByRole("button", { name: "Choose dates" });
const panel = () => document.querySelector(".vpg-date-range-field-panel");
/** A day of the open calendar, by its ISO date. */
const day = (value: LocalDate) => document.querySelector(`[data-date="${value.toString()}"]`) as HTMLElement;
const focusedDay = () => document.activeElement?.getAttribute("data-date");

/** What `value` resolves to for `property` on a probe inside the themed root. */
function resolved(property: "borderTopColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

describe("DateRangeField's calendar pop-up", () => {
  beforeEach(() => page.viewport(1024, 768));

  it("keeps the calendar open on the first pick and focuses the end editor after the second", async () => {
    const onChange = vi.fn();
    renderField({ onChange });

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(focusedDay()).toBe(TODAY.toString()));
    await userEvent.click(day(date(2026, 10, 12)));
    expect(panel()).not.toBeNull();
    expect(start()).toHaveValue("10/12/2026");

    await userEvent.click(day(date(2026, 10, 16)));
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(end()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 12), date(2026, 10, 16))]]);
    expect(end()).toHaveValue("10/16/2026");
  });

  it("picks both ends from the keyboard and focuses the end editor", async () => {
    const onChange = vi.fn();
    renderField({ onChange });
    toggle().focus();

    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(focusedDay()).toBe(TODAY.toString()));
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(end()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[range(TODAY, date(2026, 10, 16))]]);
  });

  it("returns focus to the button on Escape, after a pick sent it to the end editor", async () => {
    renderField({ defaultValue: range(date(2026, 10, 5), date(2026, 10, 9)) });

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(focusedDay()).toBe("2026-10-05"));
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(toggle()).toHaveFocus());
    expect(start()).toHaveValue("10/05/2026");
  });

  it("commits a typed start as the press on the button blurs it, and completes the range from it", async () => {
    const onChange = vi.fn();
    renderField({ onChange });
    await userEvent.click(start());
    await userEvent.keyboard("12/3/2026");

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(focusedDay()).toBe("2026-12-03"));
    expect(day(date(2026, 12, 3))).toHaveAttribute("aria-selected", "true");
    await userEvent.click(day(date(2026, 12, 10)));
    await vi.waitFor(() => expect(end()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[range(date(2026, 12, 3), date(2026, 12, 10))]]);
    expect(start()).toHaveValue("12/03/2026");
  });

  it("hangs the panel below the whole field, flush with the field's start edge", async () => {
    document.body.style.marginLeft = "120px";
    try {
      renderField();
      await userEvent.click(toggle());
      await vi.waitFor(() => expect(panel()).not.toBeNull());
      const field = shell().getBoundingClientRect();
      await vi.waitFor(() => expect(Math.abs((panel() as HTMLElement).getBoundingClientRect().left - field.left)).toBeLessThanOrEqual(1));
      const box = (panel() as HTMLElement).getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(field.bottom);
      expect((panel() as HTMLElement).scrollWidth).toBe((panel() as HTMLElement).clientWidth);
    } finally {
      document.body.style.marginLeft = "";
    }
  });
});

describe("DateRangeField's editors", () => {
  it("moves from the start editor to the end editor with Tab, committing once both are in", async () => {
    const onChange = vi.fn();
    renderField({ onChange });
    await userEvent.click(start());
    await userEvent.keyboard("10/1/2026");
    await userEvent.tab();
    expect(end()).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard("10/20/2026{Enter}");
    expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 1), date(2026, 10, 20))]]);
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
          <DateRangeField aria-label="Stay" locale={enUS} today={TODAY} startName="from" endName="to" />
          {/* A form of two text fields submits on Enter only through its default button. */}
          <button type="submit">Save</button>
        </form>
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("textbox", { name: "Stay Start" }));
    await userEvent.keyboard("10/1/2026");
    await userEvent.click(screen.getByRole("textbox", { name: "Stay End" }));
    await userEvent.keyboard("10/20/2026{Enter}");
    expect(submitted).toEqual([["2026-10-01", "2026-10-20"]]);
  });

  it("fills the field's height with its editors and keeps both inside the field", () => {
    render(
      <ThemeProvider>
        <div style={{ width: "480px" }}>
          <DateRangeField aria-label="Stay" locale={enUS} today={TODAY} />
        </div>
      </ThemeProvider>,
    );
    const startBox = screen.getByRole("textbox", { name: "Stay Start" }).getBoundingClientRect();
    const endBox = screen.getByRole("textbox", { name: "Stay End" }).getBoundingClientRect();
    expect(startBox.height).toBeCloseTo(shell().clientHeight, 0);
    expect(startBox.width).toBeCloseTo(endBox.width, 0);
    expect(endBox.right).toBeLessThanOrEqual(shell().getBoundingClientRect().right);
  });

  it("rings the field while keyboard focus is on an editor, in the danger colour once it is invalid", async () => {
    renderField({ value: range(date(2026, 10, 9), date(2026, 10, 5)) });
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

describe("DateRangeField's width", () => {
  const OCTOBER_TO_DECEMBER = range(date(2026, 10, 1), date(2026, 12, 28));

  function renderIn(width: string, props: Partial<DateRangeFieldProps> = {}) {
    return render(
      <ThemeProvider>
        <div style={{ width }}>
          <DateRangeField aria-label="Stay" locale={enUS} today={TODAY} defaultValue={OCTOBER_TO_DECEMBER} {...props} />
        </div>
      </ThemeProvider>,
    );
  }

  const editor = (name: "Start" | "End") => screen.getByRole("textbox", { name: `Stay ${name}` }) as HTMLInputElement;
  const separator = () => document.querySelector(".vpg-date-range-field-separator") as HTMLElement;
  const box = (element: Element) => element.getBoundingClientRect();
  /** Whether an editor's text overflows its box, which `clientWidth` alone would misreport: it
   * rounds a fractional width down while `scrollWidth` rounds up. */
  const expectWhole = (input: HTMLInputElement) => expect(input.scrollWidth).toBeLessThanOrEqual(Math.ceil(box(input).width));
  /** The shell's right padding and border: what lies between its last slot and its outer edge. */
  const shellEndInset = () => {
    const style = getComputedStyle(shell());
    return Number.parseFloat(style.paddingRight) + Number.parseFloat(style.borderRightWidth);
  };

  it("sets the two values beside each other in a shell as wide as its content", () => {
    renderIn("900px");
    const groupGap = Number.parseFloat(getComputedStyle(group()).columnGap);
    const between = box(editor("End")).left - box(editor("Start")).right;
    expect(between).toBeLessThanOrEqual(box(separator()).width + 2 * groupGap + 2);
    expectWhole(editor("Start"));
    expectWhole(editor("End"));
    const clear = screen.getByRole("button", { name: "Clear dates" });
    expect(box(shell()).right - box(clear).right - shellEndInset()).toBeCloseTo(0, 0);
    expect(box(shell()).width).toBeLessThan(450);
  });

  it("holds each editor's width while the user types into it, clipping nothing", async () => {
    renderIn("900px", { defaultValue: undefined });
    const empty = box(editor("Start")).width;
    await userEvent.click(editor("Start"));
    await userEvent.keyboard("1");
    expect(box(editor("Start")).width).toBe(empty);
    await userEvent.keyboard("2/28/2026");
    expect(editor("Start")).toHaveValue("12/28/2026");
    expect(box(editor("Start")).width).toBe(empty);
    expectWhole(editor("Start"));
    expect(editor("Start").scrollLeft).toBe(0);
  });

  it("grows the shell to a width set on the group, the editors sharing the room beyond their text", () => {
    renderIn("900px", { style: { width: "40rem" } });
    expect(box(group()).width).toBeCloseTo(640, 0);
    expect(box(shell()).width).toBeGreaterThanOrEqual(640);
    expect(box(shell()).right).toBeLessThanOrEqual(box(shell().parentElement as HTMLElement).right);
    const groupGap = Number.parseFloat(getComputedStyle(group()).columnGap);
    const editors = box(editor("Start")).width + box(editor("End")).width;
    expect(editors + box(separator()).width + 2 * groupGap).toBeCloseTo(640, 0);
    expect(Math.abs(box(editor("Start")).width - box(editor("End")).width)).toBeLessThanOrEqual(2);
  });

  it("caps the shell at a container narrower than its content and keeps the end editor inside it", () => {
    renderIn("200px");
    expect(box(shell()).width).toBeLessThanOrEqual(200);
    expect(box(editor("End")).right).toBeLessThanOrEqual(box(shell()).right);
  });
});
