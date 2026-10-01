import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge.js";

describe("Badge", () => {
  it("renders its children inside a span", () => {
    render(<Badge>Beta</Badge>);
    const badge = screen.getByText("Beta");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("vpg-badge");
  });

  it("defaults to a neutral, subtle, medium badge", () => {
    render(<Badge>Beta</Badge>);
    expect(screen.getByText("Beta").getAttribute("class")).toBe("vpg-badge vpg-badge-neutral vpg-badge-subtle vpg-badge-md");
  });

  it.each(["neutral", "accent", "danger"] as const)("renders the %s variant class", (variant) => {
    render(<Badge variant={variant}>Beta</Badge>);
    expect(screen.getByText("Beta")).toHaveClass(`vpg-badge-${variant}`);
  });

  it.each(["subtle", "solid"] as const)("renders the %s emphasis class", (emphasis) => {
    render(<Badge emphasis={emphasis}>Beta</Badge>);
    expect(screen.getByText("Beta")).toHaveClass(`vpg-badge-${emphasis}`);
  });

  it.each(["sm", "md"] as const)("renders the %s size class", (size) => {
    render(<Badge size={size}>Beta</Badge>);
    expect(screen.getByText("Beta")).toHaveClass(`vpg-badge-${size}`);
  });

  it("is not interactive", () => {
    const { container } = render(<Badge>Beta</Badge>);
    const badge = container.querySelector(".vpg-badge");
    expect(badge).not.toHaveAttribute("role");
    expect(badge).not.toHaveAttribute("tabindex");
  });

  it("renders the icon before the label, hidden from assistive technology", () => {
    const { container } = render(<Badge icon={<svg data-testid="glyph" />}>Beta</Badge>);
    const badge = container.querySelector(".vpg-badge");
    const slot = badge?.firstElementChild;
    expect(slot).toHaveClass("vpg-badge-icon");
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot).toContainElement(screen.getByTestId("glyph"));
    expect(badge).toHaveTextContent("Beta");
  });

  it("accepts any node in the icon slot", () => {
    const { container } = render(<Badge icon="•">Beta</Badge>);
    expect(container.querySelector(".vpg-badge-icon")).toHaveTextContent("•");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("renders no icon slot when the icon is %s", (_, icon) => {
    const { container } = render(<Badge icon={icon}>Beta</Badge>);
    expect(container.querySelector(".vpg-badge-icon")).toBeNull();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Badge className="custom">Beta</Badge>);
    const badge = screen.getByText("Beta");
    expect(badge).toHaveClass("custom");
    expect(badge).toHaveClass("vpg-badge");
  });

  it("passes unknown props through to the span", () => {
    render(
      <Badge id="status" title="Status" data-state="live" aria-label="Live status">
        Live
      </Badge>,
    );
    const badge = screen.getByText("Live");
    expect(badge).toHaveAttribute("id", "status");
    expect(badge).toHaveAttribute("title", "Status");
    expect(badge).toHaveAttribute("data-state", "live");
    expect(badge).toHaveAttribute("aria-label", "Live status");
  });

  it("forwards its ref to the span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Beta</Badge>);
    expect(ref.current).toBe(screen.getByText("Beta"));
  });

  it("never assigns a --vpg-* custom property inline", () => {
    render(
      <Badge variant="danger" emphasis="solid" size="sm" icon={<svg />}>
        Beta
      </Badge>,
    );
    // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
    // same element, so this instance would stop adapting to colour mode entirely.
    expect(screen.getByText("Beta").getAttribute("style")).toBeNull();
  });

  it("injects its stylesheet once for any number of badges", () => {
    render(
      <>
        <Badge>One</Badge>
        <Badge variant="accent" emphasis="solid" size="sm">
          Two
        </Badge>
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-badge"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-badge {");
  });

  it.each([
    ["neutral", "subtle", "var(--vpg-surface-sunken)", "var(--vpg-ink)"],
    ["neutral", "solid", "var(--vpg-ink)", "var(--vpg-surface)"],
    ["accent", "subtle", "var(--vpg-accent-wash)", "var(--vpg-ink)"],
    ["accent", "solid", "var(--vpg-accent)", "var(--vpg-accent-contrast)"],
    ["danger", "subtle", "var(--vpg-danger-wash)", "var(--vpg-ink)"],
    ["danger", "solid", "var(--vpg-danger)", "var(--vpg-danger-contrast)"],
  ])("reads the %s %s colours from the theme", (variant, emphasis, background, ink) => {
    render(<Badge>Beta</Badge>);
    const css = document.head.querySelector('style[data-href="vpg-badge"]')?.textContent ?? "";
    const start = css.indexOf(`.vpg-badge-${variant}.vpg-badge-${emphasis} {`);
    expect(start).toBeGreaterThanOrEqual(0);
    const rule = css.slice(start, css.indexOf("}", start));
    expect(rule).toContain(`background-color: ${background};`);
    expect(rule).toContain(`color: ${ink};`);
  });

  it("outlines only the neutral subtle badge", () => {
    render(<Badge>Beta</Badge>);
    const css = document.head.querySelector('style[data-href="vpg-badge"]')?.textContent ?? "";
    expect(css.match(/border-color: var\(--vpg-border\);/g)).toHaveLength(1);
  });
});
