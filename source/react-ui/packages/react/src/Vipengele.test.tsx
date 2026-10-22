import { act, render } from "@testing-library/react";
import { ScopeProvider, useScope } from "@vipengele/react-telemetry";
import { createTheme, LocaleProvider, ThemeProvider, type UseColorModeResult, useColorMode, useLocale } from "@vipengele/react-tokens";
import { Locale, type Scope } from "@vipengele/ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Vipengele } from "./index.js";

interface Reading {
  colorMode: UseColorModeResult;
  locale: Locale;
  scope: Scope;
}

function Probe({ onRender }: { onRender: (reading: Reading) => void }) {
  onRender({ colorMode: useColorMode(), locale: useLocale(), scope: useScope() });
  return null;
}

function captureReadings() {
  const readings: Reading[] = [];
  return {
    readings,
    onRender: (reading: Reading) => readings.push(reading),
    last: () => readings[readings.length - 1] as Reading,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Vipengele", () => {
  it("renders div.vpg-root as its one DOM root, with its children inside it", () => {
    const { container, getByTestId } = render(
      <Vipengele>
        <span data-testid="child" />
      </Vipengele>,
    );

    expect(container.children).toHaveLength(1);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root).toHaveClass("vpg-root");
    expect(root).toContainElement(getByTestId("child"));
  });

  it("puts div props on div.vpg-root", () => {
    const { container } = render(<Vipengele className="app" id="root" data-testid="shell" aria-label="App" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("vpg-root", "app");
    expect(root).toHaveAttribute("id", "root");
    expect(root).toHaveAttribute("data-testid", "shell");
    expect(root).toHaveAttribute("aria-label", "App");
  });

  it("applies the theme prop to div.vpg-root", () => {
    const theme = createTheme({ accent: "#ff0000" });
    const { container } = render(<Vipengele theme={theme} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--vpg-accent-light")).toBe(theme["--vpg-accent-light"]);
  });

  it("gives useColorMode the colorMode prop and reports changes through onColorModeChange", () => {
    const onColorModeChange = vi.fn();
    const probe = captureReadings();
    const { container } = render(
      <Vipengele colorMode="dark" onColorModeChange={onColorModeChange}>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(container.firstElementChild).toHaveAttribute("data-vpg-mode", "dark");
    expect(probe.last().colorMode.colorMode).toBe("dark");
    expect(probe.last().colorMode.resolvedColorMode).toBe("dark");

    act(() => probe.last().colorMode.setColorMode("light"));

    expect(onColorModeChange).toHaveBeenCalledWith("light");
    expect(probe.last().colorMode.colorMode).toBe("dark");
  });

  it("starts the held colour mode from defaultColorMode", () => {
    const probe = captureReadings();
    const { container } = render(
      <Vipengele defaultColorMode="light">
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(container.firstElementChild).toHaveAttribute("data-vpg-mode", "light");
    expect(probe.last().colorMode.colorMode).toBe("light");

    act(() => probe.last().colorMode.setColorMode("dark"));

    expect(container.firstElementChild).toHaveAttribute("data-vpg-mode", "dark");
    expect(probe.last().colorMode.colorMode).toBe("dark");
  });

  it("gives useLocale the locale prop", () => {
    const probe = captureReadings();
    render(
      <Vipengele locale={new Locale("sv-SE")}>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(probe.last().locale.tag).toBe("sv-SE");
  });

  it("defaults the locale to the runtime's own, read once and kept across renders", () => {
    const spy = vi.spyOn(Locale, "default").mockImplementation(() => new Locale("pt-BR"));
    const probe = captureReadings();
    const { rerender } = render(
      <Vipengele>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );
    const first = probe.last().locale;
    rerender(
      <Vipengele>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(first.tag).toBe("pt-BR");
    expect(probe.last().locale).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("lets a locale prop given after mount win over the default", () => {
    const probe = captureReadings();
    const { rerender } = render(
      <Vipengele>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );
    rerender(
      <Vipengele locale={new Locale("ja-JP")}>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(probe.last().locale.tag).toBe("ja-JP");
  });

  it("gives useScope a scope with the scope prop's tag and attributes", () => {
    const probe = captureReadings();
    render(
      <Vipengele scope={{ tag: "checkout", attributes: { "user.id": "u1" } }}>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(probe.last().scope.tag).toBe("checkout");
    expect(probe.last().scope.get("user.id")).toBe("u1");
  });

  it("gives useScope a react.scope-tagged scope when no scope prop is given", () => {
    const probe = captureReadings();
    render(
      <Vipengele>
        <Probe onRender={probe.onRender} />
      </Vipengele>,
    );

    expect(probe.last().scope.tag).toBe("react.scope");
  });

  it("parents its scope on the enclosing provider's scope, or on the root under scope.isolate", () => {
    const inherited = captureReadings();
    const isolated = captureReadings();
    render(
      <ScopeProvider attributes={{ "tenant.id": "t1" }}>
        <Vipengele>
          <Probe onRender={inherited.onRender} />
        </Vipengele>
        <Vipengele scope={{ isolate: true }}>
          <Probe onRender={isolated.onRender} />
        </Vipengele>
      </ScopeProvider>,
    );

    expect(inherited.last().scope.get("tenant.id")).toBe("t1");
    expect(isolated.last().scope.get("tenant.id")).toBeUndefined();
  });

  it("does not put the scope props on div.vpg-root", () => {
    const { container } = render(<Vipengele scope={{ tag: "checkout", attributes: { "user.id": "u1" } }} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttributeNames().sort()).toEqual(["class", "style"]);
  });

  it("gives its subtree what the providers it composes give when mounted individually", () => {
    const composed = captureReadings();
    const individual = captureReadings();
    const locale = new Locale("de-DE");
    render(
      <>
        <Vipengele colorMode="dark" locale={locale} scope={{ tag: "page", attributes: { "page.id": "p1" } }}>
          <Probe onRender={composed.onRender} />
        </Vipengele>
        <ThemeProvider colorMode="dark">
          <LocaleProvider locale={locale}>
            <ScopeProvider tag="page" attributes={{ "page.id": "p1" }}>
              <Probe onRender={individual.onRender} />
            </ScopeProvider>
          </LocaleProvider>
        </ThemeProvider>
      </>,
    );

    expect(composed.last().colorMode.colorMode).toBe(individual.last().colorMode.colorMode);
    expect(composed.last().colorMode.resolvedColorMode).toBe(individual.last().colorMode.resolvedColorMode);
    expect(composed.last().locale).toBe(individual.last().locale);
    expect(composed.last().scope.tag).toBe(individual.last().scope.tag);
    expect(composed.last().scope.get("page.id")).toBe(individual.last().scope.get("page.id"));
  });
});
