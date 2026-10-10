import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Button } from "../Button/Button.js";
import { ButtonGroup } from "../ButtonGroup/ButtonGroup.js";
import { Menu } from "../Menu/Menu.js";
import { MenuButton } from "../Menu/MenuButton.js";
import { Toolbar, type ToolbarOrientation } from "./Toolbar.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one toolbar.
afterEach(cleanup);

/** A toolbar between two page buttons, under a real provider so every `--vpg-*` read resolves. */
function Page({ children, dir, orientation }: { children: ReactNode; dir?: "rtl"; orientation?: ToolbarOrientation }) {
  return (
    <ThemeProvider>
      <div dir={dir}>
        <button type="button">Before</button>
        <Toolbar aria-label="Formatting" orientation={orientation}>
          {children}
        </Toolbar>
        <button type="button">After</button>
      </div>
    </ThemeProvider>
  );
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

describe("Toolbar in a real browser", () => {
  it("enters on the first item, leaves with one more Tab, and re-enters on the item focused last", async () => {
    render(
      <Page>
        <Button>Bold</Button>
        <Button>Italic</Button>
        <Button>Underline</Button>
      </Page>,
    );
    button("Before").focus();

    await userEvent.tab();
    expect(button("Bold")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(button("Italic")).toHaveFocus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(button("Italic")).toHaveFocus();
  });

  it("moves through a nested ButtonGroup and a MenuButton with the arrows, and Home and End", async () => {
    render(
      <Page>
        <Button>Undo</Button>
        <ButtonGroup>
          <Button>Left</Button>
          <Button>Right</Button>
        </ButtonGroup>
        <MenuButton label="Insert">
          <Menu.Item>Table</Menu.Item>
        </MenuButton>
      </Page>,
    );
    button("Undo").focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(button("Left")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(button("Right")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(button("Insert")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(button("Undo")).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(button("Insert")).toHaveFocus();
  });

  it("swaps the horizontal arrows in a right-to-left page", async () => {
    render(
      <Page dir="rtl">
        <Button>Bold</Button>
        <Button>Italic</Button>
      </Page>,
    );
    button("Bold").focus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(button("Italic")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(button("Bold")).toHaveFocus();
  });

  it("moves with the vertical arrows and stacks its items when vertical", async () => {
    render(
      <Page orientation="vertical">
        <Button>Bold</Button>
        <Button>Italic</Button>
      </Page>,
    );
    button("Bold").focus();

    await userEvent.keyboard("{ArrowDown}");
    expect(button("Italic")).toHaveFocus();

    const bold = button("Bold").getBoundingClientRect();
    const italic = button("Italic").getBoundingClientRect();
    expect(italic.top).toBeGreaterThan(bold.bottom - 1);
    expect(italic.left).toBeCloseTo(bold.left, 0);
  });

  it("lays horizontal items out in a row, spaced by the theme's gap", () => {
    render(
      <Page>
        <Button>Bold</Button>
        <Button>Italic</Button>
      </Page>,
    );
    const bold = button("Bold").getBoundingClientRect();
    const italic = button("Italic").getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(screen.getByRole("toolbar")).columnGap);

    expect(gap).toBeGreaterThan(0);
    expect(italic.top).toBeCloseTo(bold.top, 0);
    expect(italic.left - bold.right).toBeCloseTo(gap, 0);
  });

  it("stops on an aria-disabled item, which stays inert to activation", async () => {
    let pasted = false;
    render(
      <Page>
        <Button>Copy</Button>
        <Button
          aria-disabled
          onClick={() => {
            pasted = true;
          }}
        >
          Paste
        </Button>
      </Page>,
    );
    button("Copy").focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(button("Paste")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(pasted).toBe(false);
  });

  it("leaves a slider's arrows to the slider, and Tab still leaves the toolbar from it", async () => {
    render(
      <Page>
        <Button>Bold</Button>
        <input type="range" aria-label="Zoom" min={0} max={10} defaultValue={5} />
      </Page>,
    );
    const slider = screen.getByRole<HTMLInputElement>("slider", { name: "Zoom" });
    button("Bold").focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(slider).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(slider).toHaveFocus();
    expect(slider.value).toBe("6");
    // biome-ignore lint/security/noSecrets: a key sequence, read as a high-entropy string
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(slider).toHaveFocus();
    expect(slider.value).toBe("4");

    await userEvent.tab();
    expect(button("After")).toHaveFocus();
  });

  it("enters on the first item when the item focused last has unmounted", async () => {
    let hide: () => void = () => {};
    function Removable() {
      const [shown, setShown] = useState(true);
      hide = () => setShown(false);
      return shown ? <Button>Italic</Button> : null;
    }
    render(
      <Page>
        <Button>Bold</Button>
        <Removable />
      </Page>,
    );
    button("Italic").focus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();

    hide();
    await expect.poll(() => screen.queryByRole("button", { name: "Italic" })).toBeNull();
    await userEvent.tab({ shift: true });
    expect(button("Bold")).toHaveFocus();
  });

  it("enters on the first item while the item focused last is natively disabled", async () => {
    let disable: () => void = () => {};
    function Disableable() {
      const [disabled, setDisabled] = useState(false);
      disable = () => setDisabled(true);
      return <Button disabled={disabled}>Italic</Button>;
    }
    render(
      <Page>
        <Button>Bold</Button>
        <Disableable />
      </Page>,
    );
    button("Italic").focus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();

    disable();
    await expect.poll(() => button("Italic")).toBeDisabled();
    await userEvent.tab({ shift: true });
    expect(button("Bold")).toHaveFocus();
  });
});
