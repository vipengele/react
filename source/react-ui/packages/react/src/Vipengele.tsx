import { ScopeProvider, type ScopeProviderProps } from "@vipengele/react-telemetry";
import { LocaleProvider, ThemeProvider, type ThemeProviderProps } from "@vipengele/react-tokens";
import { Locale } from "@vipengele/ts";
import { useRef } from "react";

/** The `ScopeProvider` props `<Vipengele>` forwards: `attributes`, `tag` and `isolate`. */
export type VipengeleScopeProps = Omit<ScopeProviderProps, "children">;

export interface VipengeleProps extends ThemeProviderProps {
  /**
   * The locale `useLocale` resolves to in this subtree. Omitted, it is the runtime's own locale
   * (`Locale.default()`), read the first time it is needed and then kept. A server render has no browser
   * language to read, so a server-rendered site passes it.
   */
  locale?: Locale;
  /**
   * Props for the telemetry scope this subtree runs in. They are nested rather than flat so that
   * `tag` and `attributes` are not read as props of the root element. `tag` and `isolate` are
   * read once, when `<Vipengele>` mounts.
   */
  scope?: VipengeleScopeProps;
}

/**
 * Mounts `ThemeProvider`, `LocaleProvider` and `ScopeProvider` for its subtree. The theme props
 * and every `div` prop land on `ThemeProvider`'s `div.vpg-root`, which is the one element it
 * renders; the locale and scope providers add nothing to the DOM.
 *
 * It composes the providers and nothing more, besides defaulting the locale: a component that
 * works under `<Vipengele>` works under the providers it composes, mounted individually.
 */
export function Vipengele({ locale, scope, children, ...themeProps }: VipengeleProps) {
  // The default is read once and kept for the component's lifetime, so it is the same object on every render and safe as an
  // effect or memo dependency of a descendant.
  const fallback = useRef<Locale | undefined>(undefined);
  let resolvedLocale = locale;
  if (resolvedLocale === undefined) {
    fallback.current ??= Locale.default();
    resolvedLocale = fallback.current;
  }

  return (
    <ThemeProvider {...themeProps}>
      <LocaleProvider locale={resolvedLocale}>
        <ScopeProvider {...scope}>{children}</ScopeProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
