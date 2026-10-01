import type { Scope } from "@vipengele/ts";
import { type Context, createContext } from "react";

/**
 * The scope of the nearest enclosing `ScopeProvider`, or `undefined` outside any. Not exported
 * from the package: `useScope` is the one way to read it.
 */
export const ScopeContext: Context<Scope | undefined> = createContext<Scope | undefined>(undefined);
