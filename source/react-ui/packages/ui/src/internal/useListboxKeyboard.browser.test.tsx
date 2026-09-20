import { FloatingFocusManager } from "@floating-ui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { useListboxKeyboard } from "./useListboxKeyboard.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

const LABELS = ["Ada Lovelace", "Grace Hopper", "Alan Turing"];

/**
 * The composition `search` mode is built for, as small as it goes: a trigger that stays the
 * reference element for the whole lifecycle, and a search input inside the floating element that
 * takes real focus from a non-modal `FloatingFocusManager` and drives the list virtually.
 *
 * It lives here rather than in a shipped component because the hook's contract is what these
 * tests hold: the trigger is what floating-ui calls `elements.domReference` whether the listbox
 * is open or shut, and the input only exists while it is open.
 */
function SearchableListbox() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles, context, fieldRef, onFieldMouseDown, getReferenceProps, getFloatingProps, getItemProps, getSearchProps } =
    useListboxKeyboard({
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      disabledIndices: [],
      typeahead: false,
      role: "select",
      search: true,
      open,
      onOpenChange: (next) => {
        setOpen(next);
        if (!next) {
          setActiveIndex(null);
        }
      },
    });

  return (
    <div>
      <FieldShell ref={fieldRef} onMouseDown={onFieldMouseDown}>
        <div ref={refs.setReference} role="combobox" aria-expanded={open} aria-label="Assignee" tabIndex={0} {...getReferenceProps()}>
          {selected ?? "Choose"}
        </div>
      </FieldShell>
      {open ? (
        // The floating element only positions. Inside it the search input and the listbox are
        // siblings, so no key travelling from the input reaches the listbox by bubbling: the
        // arrow keys arrive through `getSearchProps()` alone.
        <div ref={refs.setFloating} style={floatingStyles}>
          <FloatingFocusManager context={context} modal={false} initialFocus={searchRef}>
            <div>
              <input ref={searchRef} aria-label="Search" {...getSearchProps()} />
              <div role="listbox" {...getFloatingProps()}>
                {LABELS.map((label, index) => (
                  <div
                    key={label}
                    ref={(node) => {
                      listRef.current[index] = node;
                    }}
                    {...getItemProps({
                      active: activeIndex === index,
                      selected: selected === label,
                      onClick: () => {
                        setSelected(label);
                        setOpen(false);
                      },
                    })}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </FloatingFocusManager>
        </div>
      ) : null}
    </div>
  );
}

/** Renders the host with an unfocusable region beside it, and opens the listbox. */
async function renderOpen() {
  render(
    <div>
      <div data-testid="outside" style={{ height: "40px" }}>
        outside
      </div>
      <SearchableListbox />
    </div>,
  );
  const trigger = screen.getByRole("combobox", { name: "Assignee" });
  await userEvent.click(trigger);
  return { trigger, search: screen.getByRole("combobox", { name: "Search" }) };
}

describe("useListboxKeyboard in search mode", () => {
  it("puts real focus in the search input while the trigger stays the reference element", async () => {
    const { trigger, search } = await renderOpen();

    expect(document.activeElement).toBe(search);
    expect(search).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("moves the search input's aria-activedescendant as the arrow keys travel the options", async () => {
    const { search } = await renderOpen();

    await userEvent.keyboard("{ArrowDown}");
    const first = screen.getByRole("option", { name: "Ada Lovelace" });
    expect(search).toHaveAttribute("aria-activedescendant", first.id);

    await userEvent.keyboard("{ArrowDown}");
    const second = screen.getByRole("option", { name: "Grace Hopper" });
    expect(search).toHaveAttribute("aria-activedescendant", second.id);

    await userEvent.keyboard("{End}");
    const last = screen.getByRole("option", { name: "Alan Turing" });
    expect(search).toHaveAttribute("aria-activedescendant", last.id);
  });

  it("names the highlight on the search input alone", async () => {
    const { trigger } = await renderOpen();

    await userEvent.keyboard("{ArrowDown}");

    expect(trigger).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-activedescendant");
  });

  it("keeps the listbox open when the search input is pressed", async () => {
    const { search } = await renderOpen();

    await userEvent.click(search);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(document.activeElement).toBe(search);
  });

  it("returns focus to the trigger when Escape closes the listbox", async () => {
    const { trigger } = await renderOpen();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(trigger);
  });

  it("returns focus to the trigger when an option is selected", async () => {
    const { trigger } = await renderOpen();

    await userEvent.click(screen.getByRole("option", { name: "Grace Hopper" }));

    expect(screen.queryByRole("listbox")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(trigger);
  });

  it("returns focus to the trigger after a press outside", async () => {
    const { trigger } = await renderOpen();

    await userEvent.click(screen.getByTestId("outside"));

    expect(screen.queryByRole("listbox")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(trigger);
  });
});
