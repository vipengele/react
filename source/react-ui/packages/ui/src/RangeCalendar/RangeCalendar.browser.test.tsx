import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { RangeCalendar, type RangeCalendarProps } from "./RangeCalendar.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does.
afterEach(cleanup);

// en-US starts its week on Sunday. Every test passes a fixed `today`, so nothing depends on the
// day the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);

/** A range calendar between two plain buttons, under a real `ThemeProvider`. */
function renderPage(props: Partial<RangeCalendarProps> = {}) {
  return render(
    <ThemeProvider>
      <button type="button">Before</button>
      <RangeCalendar locale={enUS} today={TODAY} {...props} />
      <button type="button">After</button>
    </ThemeProvider>,
  );
}

const day = (value: LocalDate) => screen.getByRole("gridcell", { name: value.format(enUS) });
const button = (name: string) => screen.getByRole("button", { name });
/** The day numbers carrying `attribute`, in grid order. */
const daysWith = (attribute: string) =>
  screen
    .getAllByRole("gridcell")
    .filter((cell) => cell.hasAttribute(attribute))
    .map((cell) => Number(cell.textContent));

/** What `value` resolves to for `property` on a probe inside the themed root. */
function resolved(property: "color" | "backgroundColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

describe("RangeCalendar's keyboard picking", () => {
  it("anchors with Enter, previews the span as the arrows move focus, and completes with Enter", async () => {
    const onChange = vi.fn();
    const onAnchorChange = vi.fn();
    renderPage({ onChange, onAnchorChange });
    button("Before").focus();

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(day(TODAY)).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onAnchorChange).toHaveBeenCalledExactlyOnceWith(TODAY);

    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(day(date(2026, 10, 16))).toHaveFocus();
    expect(daysWith("data-preview")).toEqual([14, 15, 16]);

    await userEvent.keyboard("{ArrowUp}");
    expect(day(date(2026, 10, 9))).toHaveFocus();
    expect(daysWith("data-preview")).toEqual([9, 10, 11, 12, 13, 14]);

    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ start: date(2026, 10, 9), end: TODAY });
    expect(onAnchorChange).toHaveBeenLastCalledWith(undefined);
    expect(daysWith("data-preview")).toEqual([]);
    expect(daysWith("data-in-range")).toEqual([10, 11, 12, 13]);
  });

  it("carries a preview across a month boundary and completes there", async () => {
    const onChange = vi.fn();
    renderPage({ onChange, defaultMonth: date(2026, 10, 1) });
    day(date(2026, 10, 30)).focus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}");
    expect(day(date(2026, 11, 6))).toHaveFocus();
    // The anchor's month is no longer drawn; the visible days of the span are.
    expect(daysWith("data-preview")).toEqual([1, 2, 3, 4, 5, 6]);

    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ start: date(2026, 10, 30), end: date(2026, 11, 6) });
  });

  it("re-enters the grid on the anchor while one is pending", async () => {
    renderPage({ anchor: date(2026, 10, 20) });
    button("Before").focus();

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();

    expect(day(date(2026, 10, 20))).toHaveFocus();
  });

  it("previews to the day under the pointer", async () => {
    renderPage({ anchor: date(2026, 10, 9) });

    await userEvent.hover(day(date(2026, 10, 12)));

    expect(daysWith("data-preview")).toEqual([9, 10, 11, 12]);
  });
});

describe("RangeCalendar's tokens", () => {
  it("fills both ends with the accent and the days between with the accent wash", () => {
    renderPage({ value: { start: date(2026, 10, 9), end: date(2026, 10, 12) } });
    const accent = resolved("backgroundColor", "var(--vpg-accent)");
    const wash = resolved("backgroundColor", "var(--vpg-accent-wash)");

    expect(wash).not.toBe(TRANSPARENT);
    expect(wash).not.toBe(accent);
    expect(getComputedStyle(day(date(2026, 10, 9))).backgroundColor).toBe(accent);
    expect(getComputedStyle(day(date(2026, 10, 12))).backgroundColor).toBe(accent);
    expect(getComputedStyle(day(date(2026, 10, 10))).backgroundColor).toBe(wash);
    expect(getComputedStyle(day(date(2026, 10, 11))).backgroundColor).toBe(wash);
    expect(getComputedStyle(day(date(2026, 10, 13))).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(day(date(2026, 10, 10))).color).toBe(resolved("color", "var(--vpg-ink)"));
  });

  it("squares the corners that face the span, so it reads as one band", () => {
    renderPage({ value: { start: date(2026, 10, 9), end: date(2026, 10, 12) } });
    const start = getComputedStyle(day(date(2026, 10, 9)));
    const inside = getComputedStyle(day(date(2026, 10, 10)));
    const end = getComputedStyle(day(date(2026, 10, 12)));
    const plain = getComputedStyle(day(date(2026, 10, 20)));

    expect(Number.parseFloat(plain.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(inside.borderTopLeftRadius).toBe("0px");
    expect(inside.borderBottomRightRadius).toBe("0px");
    expect(start.borderTopLeftRadius).toBe(plain.borderTopLeftRadius);
    expect(start.borderTopRightRadius).toBe("0px");
    expect(start.borderBottomRightRadius).toBe("0px");
    expect(end.borderTopRightRadius).toBe(plain.borderTopRightRadius);
    expect(end.borderTopLeftRadius).toBe("0px");
    expect(end.borderBottomLeftRadius).toBe("0px");
  });

  it("keeps a one-day range's corners round", () => {
    renderPage({ value: { start: date(2026, 10, 9), end: date(2026, 10, 9) } });
    const only = getComputedStyle(day(date(2026, 10, 9)));
    expect(Number.parseFloat(only.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(Number.parseFloat(only.borderTopRightRadius)).toBeGreaterThan(0);
  });

  it("keeps the band on a hovered day inside the range", async () => {
    renderPage({ value: { start: date(2026, 10, 9), end: date(2026, 10, 12) } });
    await userEvent.hover(day(date(2026, 10, 10)));
    expect(getComputedStyle(day(date(2026, 10, 10))).backgroundColor).toBe(resolved("backgroundColor", "var(--vpg-accent-wash)"));
  });

  it("draws a disabled day inside the range on the band in the subtle ink", () => {
    renderPage({ value: { start: date(2026, 10, 9), end: date(2026, 10, 13) }, isDateDisabled: (value) => value.dayOfWeek >= 6 });
    const saturday = getComputedStyle(day(date(2026, 10, 10)));
    expect(saturday.backgroundColor).toBe(resolved("backgroundColor", "var(--vpg-accent-wash)"));
    expect(saturday.color).toBe(resolved("color", "var(--vpg-ink-subtle)"));
  });

  it("draws a previewed end as the wash with an accent edge, never the accent fill of a pick", async () => {
    renderPage({ anchor: date(2026, 10, 9) });
    await userEvent.hover(day(date(2026, 10, 12)));
    await expect.poll(() => daysWith("data-preview")).toEqual([9, 10, 11, 12]);
    const wash = resolved("backgroundColor", "var(--vpg-accent-wash)");
    // A day's background transitions, so the preview's colours are read once they have settled.
    await expect.poll(() => getComputedStyle(day(date(2026, 10, 12))).backgroundColor).toBe(wash);
    await expect.poll(() => getComputedStyle(day(date(2026, 10, 11))).backgroundColor).toBe(wash);
    const previewed = getComputedStyle(day(date(2026, 10, 12)));

    expect(getComputedStyle(day(date(2026, 10, 9))).backgroundColor).toBe(resolved("backgroundColor", "var(--vpg-accent)"));
    expect(previewed.boxShadow).toContain(resolved("color", "var(--vpg-accent)"));
    expect(previewed.boxShadow).toContain("inset");
  });
});
