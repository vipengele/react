import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { FieldShell } from "./FieldShell.js";

/** The centre of every shell below: one plain control, the way a text-entry component composes it. */
function control() {
  return <input aria-label="Amount" />;
}

/** The committed class name, and the state selectors the shipped rules carry: an assertion against
 * a hand-written equivalent passes while the stylesheet scopes its states somewhere else entirely,
 * so the stylesheet test below checks these exact strings appear in the injected CSS. */
const SHELL = ".tandiko-field-shell";
const DIMMED_SELECTOR = `${SHELL}:has(> :disabled)`;
const INVALID_SELECTOR = `${SHELL}:has(> [aria-invalid="true"])`;
const HOVER_SELECTOR = `${SHELL}:hover:not(:has(> :disabled))`;

function shellOf(container: HTMLElement) {
  const shell = container.querySelector(SHELL);
  expect(shell).not.toBeNull();
  return shell as HTMLElement;
}

describe("FieldShell", () => {
  it("renders the control inside the bordered box", () => {
    const { container } = render(<FieldShell>{control()}</FieldShell>);

    expect(shellOf(container)).toContainElement(screen.getByRole("textbox", { name: "Amount" }));
  });

  describe("adornment slots", () => {
    it("renders the leading slot before the centre and the trailing slot after", () => {
      const { container } = render(
        <FieldShell leading={<span>$</span>} trailing={<span>USD</span>}>
          {control()}
        </FieldShell>,
      );

      const children = [...shellOf(container).children];
      expect(children.map((child) => child.className)).toEqual(["tandiko-field-shell-leading", "", "tandiko-field-shell-trailing"]);
      expect(children[1]).toBe(screen.getByRole("textbox", { name: "Amount" }));
      expect(children[0]).toHaveTextContent("$");
      expect(children[2]).toHaveTextContent("USD");
    });

    it("renders a leading slot on its own", () => {
      const { container } = render(<FieldShell leading={<span>$</span>}>{control()}</FieldShell>);

      expect(container.querySelector(".tandiko-field-shell-leading")).not.toBeNull();
      expect(container.querySelector(".tandiko-field-shell-trailing")).toBeNull();
    });

    it("renders a trailing slot on its own", () => {
      const { container } = render(<FieldShell trailing={<span>USD</span>}>{control()}</FieldShell>);

      expect(container.querySelector(".tandiko-field-shell-trailing")).not.toBeNull();
      expect(container.querySelector(".tandiko-field-shell-leading")).toBeNull();
    });

    it("renders no slot element when neither slot is given", () => {
      const { container } = render(<FieldShell>{control()}</FieldShell>);

      const shell = shellOf(container);
      expect(shell.children).toHaveLength(1);
      expect(container.querySelector(".tandiko-field-shell-leading")).toBeNull();
      expect(container.querySelector(".tandiko-field-shell-trailing")).toBeNull();
    });

    it("renders no slot element for a null slot", () => {
      const { container } = render(
        <FieldShell leading={null} trailing={null}>
          {control()}
        </FieldShell>,
      );

      expect(shellOf(container).children).toHaveLength(1);
    });

    it("renders no slot element for an empty-string slot", () => {
      const { container } = render(
        <FieldShell leading="" trailing="">
          {control()}
        </FieldShell>,
      );

      expect(shellOf(container).children).toHaveLength(1);
    });

    it("renders no slot element for a false slot", () => {
      const { container } = render(
        <FieldShell leading={false} trailing={false}>
          {control()}
        </FieldShell>,
      );

      expect(shellOf(container).children).toHaveLength(1);
    });

    it("renders the slot for a 0 adornment", () => {
      const { container } = render(
        <FieldShell leading={0} trailing={0}>
          {control()}
        </FieldShell>,
      );

      const shell = shellOf(container);
      expect(container.querySelector(".tandiko-field-shell-leading")).not.toBeNull();
      expect(container.querySelector(".tandiko-field-shell-trailing")).not.toBeNull();
      expect(shell.children).toHaveLength(3);
    });

    it("renders a multi-element centre as siblings between the slots", () => {
      const { container } = render(
        <FieldShell leading={<span>$</span>} trailing={<span>USD</span>}>
          <span className="chips">chips</span>
          {control()}
        </FieldShell>,
      );

      expect([...shellOf(container).children].map((child) => child.className)).toEqual([
        "tandiko-field-shell-leading",
        "chips",
        "",
        "tandiko-field-shell-trailing",
      ]);
    });
  });

  describe("state selectors", () => {
    // jsdom resolves no styles, so these assert which elements a selector matches — DOM shape,
    // which jsdom does answer. What the dimming and the danger border look like is a browser
    // concern.

    it("matches the dimmed state when the wrapped control is disabled", () => {
      const { container } = render(
        <FieldShell>
          <input aria-label="Amount" disabled />
        </FieldShell>,
      );

      expect(shellOf(container).matches(DIMMED_SELECTOR)).toBe(true);
    });

    it("leaves the shell undimmed when a disabled button sits in the trailing slot", () => {
      const { container } = render(
        <FieldShell
          trailing={
            <button type="button" disabled>
              Reveal
            </button>
          }
        >
          {control()}
        </FieldShell>,
      );

      expect(screen.getByRole("button", { name: "Reveal" })).toBeDisabled();
      expect(shellOf(container).matches(DIMMED_SELECTOR)).toBe(false);
    });

    it("matches the invalid state when the wrapped control is invalid", () => {
      const { container } = render(
        <FieldShell>
          <input aria-label="Amount" aria-invalid="true" />
        </FieldShell>,
      );

      expect(shellOf(container).matches(INVALID_SELECTOR)).toBe(true);
    });

    it("leaves the shell valid when an invalid element sits in the trailing slot", () => {
      const { container } = render(<FieldShell trailing={<span aria-invalid="true">!</span>}>{control()}</FieldShell>);

      expect(shellOf(container).matches(INVALID_SELECTOR)).toBe(false);
    });
  });

  describe("class names and props", () => {
    it("composes a caller-supplied className alongside its own class", () => {
      const { container } = render(<FieldShell className="custom">{control()}</FieldShell>);

      const shell = shellOf(container);
      expect(shell).toHaveClass("tandiko-field-shell");
      expect(shell).toHaveClass("custom");
    });

    it("carries only its own class when no className is given", () => {
      const { container } = render(<FieldShell>{control()}</FieldShell>);

      expect(shellOf(container).className).toBe("tandiko-field-shell");
    });

    it("exposes the bordered box itself through a ref", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(<FieldShell ref={ref}>{control()}</FieldShell>);

      expect(ref.current).toBe(shellOf(container));
    });

    it("forwards arbitrary attributes to the shell", () => {
      render(
        <FieldShell data-testid="target" id="amount-shell">
          {control()}
        </FieldShell>,
      );

      expect(screen.getByTestId("target")).toHaveAttribute("id", "amount-shell");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of shells", () => {
      render(
        <>
          <FieldShell>
            <input aria-label="First" />
          </FieldShell>
          <FieldShell>
            <input aria-label="Second" />
          </FieldShell>
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="tandiko-field-shell"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(`${SHELL} {`);
      expect(styles[0]?.textContent).toContain(`${DIMMED_SELECTOR} {`);
      expect(styles[0]?.textContent).toContain(`${INVALID_SELECTOR} {`);
      expect(styles[0]?.textContent).toContain(`${HOVER_SELECTOR} {`);
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      const { container } = render(<FieldShell>{control()}</FieldShell>);

      expect(shellOf(container).getAttribute("style")).toBeNull();
    });
  });
});
