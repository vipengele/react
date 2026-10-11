import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorMode } from "./color-mode.js";
import { ThemeProvider } from "./ThemeProvider.js";
import type { ColorModePreference } from "./theme.js";
import { setSystemPrefersDark, systemColorSchemeListenerCount } from "./vitest.setup.js";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Shows what `useColorMode()` returns and offers a button per preference to set it. */
function Probe({ id = "probe" }: { id?: string }) {
  const { colorMode, resolvedColorMode, setColorMode } = useColorMode();
  return (
    <div data-testid={id} data-color-mode={colorMode} data-resolved={resolvedColorMode ?? "unresolved"}>
      {(["light", "dark", "system"] as const).map((mode) => (
        <button key={mode} type="button" data-testid={`${id}-set-${mode}`} onClick={() => setColorMode(mode)}>
          {mode}
        </button>
      ))}
    </div>
  );
}

function probe(id = "probe"): HTMLElement {
  return screen.getByTestId(id);
}

function press(id: string): void {
  act(() => {
    screen.getByTestId(id).click();
  });
}

describe("useColorMode", () => {
  it("throws outside a ThemeProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow("useColorMode() must be called inside a ThemeProvider.");
  });

  describe("uncontrolled", () => {
    it("starts at system when no defaultColorMode is given", () => {
      render(
        <ThemeProvider data-testid="root">
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-color-mode", "system");
      expect(screen.getByTestId("root").hasAttribute("data-vpg-mode")).toBe(false);
    });

    it("starts at defaultColorMode", () => {
      render(
        <ThemeProvider data-testid="root" defaultColorMode="dark">
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-color-mode", "dark");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "dark");
    });

    it("holds the preference setColorMode is given and writes it as data-vpg-mode", () => {
      render(
        <ThemeProvider data-testid="root">
          <Probe />
        </ThemeProvider>,
      );

      press("probe-set-light");
      expect(probe()).toHaveAttribute("data-color-mode", "light");
      expect(probe()).toHaveAttribute("data-resolved", "light");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "light");

      press("probe-set-system");
      expect(probe()).toHaveAttribute("data-color-mode", "system");
      expect(screen.getByTestId("root").hasAttribute("data-vpg-mode")).toBe(false);
    });

    it("reports every preference setColorMode is given through onColorModeChange", () => {
      const onColorModeChange = vi.fn();
      render(
        <ThemeProvider onColorModeChange={onColorModeChange}>
          <Probe />
        </ThemeProvider>,
      );

      press("probe-set-dark");
      press("probe-set-dark");
      press("probe-set-system");

      expect(onColorModeChange.mock.calls).toEqual([["dark"], ["dark"], ["system"]]);
      expect(probe()).toHaveAttribute("data-color-mode", "system");
    });

    it("ignores later changes to defaultColorMode", () => {
      const { rerender } = render(
        <ThemeProvider defaultColorMode="light">
          <Probe />
        </ThemeProvider>,
      );

      rerender(
        <ThemeProvider defaultColorMode="dark">
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-color-mode", "light");
    });
  });

  describe("controlled", () => {
    it("follows the colorMode prop and only reports setColorMode through onColorModeChange", () => {
      const onColorModeChange = vi.fn();
      const { rerender } = render(
        <ThemeProvider data-testid="root" colorMode="light" onColorModeChange={onColorModeChange}>
          <Probe />
        </ThemeProvider>,
      );

      press("probe-set-dark");
      expect(onColorModeChange).toHaveBeenCalledWith("dark");
      expect(probe()).toHaveAttribute("data-color-mode", "light");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "light");

      rerender(
        <ThemeProvider data-testid="root" colorMode="dark" onColorModeChange={onColorModeChange}>
          <Probe />
        </ThemeProvider>,
      );
      expect(probe()).toHaveAttribute("data-color-mode", "dark");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "dark");
    });

    it("lets colorMode take precedence over defaultColorMode", () => {
      render(
        <ThemeProvider colorMode="dark" defaultColorMode="light">
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-color-mode", "dark");
    });

    it("leaves the preference unchanged when setColorMode has no onColorModeChange to report to", () => {
      render(
        <ThemeProvider colorMode="light">
          <Probe />
        </ThemeProvider>,
      );

      press("probe-set-dark");

      expect(probe()).toHaveAttribute("data-color-mode", "light");
    });

    it("round-trips through a parent that stores what onColorModeChange reports", () => {
      function Host() {
        const [mode, setMode] = useState<ColorModePreference>("system");
        return (
          <ThemeProvider colorMode={mode} onColorModeChange={setMode}>
            <Probe />
          </ThemeProvider>
        );
      }
      render(<Host />);

      press("probe-set-dark");

      expect(probe()).toHaveAttribute("data-color-mode", "dark");
      expect(probe()).toHaveAttribute("data-resolved", "dark");
    });
  });

  it("binds to the nearest provider, leaving nested providers independent", () => {
    const outerChange = vi.fn();
    const innerChange = vi.fn();
    render(
      <ThemeProvider data-testid="outer" defaultColorMode="light" onColorModeChange={outerChange}>
        <Probe id="outer-probe" />
        <ThemeProvider data-testid="inner" defaultColorMode="dark" onColorModeChange={innerChange}>
          <Probe id="inner-probe" />
        </ThemeProvider>
      </ThemeProvider>,
    );

    expect(probe("outer-probe")).toHaveAttribute("data-color-mode", "light");
    expect(probe("inner-probe")).toHaveAttribute("data-color-mode", "dark");

    press("inner-probe-set-light");
    expect(innerChange).toHaveBeenCalledWith("light");
    expect(outerChange).not.toHaveBeenCalled();
    expect(probe("inner-probe")).toHaveAttribute("data-color-mode", "light");
    expect(probe("outer-probe")).toHaveAttribute("data-color-mode", "light");

    press("outer-probe-set-dark");
    expect(outerChange).toHaveBeenCalledWith("dark");
    expect(innerChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("outer")).toHaveAttribute("data-vpg-mode", "dark");
    expect(screen.getByTestId("inner")).toHaveAttribute("data-vpg-mode", "light");
    expect(probe("inner-probe")).toHaveAttribute("data-resolved", "light");
  });

  describe("resolvedColorMode", () => {
    it.each(["light", "dark"] as const)("resolves an explicit %s preference to itself whatever the page says", (mode) => {
      document.documentElement.setAttribute("data-theme", mode === "dark" ? "light" : "dark");
      setSystemPrefersDark(mode !== "dark");
      render(
        <ThemeProvider colorMode={mode}>
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-resolved", mode);
    });

    it.each([
      { dataTheme: "dark", prefersDark: false, expected: "dark" },
      { dataTheme: "dark", prefersDark: true, expected: "dark" },
      { dataTheme: "light", prefersDark: false, expected: "light" },
      { dataTheme: "light", prefersDark: true, expected: "light" },
      { dataTheme: "sepia", prefersDark: true, expected: "dark" },
      { dataTheme: "sepia", prefersDark: false, expected: "light" },
      { dataTheme: null, prefersDark: true, expected: "dark" },
      { dataTheme: null, prefersDark: false, expected: "light" },
    ])("resolves system to $expected for data-theme=$dataTheme and prefers dark=$prefersDark", ({ dataTheme, prefersDark, expected }) => {
      if (dataTheme !== null) document.documentElement.setAttribute("data-theme", dataTheme);
      setSystemPrefersDark(prefersDark);
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );

      expect(probe()).toHaveAttribute("data-resolved", expected);
    });

    it("follows <html data-theme> changing after mount", async () => {
      setSystemPrefersDark(true);
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(probe()).toHaveAttribute("data-resolved", "dark");

      await act(async () => {
        document.documentElement.setAttribute("data-theme", "light");
      });
      expect(probe()).toHaveAttribute("data-resolved", "light");

      await act(async () => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      expect(probe()).toHaveAttribute("data-resolved", "dark");

      setSystemPrefersDark(false);
      await act(async () => {
        document.documentElement.removeAttribute("data-theme");
      });
      expect(probe()).toHaveAttribute("data-resolved", "light");
    });

    it("follows prefers-color-scheme changing after mount", () => {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(probe()).toHaveAttribute("data-resolved", "light");

      act(() => setSystemPrefersDark(true));
      expect(probe()).toHaveAttribute("data-resolved", "dark");

      act(() => setSystemPrefersDark(false));
      expect(probe()).toHaveAttribute("data-resolved", "light");
    });

    it("lets data-theme override a prefers-color-scheme change after mount", () => {
      document.documentElement.setAttribute("data-theme", "light");
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );

      act(() => setSystemPrefersDark(true));

      expect(probe()).toHaveAttribute("data-resolved", "light");
    });

    it("subscribes to the media query only while the preference is system", () => {
      const { unmount } = render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(systemColorSchemeListenerCount()).toBe(1);

      press("probe-set-dark");
      expect(systemColorSchemeListenerCount()).toBe(0);
      act(() => setSystemPrefersDark(true));
      expect(probe()).toHaveAttribute("data-resolved", "dark");

      press("probe-set-system");
      expect(systemColorSchemeListenerCount()).toBe(1);
      expect(probe()).toHaveAttribute("data-resolved", "dark");

      unmount();
      expect(systemColorSchemeListenerCount()).toBe(0);
    });

    it("stops following data-theme once unmounted", async () => {
      const renders: string[] = [];
      function Recorder() {
        renders.push(useColorMode().resolvedColorMode ?? "unresolved");
        return null;
      }
      const { unmount } = render(
        <ThemeProvider>
          <Recorder />
        </ThemeProvider>,
      );
      unmount();
      const count = renders.length;

      await act(async () => {
        document.documentElement.setAttribute("data-theme", "dark");
      });

      expect(renders).toHaveLength(count);
    });

    it("disconnects its data-theme observer when the consumer unmounts", () => {
      const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
      const { unmount } = render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(disconnect).not.toHaveBeenCalled();

      unmount();

      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it("resolves system from data-theme alone, else light, when matchMedia is unavailable", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: removing a required DOM member to model a host without it
      delete (window as any).matchMedia;
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(probe()).toHaveAttribute("data-resolved", "light");

      await act(async () => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      expect(probe()).toHaveAttribute("data-resolved", "dark");
    });
  });

  describe("server rendering and hydration", () => {
    function ServerProbe() {
      const { colorMode, resolvedColorMode } = useColorMode();
      return <span data-testid="probe" data-color-mode={colorMode} data-resolved={resolvedColorMode ?? "unresolved"} />;
    }

    it("renders system as unresolved on the server", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      setSystemPrefersDark(true);

      const html = renderToString(
        <ThemeProvider>
          <ServerProbe />
        </ThemeProvider>,
      );

      expect(html).toContain('data-resolved="unresolved"');
      expect(html).toContain('data-color-mode="system"');
    });

    it.each(["light", "dark"] as const)("renders an explicit %s preference resolved on the server", (mode) => {
      const html = renderToString(
        <ThemeProvider colorMode={mode}>
          <ServerProbe />
        </ThemeProvider>,
      );

      expect(html).toContain(`data-resolved="${mode}"`);
      expect(html).toContain(`data-vpg-mode="${mode}"`);
    });

    it("hydrates system as unresolved without a mismatch, then settles on the client value", async () => {
      const renders: string[] = [];
      function Recorder() {
        const { resolvedColorMode } = useColorMode();
        renders.push(resolvedColorMode ?? "unresolved");
        return <span data-testid="probe" data-resolved={resolvedColorMode ?? "unresolved"} />;
      }
      const tree = (
        <ThemeProvider>
          <Recorder />
        </ThemeProvider>
      );

      const html = renderToString(tree);
      expect(renders).toEqual(["unresolved"]);
      renders.length = 0;

      setSystemPrefersDark(true);
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const consoleError = vi.spyOn(console, "error");
      const onRecoverableError = vi.fn();

      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, tree, { onRecoverableError });
      });

      expect(renders[0]).toBe("unresolved");
      expect(renders.at(-1)).toBe("dark");
      expect(container.querySelector('[data-testid="probe"]')).toHaveAttribute("data-resolved", "dark");
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();

      act(() => root?.unmount());
      container.remove();
    });
  });
});
