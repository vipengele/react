import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar.js";

const SRC = "https://example.test/ada.png";

describe("Avatar", () => {
  it("renders the image when a src is given", () => {
    render(<Avatar src={SRC} name="Ada Lovelace" />);
    const image = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(image).toHaveAttribute("src", SRC);
    expect(image).toHaveClass("vpg-avatar-image");
  });

  it("prefers alt over name as the image's accessible name", () => {
    render(<Avatar src={SRC} name="Ada Lovelace" alt="Portrait of Ada" />);
    expect(screen.getByRole("img", { name: "Portrait of Ada" })).toBeInTheDocument();
  });

  it("renders an empty alt for an image with neither alt nor name", () => {
    const { container } = render(<Avatar src={SRC} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders initials from the first and last word when there is no src", () => {
    render(<Avatar name="ada byron lovelace" />);
    expect(screen.getByRole("img", { name: "ada byron lovelace" })).toHaveTextContent("AL");
  });

  it("renders a single initial for a one-word name", () => {
    render(<Avatar name="Ada" />);
    expect(screen.getByRole("img", { name: "Ada" })).toHaveTextContent("A");
  });

  it("hides the initials from assistive technology, leaving the name as the only announcement", () => {
    const { container } = render(<Avatar name="Ada Lovelace" />);
    expect(container.querySelector("span[aria-hidden='true']")).toHaveTextContent("AL");
  });

  it("falls back to the person icon when there is neither src nor name", () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector("svg.vpg-avatar-icon")).toBeInTheDocument();
  });

  it("falls back to the person icon when the name yields no initials", () => {
    const { container } = render(<Avatar name="   " />);
    expect(container.querySelector("svg.vpg-avatar-icon")).toBeInTheDocument();
  });

  it("stays out of the accessibility tree when it carries no name at all", () => {
    const { container } = render(<Avatar />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".vpg-avatar")).not.toHaveAttribute("aria-label");
  });

  it("labels the icon fallback with alt when no name is given", () => {
    render(<Avatar alt="Unknown person" />);
    expect(screen.getByRole("img", { name: "Unknown person" })).toBeInTheDocument();
  });

  describe("image load failure", () => {
    it("falls back to the initials when the image fails to load", () => {
      const { container } = render(<Avatar src={SRC} name="Ada Lovelace" />);
      const image = container.querySelector("img");
      expect(image).not.toBeNull();
      fireEvent.error(image as HTMLImageElement);

      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
    });

    it("falls back to the person icon when the image fails and there is no name", () => {
      const { container } = render(<Avatar src={SRC} />);
      fireEvent.error(container.querySelector("img") as HTMLImageElement);
      expect(container.querySelector("svg.vpg-avatar-icon")).toBeInTheDocument();
    });

    it("retries a freshly supplied src rather than inheriting the failed one", () => {
      const { container, rerender } = render(<Avatar src={SRC} name="Ada Lovelace" />);
      fireEvent.error(container.querySelector("img") as HTMLImageElement);
      expect(container.querySelector("img")).toBeNull();

      rerender(<Avatar src="https://example.test/ada-2.png" name="Ada Lovelace" />);
      expect(container.querySelector("img")).toHaveAttribute("src", "https://example.test/ada-2.png");
    });
  });

  it("defaults to the medium size and the circle shape", () => {
    render(<Avatar name="Ada" />);
    const avatar = screen.getByRole("img", { name: "Ada" });
    expect(avatar).toHaveClass("vpg-avatar-md", "vpg-avatar-circle");
  });

  it.each(["sm", "md", "lg", "xl"] as const)("renders the %s size class", (size) => {
    render(<Avatar name="Ada" size={size} />);
    expect(screen.getByRole("img", { name: "Ada" })).toHaveClass(`vpg-avatar-${size}`);
  });

  it.each(["circle", "square"] as const)("renders the %s shape class", (shape) => {
    render(<Avatar name="Ada" shape={shape} />);
    expect(screen.getByRole("img", { name: "Ada" })).toHaveClass(`vpg-avatar-${shape}`);
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Avatar name="Ada" className="custom" />);
    const avatar = screen.getByRole("img", { name: "Ada" });
    expect(avatar).toHaveClass("custom");
    expect(avatar).toHaveClass("vpg-avatar");
  });

  it("forwards arbitrary attributes to the wrapping element", () => {
    render(<Avatar name="Ada" data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of avatars", () => {
      render(
        <>
          <Avatar name="Ada Lovelace" />
          <Avatar src={SRC} name="Grace Hopper" size="lg" shape="square" />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-avatar"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-avatar {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Avatar name="Ada" size="xl" shape="square" className="custom" />);
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByRole("img", { name: "Ada" }).getAttribute("style")).toBeNull();
    });
  });
});
