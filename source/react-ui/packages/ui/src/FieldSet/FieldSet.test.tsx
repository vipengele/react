import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldSet } from "./FieldSet.js";

describe("FieldSet", () => {
  it("renders a fieldset with a legend and children after it", () => {
    render(
      <FieldSet legend="Shipping address">
        <input aria-label="Street" />
        <input aria-label="City" />
      </FieldSet>,
    );
    const fieldset = screen.getByRole("group", { name: "Shipping address" });
    expect(fieldset.tagName).toBe("FIELDSET");
    const legend = screen.getByText("Shipping address");
    expect(legend.tagName).toBe("LEGEND");
    expect(fieldset).toContainElement(legend);
    expect(screen.getByLabelText("Street")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
  });

  it("forwards disabled to the native fieldset, disabling every descendant control", () => {
    render(
      <FieldSet legend="Payment" disabled>
        <input aria-label="Card number" />
      </FieldSet>,
    );
    const fieldset = screen.getByRole("group", { name: "Payment" });
    expect(fieldset).toBeDisabled();
    expect(screen.getByLabelText("Card number")).toBeDisabled();
  });

  it("forwards an arbitrary className alongside its own", () => {
    render(
      <FieldSet legend="Group" className="custom">
        <input aria-label="Field" />
      </FieldSet>,
    );
    const fieldset = screen.getByRole("group", { name: "Group" });
    expect(fieldset).toHaveClass("tandiko-fieldset");
    expect(fieldset).toHaveClass("custom");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of fieldsets", () => {
      render(
        <>
          <FieldSet legend="First">
            <input aria-label="A" />
          </FieldSet>
          <FieldSet legend="Second">
            <input aria-label="B" />
          </FieldSet>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-fieldset"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-fieldset {");
    });

    it("never assigns a --tandiko-* custom property inline on its root", () => {
      render(
        <FieldSet legend="Group">
          <input aria-label="Field" />
        </FieldSet>,
      );
      // An inline custom property would beat the stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode.
      const fieldset = screen.getByRole("group", { name: "Group" });
      expect(fieldset.getAttribute("style")).toBeNull();
    });
  });
});
