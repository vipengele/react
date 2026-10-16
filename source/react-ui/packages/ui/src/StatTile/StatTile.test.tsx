import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile.js";
import type { StatTileStatusTone } from "./StatTile.js";

const STATUS_TONES: StatTileStatusTone[] = ["success", "warning", "info", "danger"];

describe("StatTile", () => {
  it("renders a group named by its label", () => {
    render(<StatTile label="Coverage" value="92%" />);
    const group = screen.getByRole("group", { name: "Coverage" });
    expect(group.tagName).toBe("DIV");
    expect(group).toHaveClass("vpg-stat-tile");
  });

  it("reads label, value and supporting text in that order", () => {
    render(<StatTile label="Coverage" value="92%" supporting="of 4 000 lines" />);
    expect(screen.getByRole("group")).toHaveTextContent("Coverage92%of 4 000 lines");
  });

  it("defaults to the neutral tone with no glyph and no tone label", () => {
    const { container } = render(<StatTile label="Coverage" value="92%" />);
    expect(screen.getByRole("group")).toHaveClass("vpg-stat-tile-neutral");
    expect(container.querySelector(".vpg-stat-tile-icon")).toBeNull();
    expect(container.querySelector(".vpg-stat-tile-visually-hidden")).toBeNull();
  });

  it.each(STATUS_TONES)("renders one aria-hidden glyph for the %s tone", (tone) => {
    const { container } = render(<StatTile label="Coverage" value="92%" tone={tone} toneLabel="Meaning" />);
    expect(screen.getByRole("group")).toHaveClass(`vpg-stat-tile-${tone}`);
    const glyphs = container.querySelectorAll(".vpg-stat-tile-icon");
    expect(glyphs).toHaveLength(1);
    expect(glyphs[0]?.tagName.toLowerCase()).toBe("svg");
    expect(glyphs[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the tone label as hidden text between the label and the value", () => {
    const { container } = render(<StatTile label="Coverage" value="92%" tone="danger" toneLabel="Below target" />);
    const hidden = container.querySelector(".vpg-stat-tile-visually-hidden");
    expect(hidden).toHaveTextContent("Below target");
    expect(screen.getByRole("group")).toHaveTextContent("CoverageBelow target92%");
  });

  it("names the group by the label alone, not the tone label", () => {
    render(<StatTile label="Coverage" value="92%" tone="danger" toneLabel="Below target" />);
    expect(screen.getByRole("group", { name: "Coverage" })).toBeInTheDocument();
  });

  it("renders the placeholder in place of a null or undefined value", () => {
    const { container, rerender } = render(<StatTile label="Coverage" value={null} />);
    const value = () => container.querySelector(".vpg-stat-tile-value");
    expect(value()).toHaveTextContent("—");
    expect(value()).toHaveClass("vpg-stat-tile-placeholder");
    rerender(<StatTile label="Coverage" value={undefined} />);
    expect(value()).toHaveTextContent("—");
    expect(value()).toHaveClass("vpg-stat-tile-placeholder");
  });

  it("renders a custom placeholder", () => {
    const { container } = render(<StatTile label="Coverage" value={null} placeholder="n/a" />);
    expect(container.querySelector(".vpg-stat-tile-value")).toHaveTextContent("n/a");
  });

  it("renders a value of 0 as 0, not the placeholder", () => {
    const { container } = render(<StatTile label="Failures" value={0} />);
    const value = container.querySelector(".vpg-stat-tile-value");
    expect(value).toHaveTextContent("0");
    expect(value).not.toHaveClass("vpg-stat-tile-placeholder");
  });

  it("renders an empty string value empty, not the placeholder", () => {
    const { container } = render(<StatTile label="Failures" value="" />);
    const value = container.querySelector(".vpg-stat-tile-value");
    expect(value).toBeEmptyDOMElement();
    expect(value).not.toHaveClass("vpg-stat-tile-placeholder");
  });

  it("renders no supporting line when none is given", () => {
    const { container } = render(<StatTile label="Coverage" value="92%" supporting={null} />);
    expect(container.querySelector(".vpg-stat-tile-supporting")).toBeNull();
  });

  it("renders the visual slot in a wrapper after the text", () => {
    const { container } = render(<StatTile label="Coverage" value="92%" visual={<svg data-testid="spark" />} />);
    const wrapper = container.querySelector(".vpg-stat-tile-visual");
    expect(wrapper).toContainElement(screen.getByTestId("spark"));
    expect(wrapper?.previousElementSibling).toHaveClass("vpg-stat-tile-body");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("renders no visual wrapper when the visual is %s", (_, visual) => {
    const { container } = render(<StatTile label="Coverage" value="92%" visual={visual} />);
    expect(container.querySelector(".vpg-stat-tile-visual")).toBeNull();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<StatTile label="Coverage" value="92%" className="custom" />);
    const group = screen.getByRole("group");
    expect(group).toHaveClass("custom");
    expect(group).toHaveClass("vpg-stat-tile");
  });

  it("passes unknown props through to the root", () => {
    render(<StatTile label="Coverage" value="92%" id="tile" title="Tile" data-state="live" />);
    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("id", "tile");
    expect(group).toHaveAttribute("title", "Tile");
    expect(group).toHaveAttribute("data-state", "live");
  });

  it("keeps its role even when the caller passes one", () => {
    render(<StatTile label="Coverage" value="92%" role="note" />);
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("forwards its ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StatTile ref={ref} label="Coverage" value="92%" />);
    expect(ref.current).toBe(screen.getByRole("group"));
  });

  it("lets a consumer's aria-label name the group instead of the label", () => {
    render(<StatTile label="Coverage" value="92%" aria-label="Line coverage" />);
    const group = screen.getByRole("group", { name: "Line coverage" });
    expect(group).not.toHaveAttribute("aria-labelledby");
  });

  it("lets a consumer's aria-labelledby win over the label and an aria-label", () => {
    render(
      <>
        <span id="outside">Outside name</span>
        <StatTile label="Coverage" value="92%" aria-labelledby="outside" aria-label="Line coverage" />
      </>,
    );
    const group = screen.getByRole("group", { name: "Outside name" });
    expect(group).toHaveAttribute("aria-labelledby", "outside");
  });

  it("never assigns a --vpg-* custom property inline", () => {
    render(<StatTile label="Coverage" value="92%" tone="warning" toneLabel="Near target" />);
    // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
    // same element, so this instance would stop adapting to colour mode entirely.
    expect(screen.getByRole("group").getAttribute("style")).toBeNull();
  });

  it("injects its stylesheet once for any number of tiles", () => {
    render(
      <>
        <StatTile label="One" value={1} />
        <StatTile label="Two" value={2} tone="info" toneLabel="Informational" />
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-stat-tile"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-stat-tile {");
  });

  it("requires a tone label for every status tone", () => {
    // @ts-expect-error a non-neutral tone needs `toneLabel`
    render(<StatTile label="Coverage" value="92%" tone="danger" />);
    expect(screen.getByRole("group")).toHaveClass("vpg-stat-tile-danger");
  });
});
