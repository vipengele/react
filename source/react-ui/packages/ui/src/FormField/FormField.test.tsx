import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadioButton } from "../RadioButton/RadioButton.js";
import { Toggle } from "../Toggle/Toggle.js";
import { FormField } from "./FormField.js";

describe("FormField", () => {
  it("labels a native input via aria-labelledby and htmlFor, and sets its id", () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    const label = screen.getByText("Email");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);
    expect(input.id).toBeTruthy();
  });

  it("labels a wrapped Toggle", () => {
    render(
      <FormField label="Enable notifications">
        <Toggle />
      </FormField>,
    );
    expect(screen.getByRole("switch", { name: "Enable notifications" })).toBeInTheDocument();
  });

  it("labels a wrapped RadioButton", () => {
    render(
      <FormField label="Small size" hint="Recommended for compact layouts">
        <RadioButton value="small" />
      </FormField>,
    );
    const radio = screen.getByRole("radio", { name: "Small size" });
    expect(radio).toHaveAccessibleDescription("Recommended for compact layouts");
  });

  it("sets no aria-invalid and no error id in aria-describedby when error is absent", () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("wires only the hint into aria-describedby when only a hint is given", () => {
    render(
      <FormField label="Email" hint="We never share this">
        <input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("We never share this");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("wires only the error into aria-describedby and sets aria-invalid when only an error is given", () => {
    render(
      <FormField label="Email" error="Required">
        <input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("Required");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("wires both hint and error into a merged aria-describedby when both are given", () => {
    render(
      <FormField label="Email" hint="We never share this" error="Required">
        <input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0] ?? "")).toHaveTextContent("We never share this");
    expect(document.getElementById(ids[1] ?? "")).toHaveTextContent("Required");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("merges its own describedby ids with one the child already carries, rather than overwriting it", () => {
    render(
      <FormField label="Email" error="Required">
        <input aria-describedby="preexisting" />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain("preexisting");
    expect(describedBy.split(" ")).toHaveLength(2);
  });

  it("keeps the child's own id when it already has one", () => {
    render(
      <FormField label="Email">
        <input id="custom-id" />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.id).toBe("custom-id");
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", "custom-id");
  });

  it("throws when children is a string", () => {
    expect(() =>
      render(
        // biome-ignore lint/suspicious/noExplicitAny: exercising the invalid-children throw path
        <FormField label="Email">{"not an element" as any}</FormField>,
      ),
    ).toThrow("FormField requires exactly one focusable element as its child.");
  });

  it("throws when children is an array", () => {
    expect(() =>
      render(
        <FormField label="Email">
          {/* biome-ignore lint/suspicious/noExplicitAny: exercising the invalid-children throw path */}
          {[<input key="a" />, <input key="b" />] as any}
        </FormField>,
      ),
    ).toThrow("FormField requires exactly one focusable element as its child.");
  });

  it("throws when children is a Fragment", () => {
    expect(() =>
      render(
        <FormField label="Email">
          {/* biome-ignore lint/complexity/noUselessFragments: exercising the Fragment-children throw path */}
          <>
            <input />
            <input />
          </>
        </FormField>,
      ),
    ).toThrow("FormField requires exactly one focusable element as its child.");
  });

  it("throws when children is null", () => {
    expect(() =>
      render(
        // biome-ignore lint/suspicious/noExplicitAny: exercising the invalid-children throw path
        <FormField label="Email">{null as any}</FormField>,
      ),
    ).toThrow("FormField requires exactly one focusable element as its child.");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <FormField label="First">
            <input />
          </FormField>
          <FormField label="Second">
            <input />
          </FormField>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-form-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-form-field {");
    });

    it("never assigns a --tandiko-* custom property inline on its root", () => {
      render(
        <FormField label="Email" hint="Hint" error="Error">
          <input />
        </FormField>,
      );
      // An inline custom property would beat the stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode.
      const root = screen.getByText("Email").closest(".tandiko-form-field");
      expect(root?.getAttribute("style")).toBeNull();
    });
  });
});
