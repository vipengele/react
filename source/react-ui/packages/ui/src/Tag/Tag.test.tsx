import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tag } from "./Tag.js";

describe("Tag", () => {
  it("renders its label inside a badge", () => {
    const { container } = render(<Tag onRemove={() => {}}>Design</Tag>);
    const tag = container.querySelector(".vpg-tag");
    expect(tag?.tagName).toBe("SPAN");
    expect(tag).toHaveClass("vpg-badge");
    expect(tag).toHaveTextContent("Design");
  });

  it("defaults to a neutral, subtle, medium badge", () => {
    const { container } = render(<Tag onRemove={() => {}}>Design</Tag>);
    expect(container.querySelector(".vpg-tag")?.getAttribute("class")).toBe(
      "vpg-badge vpg-badge-neutral vpg-badge-subtle vpg-badge-md vpg-tag",
    );
  });

  it.each(["neutral", "accent", "danger"] as const)("renders the %s variant class", (variant) => {
    const { container } = render(
      <Tag variant={variant} onRemove={() => {}}>
        Design
      </Tag>,
    );
    expect(container.querySelector(".vpg-tag")).toHaveClass(`vpg-badge-${variant}`);
  });

  it.each(["subtle", "solid"] as const)("renders the %s emphasis class", (emphasis) => {
    const { container } = render(
      <Tag emphasis={emphasis} onRemove={() => {}}>
        Design
      </Tag>,
    );
    expect(container.querySelector(".vpg-tag")).toHaveClass(`vpg-badge-${emphasis}`);
  });

  it.each(["sm", "md"] as const)("renders the %s size class", (size) => {
    const { container } = render(
      <Tag size={size} onRemove={() => {}}>
        Design
      </Tag>,
    );
    expect(container.querySelector(".vpg-tag")).toHaveClass(`vpg-badge-${size}`);
  });

  it("renders the icon before the label, hidden from assistive technology", () => {
    const { container } = render(
      <Tag icon={<svg data-testid="glyph" />} onRemove={() => {}}>
        Design
      </Tag>,
    );
    const slot = container.querySelector(".vpg-tag")?.firstElementChild;
    expect(slot).toHaveClass("vpg-badge-icon");
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot).toContainElement(screen.getByTestId("glyph"));
  });

  it("renders the remove button after the label", () => {
    const { container } = render(<Tag onRemove={() => {}}>Design</Tag>);
    const button = screen.getByRole("button");
    expect(container.querySelector(".vpg-tag")?.lastElementChild).toBe(button);
    expect(button).toHaveClass("vpg-tag-remove");
    expect(button).toHaveAttribute("type", "button");
  });

  it("hides the remove glyph from assistive technology", () => {
    render(<Tag onRemove={() => {}}>Design</Tag>);
    const glyph = screen.getByRole("button").querySelector("svg");
    expect(glyph).toHaveClass("vpg-tag-remove-icon");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });

  it("names the remove button after a string label by default", () => {
    render(<Tag onRemove={() => {}}>Design</Tag>);
    expect(screen.getByRole("button", { name: "Remove Design" })).toBeInTheDocument();
  });

  it("names the remove button with removeLabel over the default", () => {
    render(
      <Tag removeLabel="Clear the design filter" onRemove={() => {}}>
        Design
      </Tag>,
    );
    expect(screen.getByRole("button", { name: "Clear the design filter" })).toBeInTheDocument();
  });

  it("names the remove button with removeLabel when the label is not a string", () => {
    render(
      <Tag removeLabel="Remove Design" onRemove={() => {}}>
        <strong>Design</strong>
      </Tag>,
    );
    expect(screen.getByRole("button", { name: "Remove Design" })).toBeInTheDocument();
  });

  it("requires removeLabel when the label is not a string", () => {
    render(
      // @ts-expect-error A non-string label carries no text to derive the button's name from.
      <Tag onRemove={() => {}}>
        <strong>Design</strong>
      </Tag>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onRemove once per click", () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Design</Tag>);
    const button = screen.getByRole("button", { name: "Remove Design" });

    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it("has the remove button as its only focusable element", () => {
    const { container } = render(
      <Tag icon={<svg />} onRemove={() => {}}>
        Design
      </Tag>,
    );
    const tag = container.querySelector(".vpg-tag");
    expect(tag).not.toHaveAttribute("tabindex");
    expect(tag?.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")).toHaveLength(1);
  });

  it.each(["Backspace", "Delete"])("does not call onRemove on %s", (key) => {
    const onRemove = vi.fn();
    const { container } = render(<Tag onRemove={onRemove}>Design</Tag>);
    fireEvent.keyDown(container.querySelector(".vpg-tag") as HTMLElement, { key });
    fireEvent.keyDown(screen.getByRole("button"), { key });
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    const { container } = render(
      <Tag className="custom" onRemove={() => {}}>
        Design
      </Tag>,
    );
    const tag = container.querySelector(".vpg-tag");
    expect(tag).toHaveClass("custom");
    expect(tag).toHaveClass("vpg-badge");
  });

  it("passes unknown props through to the badge", () => {
    const { container } = render(
      <Tag id="filter" title="Filter" data-state="active" onRemove={() => {}}>
        Design
      </Tag>,
    );
    const tag = container.querySelector(".vpg-tag");
    expect(tag).toHaveAttribute("id", "filter");
    expect(tag).toHaveAttribute("title", "Filter");
    expect(tag).toHaveAttribute("data-state", "active");
  });

  it("forwards its ref to the badge", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <Tag ref={ref} onRemove={() => {}}>
        Design
      </Tag>,
    );
    expect(ref.current).toBe(container.querySelector(".vpg-tag"));
  });

  it("never assigns a --vpg-* custom property inline", () => {
    const { container } = render(
      <Tag variant="danger" emphasis="solid" size="sm" icon={<svg />} onRemove={() => {}}>
        Design
      </Tag>,
    );
    // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
    // same element, so this instance would stop adapting to colour mode entirely.
    expect(container.querySelector(".vpg-tag")?.getAttribute("style")).toBeNull();
    expect(screen.getByRole("button").getAttribute("style")).toBeNull();
  });

  it("injects its stylesheet once for any number of tags, alongside the badge's", () => {
    render(
      <>
        <Tag onRemove={() => {}}>One</Tag>
        <Tag variant="accent" emphasis="solid" size="sm" onRemove={() => {}}>
          Two
        </Tag>
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-tag"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-tag-remove {");
    expect(document.head.querySelectorAll('style[data-href="vpg-badge"]')).toHaveLength(1);
  });

  it("gives the remove button its own focus ring and hover state", () => {
    render(<Tag onRemove={() => {}}>Design</Tag>);
    const css = document.head.querySelector('style[data-href="vpg-tag"]')?.textContent ?? "";
    const focusStart = css.indexOf(".vpg-tag-remove:focus-visible {");
    expect(focusStart).toBeGreaterThanOrEqual(0);
    expect(css.slice(focusStart, css.indexOf("}", focusStart))).toContain(
      "outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);",
    );
    expect(css).toContain(".vpg-tag-remove:hover {");
  });

  it("draws no colour of its own beyond the badge's", () => {
    render(<Tag onRemove={() => {}}>Design</Tag>);
    const css = document.head.querySelector('style[data-href="vpg-tag"]')?.textContent ?? "";
    expect(css).not.toMatch(/var\(--vpg-(ink|surface|accent|danger)(-wash|-contrast|-sunken)?\)/);
    expect(css).not.toContain("vpg-listbox");
  });
});
