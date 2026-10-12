import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { DateField, type DateFieldProps } from "./DateField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

// en-US writes month/day/year. Every test passes a fixed `today`, so nothing depends on the day
// the suite runs.
const enUS = new Locale("en-US");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);

function renderField(props: Partial<DateFieldProps> = {}) {
  return render(
    <ThemeProvider>
      <DateField aria-label="Due" locale={enUS} today={TODAY} {...props} />
    </ThemeProvider>,
  );
}

const field = () => screen.getByRole("textbox", { name: "Due" }) as HTMLInputElement;
const clearButton = () => screen.getByRole("button", { name: "Clear date" });
const selection = () => [field().selectionStart, field().selectionEnd];

/** Focuses the input and puts the caret at `offset`, as a click there would. */
function caretAt(offset: number) {
  field().focus();
  field().setSelectionRange(offset, offset);
}

/** The width an injected element is given, so what it takes from the centre is a known number. */
const INTRUDER_WIDTH = 24;

/** An element a page injects into the field — a password manager appending its own custom element
 * — landing after every child the component rendered. */
function injectInto(shell: HTMLElement) {
  const intruder = document.createElement("keeper-lock");
  intruder.style.width = `${INTRUDER_WIDTH}px`;
  intruder.style.height = "16px";
  shell.append(intruder);
}

/** What `value` resolves to for `property` on a probe inside the themed root. A custom property
 * read back off `getPropertyValue` is its authored text; a real property consuming it through
 * `var()` is what resolves it. */
function resolved(property: "width" | "outlineColor", value: string) {
  const probe = document.createElement("div");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

describe("DateField's caret under real keys", () => {
  it("keeps the caret in the day segment across repeated steps", async () => {
    const onChange = vi.fn();
    renderField({ defaultValue: TODAY, onChange });
    caretAt(4);

    await userEvent.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("10/15/2026");
    expect(selection()).toEqual([3, 5]);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("10/17/2026");
    expect(selection()).toEqual([3, 5]);
    expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 17));
  });

  it("keeps the caret in the year segment when stepping down", async () => {
    renderField({ defaultValue: TODAY });
    caretAt(10);

    await userEvent.keyboard("{ArrowDown}");
    expect(field()).toHaveValue("10/14/2025");
    expect(selection()).toEqual([6, 10]);
  });

  it("keeps the caret in the month segment when a step carries the day", async () => {
    renderField({ defaultValue: date(2026, 1, 31) });
    caretAt(1);

    await userEvent.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("02/28/2026");
    expect(selection()).toEqual([0, 2]);
  });

  it("steps an empty field onto today and selects its first segment", async () => {
    renderField();
    caretAt(0);

    await userEvent.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("10/14/2026");
    expect(selection()).toEqual([0, 2]);
  });
});

describe("DateField in a form", () => {
  it("submits the typed date as ISO 8601 on Enter", async () => {
    const submitted: (string | null)[] = [];
    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitted.push(new FormData(event.currentTarget).get("due") as string | null);
    };
    render(
      <ThemeProvider>
        <form onSubmit={onSubmit}>
          <DateField aria-label="Due" locale={enUS} today={TODAY} name="due" />
        </form>
      </ThemeProvider>,
    );

    await userEvent.click(field());
    await userEvent.keyboard("12/1/2026{Enter}");
    expect(submitted).toEqual(["2026-12-01"]);
    expect(field()).toHaveValue("12/01/2026");
  });
});

describe("DateField under a real ThemeProvider", () => {
  it("fills the field's height with its control", () => {
    const { container } = renderField();
    const shell = container.querySelector(".vpg-field-shell") as HTMLElement;
    expect(field().getBoundingClientRect().height).toBeCloseTo(shell.clientHeight, 0);
  });

  it("keeps the clear button against the field's trailing edge when a page injects an element", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "500px" }}>
          <DateField aria-label="Due" locale={enUS} defaultValue={TODAY} />
        </div>
      </ThemeProvider>,
    );
    const shell = container.querySelector(".vpg-field-shell") as HTMLElement;

    injectInto(shell);

    const styles = getComputedStyle(shell);
    const contentRight = shell.getBoundingClientRect().right - shell.clientLeft - Number.parseFloat(styles.paddingRight);
    expect(contentRight - clearButton().getBoundingClientRect().right).toBeLessThanOrEqual(
      INTRUDER_WIDTH + Number.parseFloat(styles.columnGap) + 0.5,
    );
  });

  it("draws the accent focus ring on a clear button that takes keyboard focus", async () => {
    renderField({ defaultValue: TODAY });
    field().focus();

    await userEvent.tab();
    expect(clearButton()).toHaveFocus();
    const styles = getComputedStyle(clearButton());
    expect(styles.outlineStyle).toBe("solid");
    expect(styles.outlineWidth).toBe(resolved("width", "var(--vpg-focus-ring-width)"));
    expect(styles.outlineColor).toBe(resolved("outlineColor", "var(--vpg-accent-ring)"));
  });

  it("draws no outline on a clear button that never took focus", () => {
    renderField({ defaultValue: TODAY });
    expect(getComputedStyle(clearButton()).outlineStyle).toBe("none");
  });

  it("clears on a real click without the input ever losing focus", async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    renderField({ defaultValue: TODAY, onChange, onBlur });
    await userEvent.click(field());
    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Backspace}");

    await userEvent.click(clearButton());
    expect(onChange.mock.calls).toEqual([[undefined]]);
    expect(onBlur).not.toHaveBeenCalled();
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
  });
});

/** The calendar button, looked up by class. */
const toggle = () => document.querySelector(".vpg-date-field-calendar-toggle") as HTMLButtonElement;
const heading = () => (document.querySelector(".vpg-calendar-heading") as HTMLElement).textContent;
const panel = () => document.querySelector(".vpg-date-field-panel");
const focusedDay = () => document.activeElement?.getAttribute("role");

/** A desktop viewport, a phone and the narrowest phone width. */
const WIDE = [1024, 768] as const;
const NARROW = [390, 844] as const;
const NARROWEST = [320, 568] as const;

describe("DateField's calendar pop-up", () => {
  beforeEach(() => page.viewport(...WIDE));

  it("focuses the input after a pick, over the popover's own return to its trigger", async () => {
    const onChange = vi.fn();
    renderField({ defaultValue: TODAY, onChange });

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("gridcell"));
    await userEvent.click(screen.getByRole("gridcell", { name: "10/20/2026" }));

    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(field()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[date(2026, 10, 20)]]);
    expect(field()).toHaveValue("10/20/2026");
  });

  it("returns focus to the button on Escape, after a pick sent it to the input", async () => {
    renderField({ defaultValue: TODAY });

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole("gridcell", { name: "10/20/2026" }));
    await vi.waitFor(() => expect(field()).toHaveFocus());

    await userEvent.click(toggle());
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("gridcell"));
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(toggle()).toHaveFocus());
  });

  it("picks from the keyboard and focuses the input", async () => {
    const onChange = vi.fn();
    renderField({ defaultValue: TODAY, onChange });
    toggle().focus();

    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(document.activeElement).toHaveAccessibleName("10/14/2026"));
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(field()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[date(2026, 10, 15)]]);
  });

  it("opens on the committed date's month", async () => {
    renderField({ defaultValue: date(2027, 3, 9) });
    await userEvent.click(toggle());
    expect(heading()).toBe("March 2027");
    await vi.waitFor(() => expect(document.activeElement).toHaveAccessibleName("03/09/2027"));
  });

  it("opens on today's month when the field is empty", async () => {
    renderField();
    await userEvent.click(toggle());
    expect(heading()).toBe("October 2026");
    await vi.waitFor(() => expect(document.activeElement).toHaveAccessibleName("10/14/2026"));
  });

  it("opens on min's month when today is before it", async () => {
    renderField({ min: date(2027, 2, 10) });
    await userEvent.click(toggle());
    expect(heading()).toBe("February 2027");
  });

  it("opens on max's month when today is after it", async () => {
    renderField({ max: date(2025, 6, 30) });
    await userEvent.click(toggle());
    expect(heading()).toBe("June 2025");
  });

  it("opens on today's month when today lies inside the bounds", async () => {
    renderField({ min: date(2026, 1, 1), max: date(2026, 12, 31) });
    await userEvent.click(toggle());
    expect(heading()).toBe("October 2026");
  });

  it("commits typed text as the press on the button blurs the input, and opens on its month", async () => {
    const onChange = vi.fn();
    renderField({ onChange });
    await userEvent.click(field());
    await userEvent.keyboard("12/25/2026");

    await userEvent.click(toggle());
    expect(onChange.mock.calls).toEqual([[date(2026, 12, 25)]]);
    expect(heading()).toBe("December 2026");
    expect(screen.getByRole("gridcell", { name: "12/25/2026" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps a rejected draft on screen until a pick replaces it", async () => {
    const onChange = vi.fn();
    renderField({ defaultValue: TODAY, onChange });
    await userEvent.click(field());
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard("soon");

    await userEvent.click(toggle());
    expect(onChange).not.toHaveBeenCalled();
    expect(heading()).toBe("October 2026");
    await userEvent.click(screen.getByRole("gridcell", { name: "10/02/2026" }));
    await vi.waitFor(() => expect(field()).toHaveFocus());
    expect(field()).toHaveValue("10/02/2026");
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("lays the calendar out inside the panel without overflowing it", async () => {
    renderField();
    await userEvent.click(toggle());
    const calendar = document.querySelector(".vpg-calendar") as HTMLElement;
    const box = (panel() as HTMLElement).getBoundingClientRect();
    const inner = calendar.getBoundingClientRect();
    expect(inner.left).toBeGreaterThanOrEqual(box.left);
    expect(inner.right).toBeLessThanOrEqual(box.right);
    expect((panel() as HTMLElement).scrollWidth).toBe((panel() as HTMLElement).clientWidth);
  });

  it("hangs the panel below the whole field, flush with the field's start edge", async () => {
    // Clear of the viewport edge, where the panel would otherwise be shifted inwards.
    document.body.style.marginLeft = "120px";
    try {
      const { container } = renderField();
      await userEvent.click(toggle());
      const shell = (container.querySelector(".vpg-field-shell") as HTMLElement).getBoundingClientRect();
      const box = (panel() as HTMLElement).getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(shell.bottom);
      expect(box.top - shell.bottom).toBeLessThan(24);
      expect(Math.abs(box.left - shell.left)).toBeLessThanOrEqual(1);
    } finally {
      document.body.style.marginLeft = "";
    }
  });

  it("leaves the page interactive while open: a press on the input closes the panel and focuses it", async () => {
    renderField();
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    await userEvent.click(field());
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(field()).toHaveFocus());
  });

  it("keeps the input reachable by role and editable while the panel is open", async () => {
    renderField();
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    expect(field().closest("[aria-hidden='true'], [inert]")).toBeNull();
    expect(panel()?.getAttribute("role")).toBeNull();
  });

  it("centres the button in the field's leading slot", () => {
    const { container } = renderField();
    const shell = (container.querySelector(".vpg-field-shell") as HTMLElement).getBoundingClientRect();
    const button = toggle().getBoundingClientRect();
    expect(button.left).toBeGreaterThan(shell.left);
    expect(button.right).toBeLessThan(field().getBoundingClientRect().left);
    expect(button.top + button.height / 2).toBeCloseTo(shell.top + shell.height / 2, 0);
  });

  it("draws the accent focus ring on a button that takes keyboard focus, and no opacity", async () => {
    renderField();
    field().focus();

    await userEvent.tab({ shift: true });
    expect(toggle()).toHaveFocus();
    const styles = getComputedStyle(toggle());
    expect(styles.outlineStyle).toBe("solid");
    expect(styles.outlineColor).toBe(resolved("outlineColor", "var(--vpg-accent-ring)"));
    expect(styles.opacity).toBe("1");
  });

  it("shows a not-allowed cursor on a disabled button, with no opacity of its own", () => {
    renderField({ disabled: true });
    const styles = getComputedStyle(toggle());
    expect(styles.cursor).toBe("not-allowed");
    expect(styles.opacity).toBe("1");
  });
});

describe("DateField's calendar on a phone-width viewport", () => {
  for (const [name, size] of [
    ["a phone", NARROW],
    ["the narrowest phone", NARROWEST],
  ] as const) {
    it(`opens as a non-modal popover below the field on ${name}, inside the viewport`, async () => {
      await page.viewport(size[0], size[1]);
      const { container } = renderField();
      await userEvent.click(toggle());
      await vi.waitFor(() => expect(panel()).not.toBeNull());

      expect(document.querySelector("dialog")).toBeNull();
      expect(field().closest("[aria-hidden='true'], [inert]")).toBeNull();
      const shell = (container.querySelector(".vpg-field-shell") as HTMLElement).getBoundingClientRect();
      const box = (panel() as HTMLElement).getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(shell.bottom);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(window.innerWidth);
      expect((panel() as HTMLElement).scrollWidth).toBe((panel() as HTMLElement).clientWidth);
    });
  }

  it("picks a day and focuses the input on a phone", async () => {
    await page.viewport(...NARROW);
    const onChange = vi.fn();
    renderField({ defaultValue: TODAY, onChange });
    await userEvent.click(toggle());
    await vi.waitFor(() => expect(focusedDay()).toBe("gridcell"));
    await userEvent.click(screen.getByRole("gridcell", { name: "10/20/2026" }));
    await vi.waitFor(() => expect(panel()).toBeNull());
    await vi.waitFor(() => expect(field()).toHaveFocus());
    expect(onChange.mock.calls).toEqual([[date(2026, 10, 20)]]);
  });
});
