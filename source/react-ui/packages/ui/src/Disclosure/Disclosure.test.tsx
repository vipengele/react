import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { type DisclosureGroup, DisclosureGroupContext } from "../internal/disclosureGroup.js";
import { Disclosure } from "./Disclosure.js";

function trigger(name = "Details") {
  return screen.getByRole("button", { name });
}

/** The panel is `hidden` while closed, which takes it out of the accessibility tree, so it is
 * found through the trigger's `aria-controls` rather than by role. */
function panel(name = "Details") {
  return document.getElementById(trigger(name).getAttribute("aria-controls") as string) as HTMLElement;
}

/** Dispatches what a browser fires at a closed `until-found` panel when find-in-page matches
 * inside it, then removes `hidden` as the browser does once the event has run. */
function findInPage(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new Event("beforematch"));
    element.removeAttribute("hidden");
  });
}

function group(overrides: Partial<DisclosureGroup> = {}): DisclosureGroup {
  return { isOpen: () => false, toggle: vi.fn(), headingLevel: 3, ...overrides };
}

function inGroup(value: DisclosureGroup, children: ReactNode) {
  return <DisclosureGroupContext.Provider value={value}>{children}</DisclosureGroupContext.Provider>;
}

describe("Disclosure", () => {
  describe("standalone", () => {
    it("starts closed and opens on a click when uncontrolled", () => {
      const onOpenChange = vi.fn();
      render(
        <Disclosure label="Details" onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      expect(trigger()).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(onOpenChange).toHaveBeenLastCalledWith(true);

      fireEvent.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("toggles without an onOpenChange", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      fireEvent.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("starts open with defaultOpen", () => {
      render(
        <Disclosure label="Details" defaultOpen>
          Body
        </Disclosure>,
      );
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("region", { name: "Details" })).toHaveTextContent("Body");
    });

    it("follows open when controlled, reporting a click without acting on it", () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <Disclosure label="Details" open={false} onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );

      fireEvent.click(trigger());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "false");

      rerender(
        <Disclosure label="Details" open onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("renders no heading", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("aria wiring", () => {
    it("points the trigger at the panel and labels the panel by the trigger", () => {
      render(
        <Disclosure label="Details" defaultOpen>
          Body
        </Disclosure>,
      );
      const region = screen.getByRole("region", { name: "Details" });
      expect(trigger()).toHaveAttribute("aria-controls", region.id);
      expect(region).toHaveAttribute("aria-labelledby", trigger().id);
    });

    it("hides the chevron from assistive technology", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      const chevron = trigger().querySelector(".vpg-disclosure-chevron");
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("hidden", () => {
    it("is until-found while closed and absent while open", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      expect(panel()).toHaveAttribute("hidden", "until-found");

      fireEvent.click(trigger());
      expect(panel()).not.toHaveAttribute("hidden");

      fireEvent.click(trigger());
      expect(panel()).toHaveAttribute("hidden", "until-found");
    });

    it("keeps the content inside an inner element of the panel", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      const content = panel().firstElementChild;
      expect(content).toHaveClass("vpg-disclosure-content");
      expect(content).toHaveTextContent("Body");
    });
  });

  describe("disabled", () => {
    it("disables the trigger, so a click toggles nothing", () => {
      const onOpenChange = vi.fn();
      render(
        <Disclosure label="Details" disabled onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      expect(trigger()).toBeDisabled();
      fireEvent.click(trigger());
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("beforematch", () => {
    it("opens an uncontrolled disclosure", () => {
      const onOpenChange = vi.fn();
      render(
        <Disclosure label="Details" onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      findInPage(panel());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(panel()).not.toHaveAttribute("hidden");
    });

    it("opens a controlled disclosure whose parent accepts", () => {
      function Accepting() {
        const [open, setOpen] = useState(false);
        return (
          <Disclosure label="Details" open={open} onOpenChange={setOpen}>
            Body
          </Disclosure>
        );
      }
      render(<Accepting />);
      findInPage(panel());
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(panel()).not.toHaveAttribute("hidden");
    });

    it("re-applies until-found when a controlled parent declines", () => {
      const onOpenChange = vi.fn();
      render(
        <Disclosure label="Details" open={false} onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      findInPage(panel());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(panel()).toHaveAttribute("hidden", "until-found");
    });

    it("removes its listener on unmount", () => {
      const onOpenChange = vi.fn();
      const { unmount } = render(
        <Disclosure label="Details" onOpenChange={onOpenChange}>
          Body
        </Disclosure>,
      );
      const detached = panel();
      unmount();
      detached.dispatchEvent(new Event("beforematch"));
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("asks the group to open, after reporting it through onOpenChange", () => {
      const calls: string[] = [];
      const value = group({ toggle: (item) => calls.push(`toggle ${item}`) });
      render(
        inGroup(
          value,
          <Disclosure label="Details" value="one" onOpenChange={(next) => calls.push(`change ${next}`)}>
            Body
          </Disclosure>,
        ),
      );
      findInPage(panel());
      expect(calls).toEqual(["change true", "toggle one"]);
      // The group still reports it closed, so the panel is hidden again.
      expect(panel()).toHaveAttribute("hidden", "until-found");
    });
  });

  describe("in a group", () => {
    it("wraps the trigger in a heading at the group's level", () => {
      render(inGroup(group({ headingLevel: 4 }), <Disclosure label="Details">Body</Disclosure>));
      const heading = screen.getByRole("heading", { level: 4, name: "Details" });
      expect(heading).toHaveClass("vpg-disclosure-heading");
      expect(heading).toContainElement(trigger());
    });

    it("takes its open state from the group by value, ignoring its own open and defaultOpen", () => {
      render(
        inGroup(
          group({ isOpen: (item) => item === "two" }),
          <>
            <Disclosure label="One" value="one" open defaultOpen>
              Body one
            </Disclosure>
            <Disclosure label="Two" value="two" open={false}>
              Body two
            </Disclosure>
          </>,
        ),
      );
      expect(trigger("One")).toHaveAttribute("aria-expanded", "false");
      expect(panel("One")).toHaveAttribute("hidden", "until-found");
      expect(trigger("Two")).toHaveAttribute("aria-expanded", "true");
      expect(panel("Two")).not.toHaveAttribute("hidden");
    });

    it("fires onOpenChange before asking the group to toggle", () => {
      const calls: string[] = [];
      const value = group({ isOpen: () => true, toggle: (item) => calls.push(`toggle ${item}`) });
      render(
        inGroup(
          value,
          <Disclosure label="Details" value="one" onOpenChange={(next) => calls.push(`change ${next}`)}>
            Body
          </Disclosure>,
        ),
      );
      fireEvent.click(trigger());
      expect(calls).toEqual(["change false", "toggle one"]);
    });

    it("keys itself by a generated id when given no value", () => {
      const isOpen = vi.fn(() => false);
      const toggle = vi.fn();
      render(inGroup(group({ isOpen, toggle }), <Disclosure label="Details">Body</Disclosure>));
      fireEvent.click(trigger());
      const generated = toggle.mock.calls[0]?.[0] as string;
      expect(generated).toEqual(expect.any(String));
      expect(generated).not.toBe("");
      expect(isOpen).toHaveBeenCalledWith(generated);
    });
  });

  describe("root element", () => {
    it("merges a caller's className and marks the open state", () => {
      const { container } = render(
        <Disclosure label="Details" className="custom">
          Body
        </Disclosure>,
      );
      const root = container.querySelector(".vpg-disclosure") as HTMLElement;
      expect(root).toHaveClass("vpg-disclosure", "custom");
      expect(root).not.toHaveClass("vpg-disclosure-open");

      fireEvent.click(trigger());
      expect(root).toHaveClass("vpg-disclosure-open");
    });

    it("spreads rest props onto the root and forwards its ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Disclosure label="Details" data-testid="root" id="faq" ref={ref}>
          Body
        </Disclosure>,
      );
      const root = screen.getByTestId("root");
      expect(root).toHaveAttribute("id", "faq");
      expect(root).toHaveClass("vpg-disclosure");
      expect(ref.current).toBe(root);
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Disclosure label="Details">Body</Disclosure>);
      expect(trigger().getAttribute("style")).toBeNull();
      expect(panel().getAttribute("style")).toBeNull();
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of disclosures", () => {
      render(
        <>
          <Disclosure label="First">One</Disclosure>
          <Disclosure label="Second">Two</Disclosure>
        </>,
      );
      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.querySelectorAll('style[data-href="vpg-disclosure"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-disclosure {");
    });
  });
});
