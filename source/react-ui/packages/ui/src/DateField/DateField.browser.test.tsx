import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
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
