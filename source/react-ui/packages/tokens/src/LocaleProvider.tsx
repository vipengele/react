import type { Locale } from "@vipengele/ts";
import type { ReactNode } from "react";
import { LocaleContext } from "./locale-context.js";

export interface LocaleProviderProps {
  /** The locale `useLocale` resolves to in this subtree, for a component given no `locale` prop. */
  locale: Locale;
  children: ReactNode;
}

/**
 * Gives its subtree a `Locale`, which `useLocale` returns to any component not given its own
 * `locale` prop. The nearest provider wins; nothing is merged with an outer one.
 *
 * It renders no element of its own, so it adds nothing to the DOM and is independent of
 * `ThemeProvider`. The locale travels by React context, which follows the component tree through
 * portals: an overlay portaled out of the provider's DOM subtree still reads it.
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
