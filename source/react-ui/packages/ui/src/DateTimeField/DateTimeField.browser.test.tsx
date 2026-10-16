import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate, LocalDateTime } from "@vipengele/ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { DateTimeField, type DateTimeFieldProps } from "./DateTimeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const enUS = new Locale("en-US");
const TODAY = LocalDate.of(2026, 10, 14);

/** The height of the page above and below the field, so the page has room to scroll both ways. */
const SPACER = "1600px";

function renderField(props: Partial<DateTimeFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <DateTimeField aria-label="Starts" locale={enUS} today={TODAY} {...props} />
    </ThemeProvider>,
  );
}

/** A field with a tall page above and below it, and a button after it to move focus out onto. */
function renderTall(props: Partial<DateTimeFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <div style={{ height: SPACER }} />
      <div style={{ width: "320px" }}>
        <DateTimeField aria-label="Starts" locale={enUS} today={TODAY} {...props} />
      </div>
      <button type="button">After</button>
      <div style={{ height: SPACER }} />
    </ThemeProvider>,
  );
}

const field = () => screen.getByRole("textbox", { name: "Starts" }) as HTMLInputElement;
const shell = () => field().parentElement as HTMLElement;
const toggle = () => screen.getByRole("button", { name: "Choose date and time" });
const panel = () => document.querySelector(".vpg-date-time-field-panel") as HTMLElement | null;
const strip = (name: string) => screen.getByRole("radiogroup", { name });
const done = () => screen.getByRole("button", { name: "Done" });

/** The style once its transitions have run, so a state change is read at its end value. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

/** What `value` resolves to for `property` on a probe inside the themed root. */
function resolved(property: "boxShadow" | "outlineColor", value: string) {
  const probe = document.createElement("span");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

describe("DateTimeField's focus ring", () => {
  it("rings the field while the input has focus", async () => {
    renderField();
    toggle().focus();
    await userEvent.tab();
    expect(field()).toHaveFocus();
    expect(settledStyle(shell()).boxShadow).toBe(resolved("boxShadow", "0 0 0 var(--vpg-focus-ring-width) var(--vpg-accent-ring)"));
  });

  it("rings the calendar button on its own, not the field, when it takes keyboard focus", async () => {
    renderField();
    field().focus();
    await userEvent.tab({ shift: true });
    expect(toggle()).toHaveFocus();
    const styles = getComputedStyle(toggle());
    expect(styles.outlineStyle).toBe("solid");
    expect(styles.outlineColor).toBe(resolved("outlineColor", "var(--vpg-accent-ring)"));
    expect(styles.opacity).toBe("1");
    expect(settledStyle(shell()).boxShadow).toBe("none");
  });

  it("draws no ring on a field focus has never reached", () => {
    renderField();
    expect(settledStyle(shell()).boxShadow).toBe("none");
  });
});

describe("DateTimeField's pop-up", () => {
  it("opens without scrolling the page, its strips showing their selected options", async () => {
    renderTall({ defaultValue: LocalDateTime.parse("2026-10-15T23:55") });
    toggle().scrollIntoView({ block: "center" });
    const scrolled = window.scrollY;
    expect(scrolled).toBeGreaterThan(0);

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(strip("Minute").scrollLeft).toBeGreaterThan(0));
    expect(window.scrollY).toBe(scrolled);

    const selected = within(strip("Minute")).getByRole("radio", { name: "55" }).getBoundingClientRect();
    const box = strip("Minute").getBoundingClientRect();
    expect(selected.left).toBeGreaterThanOrEqual(box.left);
    expect(selected.right).toBeLessThanOrEqual(box.right + 0.5);
  });

  it("is as wide as its calendar: the time panel's strips scroll inside it", async () => {
    renderField({ defaultValue: LocalDateTime.parse("2026-10-15T09:05") });
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const calendar = (document.querySelector(".vpg-calendar") as HTMLElement).getBoundingClientRect();
    const times = (document.querySelector(".vpg-time-panel") as HTMLElement).getBoundingClientRect();
    expect((panel() as HTMLElement).clientWidth).toBeCloseTo(calendar.width, 0);
    expect(times.width).toBeCloseTo(calendar.width, 0);
    expect((panel() as HTMLElement).scrollWidth).toBe((panel() as HTMLElement).clientWidth);
    expect(strip("Minute").scrollWidth).toBeGreaterThan(strip("Minute").clientWidth);
  });

  it("hangs below the whole field, with the calendar, the time panel and Done in that order", async () => {
    renderField();
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const field = shell().getBoundingClientRect();
    const calendar = (document.querySelector(".vpg-calendar") as HTMLElement).getBoundingClientRect();
    const times = (document.querySelector(".vpg-time-panel") as HTMLElement).getBoundingClientRect();
    const button = done().getBoundingClientRect();
    expect((panel() as HTMLElement).getBoundingClientRect().top).toBeGreaterThanOrEqual(field.bottom);
    expect(times.top).toBeGreaterThanOrEqual(calendar.bottom - 0.5);
    expect(button.top).toBeGreaterThanOrEqual(times.bottom - 0.5);
  });
});

describe("DateTimeField's tab order", () => {
  it("runs from the calendar button to the input, then on past an empty field", async () => {
    renderTall();
    toggle().focus();
    await userEvent.tab();
    expect(field()).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("runs through the pop-up from the calendar to the time panel to Done, and Done returns to the input", async () => {
    const onChange = vi.fn();
    renderTall({ onChange });
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(document.activeElement).toHaveAccessibleName("10/14/2026"));
    await userEvent.keyboard("{Enter}");
    expect(field()).toHaveValue("10/14/2026");

    await userEvent.tab();
    expect(document.activeElement?.getAttribute("role")).toBe("radio");
    expect(strip("Hour")).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard("{Enter}");
    expect(onChange.mock.calls).toEqual([[LocalDateTime.parse("2026-10-14T00:00")]]);

    await userEvent.tab();
    expect(done()).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(field()).toHaveFocus());
  });

  it("keeps a pending day unflagged across the pop-up, and flags it once focus moves past the field", async () => {
    renderTall();
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("gridcell"));
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await userEvent.tab();
    expect(done()).toHaveFocus();
    expect(field()).not.toHaveAttribute("aria-invalid", "true");

    await userEvent.click(done());
    await vi.waitFor(() => expect(field()).toHaveFocus());
    expect(field()).not.toHaveAttribute("aria-invalid", "true");

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Clear date and time" })).toHaveFocus();
    expect(field()).not.toHaveAttribute("aria-invalid", "true");

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(field()).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps focus inside the field when a press lands on the pop-up's background", async () => {
    renderTall();
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("gridcell"));
    await userEvent.keyboard("{Enter}");

    const actions = document.querySelector(".vpg-date-time-field-actions") as HTMLElement;
    await userEvent.click(actions, { position: { x: 2, y: 2 } });
    expect(panel()).not.toBeNull();
    expect(field()).not.toHaveAttribute("aria-invalid", "true");
  });
});

describe("DateTimeField's clear button", () => {
  it("clears on a real click without the input losing focus", async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    renderField({ defaultValue: LocalDateTime.parse("2026-10-15T09:05"), onChange, onBlur });
    await userEvent.click(field());
    await userEvent.click(screen.getByRole("button", { name: "Clear date and time" }));
    expect(onChange.mock.calls).toEqual([[undefined]]);
    expect(onBlur).not.toHaveBeenCalled();
    expect(field()).toHaveFocus();
  });
});
