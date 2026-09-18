import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldSet } from "../FieldSet/FieldSet.js";
import { FormField } from "./FormField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

describe("FormField under a real ThemeProvider", () => {
  it("keeps the label closer to its own control than to the next field's label", () => {
    render(
      <ThemeProvider>
        <FieldSet legend="Shipping address">
          <FormField label="Street">
            <input />
          </FormField>
          <FormField label="City">
            <input />
          </FormField>
        </FieldSet>
      </ThemeProvider>,
    );

    const streetLabel = screen.getByText("Street");
    const streetInput = screen.getByRole("textbox", { name: "Street" });
    const cityLabel = screen.getByText("City");

    const withinFieldGap = streetInput.getBoundingClientRect().top - streetLabel.getBoundingClientRect().bottom;
    const betweenFieldGap = cityLabel.getBoundingClientRect().top - streetInput.getBoundingClientRect().bottom;

    expect(withinFieldGap).toBeGreaterThan(0);
    expect(betweenFieldGap).toBeGreaterThan(withinFieldGap);
    // A gap that is merely a few pixels bigger reads as noise, not as a group boundary — the
    // difference has to be large enough for the eye to resolve as a distinct step.
    expect(betweenFieldGap - withinFieldGap).toBeGreaterThanOrEqual(8);
  });

  it("keeps a hint closer to its control than the label is", () => {
    render(
      <ThemeProvider>
        <FormField label="Email" hint="We'll never share this">
          <input />
        </FormField>
      </ThemeProvider>,
    );

    const label = screen.getByText("Email");
    const input = screen.getByRole("textbox", { name: "Email" });
    const hint = screen.getByText("We'll never share this");

    const labelToControlGap = input.getBoundingClientRect().top - label.getBoundingClientRect().bottom;
    const controlToHintGap = hint.getBoundingClientRect().top - input.getBoundingClientRect().bottom;

    expect(controlToHintGap).toBeGreaterThan(0);
    expect(controlToHintGap).toBeLessThan(labelToControlGap);
  });

  it("lines up a FieldSet's legend with the left edge of the labels inside it", () => {
    render(
      <ThemeProvider>
        <FieldSet legend="Shipping address">
          <FormField label="Street">
            <input />
          </FormField>
        </FieldSet>
      </ThemeProvider>,
    );

    const legend = screen.getByText("Shipping address");
    const label = screen.getByText("Street");

    // The browser anchors a rendered legend's inline-start edge at the fieldset's own padding
    // edge, the same edge every other child's content starts from — a legend with any inline
    // padding of its own would push its text past that edge, out of line with the labels beneath
    // it, and the panel would read as uncoordinated rather than deliberately laid out.
    //
    // A Range over the text node, not the element's own bounding box, is what proves this: padding
    // lives inside an element's border box, so it never moves that box's own left edge — it only
    // moves the text rendered inside it. Comparing element boxes would pass whether or not the
    // legend carried inline padding; comparing where each element's text actually starts is the
    // only measurement inline padding can move.
    const textLeft = (node: Element) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().left;
    };
    expect(textLeft(legend)).toBe(textLeft(label));
  });
});
