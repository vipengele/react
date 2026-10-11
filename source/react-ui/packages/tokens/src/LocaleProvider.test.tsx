import { render } from "@testing-library/react";
import { Locale } from "@vipengele/ts";
import { StrictMode } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "./LocaleProvider.js";
import { useLocale } from "./useLocale.js";

function Probe({ locale, onRender }: { locale?: Locale; onRender: (locale: Locale) => void }) {
  onRender(useLocale(locale));
  return null;
}

function captureLocales() {
  const locales: Locale[] = [];
  return {
    locales,
    onRender: (locale: Locale) => locales.push(locale),
    last: () => locales[locales.length - 1] as Locale,
  };
}

describe("LocaleProvider", () => {
  it("gives its subtree its locale", () => {
    const french = new Locale("fr-FR");
    const probe = captureLocales();
    render(
      <LocaleProvider locale={french}>
        <Probe onRender={probe.onRender} />
      </LocaleProvider>,
    );

    expect(probe.last()).toBe(french);
  });

  it("renders no element of its own", () => {
    const { container } = render(
      <LocaleProvider locale={new Locale("fr-FR")}>
        <span data-testid="child" />
      </LocaleProvider>,
    );

    expect(container.innerHTML).toBe('<span data-testid="child"></span>');
    expect(container.querySelector(".vpg-root")).toBeNull();
  });

  it("lets a nested provider override an outer one for its own subtree only", () => {
    const outer = new Locale("en-US");
    const inner = new Locale("de-DE");
    const outside = captureLocales();
    const inside = captureLocales();
    render(
      <LocaleProvider locale={outer}>
        <Probe onRender={outside.onRender} />
        <LocaleProvider locale={inner}>
          <Probe onRender={inside.onRender} />
        </LocaleProvider>
      </LocaleProvider>,
    );

    expect(outside.last()).toBe(outer);
    expect(inside.last()).toBe(inner);
  });

  it("follows a change to its locale prop", () => {
    const english = new Locale("en-GB");
    const japanese = new Locale("ja-JP");
    const probe = captureLocales();
    const { rerender } = render(
      <LocaleProvider locale={english}>
        <Probe onRender={probe.onRender} />
      </LocaleProvider>,
    );
    rerender(
      <LocaleProvider locale={japanese}>
        <Probe onRender={probe.onRender} />
      </LocaleProvider>,
    );

    expect(probe.last()).toBe(japanese);
  });

  it("reaches an overlay portaled out of its DOM subtree", () => {
    const french = new Locale("fr-FR");
    const probe = captureLocales();
    const overlayRoot = document.createElement("div");
    document.body.appendChild(overlayRoot);
    try {
      render(
        <div data-testid="tree">
          <LocaleProvider locale={french}>{createPortal(<Probe onRender={probe.onRender} />, overlayRoot)}</LocaleProvider>
        </div>,
      );

      expect(probe.last()).toBe(french);
    } finally {
      overlayRoot.remove();
    }
  });

  it("resolves the same way under StrictMode", () => {
    const french = new Locale("fr-FR");
    const provided = captureLocales();
    const fallback = captureLocales();
    const { rerender } = render(
      <StrictMode>
        <LocaleProvider locale={french}>
          <Probe onRender={provided.onRender} />
        </LocaleProvider>
        <Probe onRender={fallback.onRender} />
      </StrictMode>,
    );
    const mounted = fallback.last();
    rerender(
      <StrictMode>
        <LocaleProvider locale={french}>
          <Probe onRender={provided.onRender} />
        </LocaleProvider>
        <Probe onRender={fallback.onRender} />
      </StrictMode>,
    );

    expect(provided.locales.every((locale) => locale === french)).toBe(true);
    expect(fallback.last()).toBe(mounted);
    expect(mounted.tag).toBe(Locale.default().tag);
  });
});

describe("useLocale", () => {
  it("resolves to the runtime default outside any provider", () => {
    const probe = captureLocales();
    render(<Probe onRender={probe.onRender} />);

    expect(probe.last().tag).toBe(Locale.default().tag);
  });

  it("keeps the runtime default the same object across rerenders", () => {
    const probe = captureLocales();
    const { rerender } = render(<Probe onRender={probe.onRender} />);
    rerender(<Probe onRender={probe.onRender} />);
    rerender(<Probe onRender={probe.onRender} />);

    expect(probe.locales.length).toBeGreaterThanOrEqual(3);
    expect(new Set(probe.locales).size).toBe(1);
  });

  it("prefers the component's own locale prop over the nearest provider", () => {
    const provided = new Locale("en-US");
    const own = new Locale("sv-SE");
    const probe = captureLocales();
    render(
      <LocaleProvider locale={provided}>
        <Probe locale={own} onRender={probe.onRender} />
      </LocaleProvider>,
    );

    expect(probe.last()).toBe(own);
  });

  it("prefers the component's own locale prop over the runtime default", () => {
    const own = new Locale("sv-SE");
    const probe = captureLocales();
    render(<Probe locale={own} onRender={probe.onRender} />);

    expect(probe.last()).toBe(own);
  });

  it("returns a value it is given as is, without checking its class", () => {
    const foreign = { tag: "pt-BR" } as unknown as Locale;
    const probe = captureLocales();
    render(
      <LocaleProvider locale={foreign}>
        <Probe onRender={probe.onRender} />
      </LocaleProvider>,
    );

    expect(probe.last()).toBe(foreign);
  });
});
