import { Locale } from "@vipengele/ts";
import { useContext, useRef } from "react";
import { LocaleContext } from "./locale-context.js";

/**
 * Resolves a component's `Locale`: its own `locale` prop, else the nearest `LocaleProvider`'s,
 * else the runtime's default (`Locale.default()`). A set prop wins outright; nothing is blended.
 * Never throws outside a provider.
 *
 * The runtime default is read the first time a component needs it and then kept for that
 * component's lifetime, so it is the same object on every render and safe as an effect or memo
 * dependency. A value from the prop or a provider is returned as given.
 */
export function useLocale(locale?: Locale): Locale {
  const provided = useContext(LocaleContext);
  const fallback = useRef<Locale | undefined>(undefined);
  if (locale !== undefined) {
    return locale;
  }
  if (provided !== undefined) {
    return provided;
  }
  if (fallback.current === undefined) {
    fallback.current = Locale.default();
  }
  return fallback.current;
}
