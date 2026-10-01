import { render } from "@testing-library/react";
import { Scope } from "@vipengele/ts";
import { Component, type ReactNode, StrictMode, useEffect, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScopeProvider } from "./ScopeProvider.js";
import { useScope } from "./useScope.js";

function Probe({ onRender }: { onRender: (scope: Scope) => void }) {
  onRender(useScope());
  return null;
}

class Boundary extends Component<{ children: ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function captureScopes() {
  const scopes: Scope[] = [];
  return { scopes, onRender: (scope: Scope) => scopes.push(scope), last: () => scopes[scopes.length - 1] as Scope };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ScopeProvider", () => {
  it("gives its subtree a scope holding its attributes and tagged react.scope by default", () => {
    const probe = captureScopes();
    render(
      <ScopeProvider attributes={{ "user.id": "u1" }}>
        <Probe onRender={probe.onRender} />
      </ScopeProvider>,
    );

    expect(probe.last().tag).toBe("react.scope");
    expect(probe.last().get("user.id")).toBe("u1");
  });

  it("tags its scope with the tag prop", () => {
    const probe = captureScopes();
    render(
      <ScopeProvider tag="checkout">
        <Probe onRender={probe.onRender} />
      </ScopeProvider>,
    );

    expect(probe.last().tag).toBe("checkout");
  });

  it("parents a nested provider's scope on the enclosing provider's scope", () => {
    const probe = captureScopes();
    render(
      <ScopeProvider tag="outer" attributes={{ "user.id": "u1", "page.name": "home" }}>
        <ScopeProvider tag="inner" attributes={{ "page.name": "cart" }}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>
      </ScopeProvider>,
    );

    expect(probe.last().tag).toBe("inner");
    expect(probe.last().get("page.name")).toBe("cart");
    expect(probe.last().get("user.id")).toBe("u1");
  });

  it("parents an outermost provider's scope on the scope current when it mounts", () => {
    const probe = captureScopes();
    Scope.inherit("ambient", { "tenant.id": "t1" }, () =>
      render(
        <ScopeProvider attributes={{ "user.id": "u1" }}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>,
      ),
    );

    expect(probe.last().get("tenant.id")).toBe("t1");
    expect(probe.last().get("user.id")).toBe("u1");
  });

  it("parents an isolated provider's scope on the root, reading nothing its ancestors hold", () => {
    const probe = captureScopes();
    render(
      <ScopeProvider attributes={{ "user.id": "u1" }}>
        <ScopeProvider tag="job" isolate attributes={{ "job.id": "j1" }}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>
      </ScopeProvider>,
    );

    expect(probe.last().tag).toBe("job");
    expect(probe.last().get("job.id")).toBe("j1");
    expect(probe.last().get("user.id")).toBeUndefined();
  });

  it("keeps one scope object across re-renders", () => {
    const probe = captureScopes();
    const tree = (attributes: Record<string, unknown>) => (
      <ScopeProvider attributes={attributes}>
        <Probe onRender={probe.onRender} />
      </ScopeProvider>
    );
    const { rerender } = render(tree({ "user.id": "u1" }));
    rerender(tree({ "user.id": "u2" }));
    rerender(tree({ "user.id": "u3" }));

    expect(probe.scopes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(probe.scopes).size).toBe(1);
  });

  it("keeps one scope object across re-renders under StrictMode", () => {
    const probe = captureScopes();
    const tree = (attributes: Record<string, unknown>) => (
      <StrictMode>
        <ScopeProvider attributes={attributes}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>
      </StrictMode>
    );
    const { rerender } = render(tree({ "user.id": "u1" }));
    const mounted = probe.last();
    rerender(tree({ "user.id": "u2" }));
    rerender(tree({ "user.id": "u3" }));

    expect(probe.last()).toBe(mounted);
    expect(probe.last().get("user.id")).toBe("u3");
  });

  it("applies changed, added and unchanged attributes to the same scope in place", () => {
    const probe = captureScopes();
    const tree = (attributes: Record<string, unknown>) => (
      <ScopeProvider attributes={attributes}>
        <Probe onRender={probe.onRender} />
      </ScopeProvider>
    );
    const { rerender } = render(tree({ "user.id": "u1", "page.name": "home" }));
    const scope = probe.last();
    const set = vi.spyOn(scope, "set");
    rerender(tree({ "user.id": "u2", "page.name": "home", "cart.size": 3 }));

    expect(probe.last()).toBe(scope);
    expect(scope.get("user.id")).toBe("u2");
    expect(scope.get("page.name")).toBe("home");
    expect(scope.get("cart.size")).toBe(3);
    expect(set.mock.calls).toEqual([
      ["user.id", "u2"],
      ["cart.size", 3],
    ]);
  });

  it("sets a key added with the value undefined, shadowing the enclosing scope's value", () => {
    const probe = captureScopes();
    const tree = (attributes: Record<string, unknown>) => (
      <ScopeProvider attributes={{ "user.id": "u1" }}>
        <ScopeProvider attributes={attributes}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>
      </ScopeProvider>
    );
    const { rerender } = render(tree({}));
    expect(probe.last().get("user.id")).toBe("u1");

    rerender(tree({ "user.id": undefined }));
    expect(probe.last().get("user.id")).toBeUndefined();
  });

  it("reads undefined for a key dropped from attributes, shadowing the enclosing scope's value", () => {
    const probe = captureScopes();
    const tree = (attributes: Record<string, unknown>) => (
      <ScopeProvider attributes={{ "user.id": "outer" }}>
        <ScopeProvider attributes={attributes}>
          <Probe onRender={probe.onRender} />
        </ScopeProvider>
      </ScopeProvider>
    );
    const { rerender } = render(tree({ "user.id": "inner", "page.name": "home" }));
    rerender(tree({ "page.name": "home" }));

    expect(probe.last().get("user.id")).toBeUndefined();
    expect(probe.last().get("page.name")).toBe("home");
  });

  it("lets a child read the previous value in the render and layout effect carrying a change, and the new one in its effects", () => {
    const seen: unknown[] = [];
    function Reader() {
      const scope = useScope();
      seen.push(["render", scope.get("user.id")]);
      useLayoutEffect(() => {
        seen.push(["layout effect", scope.get("user.id")]);
      });
      useEffect(() => {
        seen.push(["effect", scope.get("user.id")]);
      });
      return null;
    }
    const tree = (id: string) => (
      <ScopeProvider attributes={{ "user.id": id }}>
        <Reader />
      </ScopeProvider>
    );
    const { rerender } = render(tree("u1"));
    seen.length = 0;
    rerender(tree("u2"));

    expect(seen).toEqual([
      ["render", "u1"],
      ["layout effect", "u1"],
      ["effect", "u2"],
    ]);
  });

  it("throws a reserved-key error when mounted with a key the root holds", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <Boundary onError={onError}>
        <ScopeProvider attributes={{ "service.name": "web" }}>{null}</ScopeProvider>
      </Boundary>,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: "common.scope.reserved-key" });
  });

  it("throws a reserved-key error when updated with a key the root holds", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const tree = (attributes: Record<string, unknown>) => (
      <Boundary onError={onError}>
        <ScopeProvider attributes={attributes}>{null}</ScopeProvider>
      </Boundary>
    );
    const { rerender } = render(tree({}));
    rerender(tree({ "service.version": "1.0.0" }));

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: "common.scope.reserved-key" });
  });
});

describe("useScope", () => {
  it("returns the default scope outside any provider", () => {
    const probe = captureScopes();
    render(<Probe onRender={probe.onRender} />);

    expect(probe.last()).toBe(Scope.current());
  });
});
