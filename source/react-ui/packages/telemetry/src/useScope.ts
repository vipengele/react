import { Scope } from "@vipengele/ts";
import { useContext } from "react";
import { ScopeContext } from "./context.js";

/**
 * The scope of the nearest enclosing `ScopeProvider`, or the realm's default scope
 * (`Scope.current()`) outside any.
 *
 * The handle is captured at render, so a closure made from it keeps it across any `await`, timer
 * or event listener — none of which React context or, in the browser, the ambient scope follows.
 * Run code in it with `Scope.propagate(scope, fn)`.
 */
export function useScope(): Scope {
  return useContext(ScopeContext) ?? Scope.current();
}
