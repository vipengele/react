import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../Button/Button.js";
import { ButtonGroup } from "./ButtonGroup.js";
import { buttonGroupStylesheet } from "./ButtonGroup.stylesheet.js";

describe("ButtonGroup", () => {
  it("renders its children", () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Two" })).toBeInTheDocument();
  });

  it("exposes a group role", () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("defaults to the horizontal orientation", () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group")).toHaveClass("tandiko-button-group-horizontal");
  });

  it.each(["horizontal", "vertical"] as const)("renders the %s orientation class", (orientation) => {
    render(
      <ButtonGroup orientation={orientation}>
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group")).toHaveClass(`tandiko-button-group-${orientation}`);
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(
      <ButtonGroup className="custom">
        <Button>One</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group");
    expect(group).toHaveClass("custom");
    expect(group).toHaveClass("tandiko-button-group");
  });

  it("forwards arbitrary attributes to the wrapping element", () => {
    render(
      <ButtonGroup data-testid="target">
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  it("renders Button children unmodified, carrying their own classes", () => {
    render(
      <ButtonGroup>
        <Button variant="secondary">One</Button>
        <Button variant="danger">Two</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("button", { name: "One" })).toHaveClass(
      "tandiko-button",
      "tandiko-button-secondary",
    );
    expect(screen.getByRole("button", { name: "Two" })).toHaveClass(
      "tandiko-button",
      "tandiko-button-danger",
    );
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of groups", () => {
      render(
        <>
          <ButtonGroup>
            <Button>One</Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
            <Button>Two</Button>
          </ButtonGroup>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-button-group"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-button-group {");
    });

    it("targets Button's rendered class name to build the attached look", () => {
      // jsdom doesn't resolve computed styles from an injected `<style>` tag, so the contract
      // between ButtonGroup and Button's class name is asserted at the source-text level: this
      // is what would catch a future rename of `.tandiko-button` breaking the selectors silently.
      expect(buttonGroupStylesheet).toContain(".tandiko-button-group-horizontal > .tandiko-button");
      expect(buttonGroupStylesheet).toContain(".tandiko-button-group-vertical > .tandiko-button");
      expect(buttonGroupStylesheet).toContain(
        ".tandiko-button-group-horizontal > .tandiko-button + .tandiko-button",
      );
      expect(buttonGroupStylesheet).toContain(
        ".tandiko-button-group-vertical > .tandiko-button + .tandiko-button",
      );
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      render(
        <ButtonGroup orientation="vertical" className="custom">
          <Button>One</Button>
        </ButtonGroup>,
      );
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByRole("group").getAttribute("style")).toBeNull();
    });
  });
});
