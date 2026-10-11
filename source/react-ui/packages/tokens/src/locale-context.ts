import type { Locale } from "@vipengele/ts";
import { type Context, createContext } from "react";

/**
 * The locale of the nearest enclosing `LocaleProvider`, or `undefined` outside any. Not exported
 * from the package: `useLocale` is the one way to read it.
 */
export const LocaleContext: Context<Locale | undefined> = createContext<Locale | undefined>(undefined);
