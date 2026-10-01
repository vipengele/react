import { Scope } from "@vipengele/ts";
import { type ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";
import { ScopeContext } from "./context.js";

const DEFAULT_TAG = "react.scope";
const NO_ATTRIBUTES: Record<string, unknown> = Object.freeze({});

export interface ScopeProviderProps {
  /**
   * The attributes the provider's scope holds of its own; its descendants read them, its
   * ancestors do not.
   *
   * A change is applied to the same scope in place, in a layout effect after the render that
   * carries it. A descendant reading `scope.get()` during that one render — or in its own
   * `useLayoutEffect`, which React runs before its ancestors' — sees the previous values; its
   * `useEffect`s and event handlers see the new ones.
   *
   * A key dropped from the object is set to `undefined` rather than removed, so it shadows any
   * value an ancestor holds for that key.
   *
   * A key the root scope holds (`service.name`, `service.version`, `deployment.environment.name`,
   * `process.runtime.name`) throws an error whose `code` is `common.scope.reserved-key`.
   */
  attributes?: Record<string, unknown>;
  /** The scope's Breadcrumb. Read once, when the provider mounts. Defaults to `react.scope`. */
  tag?: string;
  /**
   * Parent the scope on the root instead of the enclosing scope, starting a Unit of Work that reads
   * nothing its ancestors hold. Read once, when the provider mounts.
   */
  isolate?: boolean;
  children?: ReactNode;
}

/**
 * Gives its subtree a child scope of the enclosing provider's scope — or of `Scope.current()`
 * outside any — which `useScope` returns. The scope is built once per mounted provider and stays
 * the same object for the provider's lifetime, so a closure that captured it keeps working
 * whatever re-renders in between.
 */
export function ScopeProvider({ attributes = NO_ATTRIBUTES, tag = DEFAULT_TAG, isolate = false, children }: ScopeProviderProps) {
  const parent = useContext(ScopeContext);
  const [scope] = useState(() =>
    isolate
      ? Scope.isolated(tag, attributes, () => Scope.current())
      : Scope.propagate(parent ?? Scope.current(), () => Scope.inherit(tag, attributes, () => Scope.current())),
  );
  const applied = useRef(attributes);

  // Mutating the scope during render would be a side effect React may replay or discard, so a
  // change lands here, before the browser paints and before any passive effect reads it.
  useLayoutEffect(() => {
    applyAttributes(scope, applied.current, attributes);
    applied.current = attributes;
  }, [scope, attributes]);

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

function applyAttributes(scope: Scope, previous: Record<string, unknown>, next: Record<string, unknown>) {
  for (const key of Object.keys(previous)) {
    if (!Object.hasOwn(next, key)) {
      scope.set(key, undefined);
    }
  }
  for (const [key, value] of Object.entries(next)) {
    if (!Object.hasOwn(previous, key) || !Object.is(previous[key], value)) {
      scope.set(key, value);
    }
  }
}
