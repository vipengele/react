import { fireEvent, render, screen } from "@testing-library/react";
import type { MockInstance } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary, type ErrorReporter, toRootErrorHandlers } from "./ErrorBoundary.js";

let armed = true;

function Bomb() {
  if (armed) {
    throw new Error("kaboom");
  }
  return <p>Working again</p>;
}

/**
 * React logs every error it hands to a boundary through `console.error`, catching it or not.
 * Each test that throws silences that log for its own duration and asserts it happened, so a
 * suite run stays readable without hiding that React reported anything.
 */
function silenceReactErrorLog(): MockInstance<typeof console.error> {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    armed = true;
  });

  it("renders its children while nothing throws", () => {
    armed = false;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Working again")).toBeInTheDocument();
  });

  it("catches a throw and renders the default fallback", () => {
    const log = silenceReactErrorLog();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(document.querySelector(".vpg-state-panel-error")).not.toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("passes a caller-supplied title and description to the default fallback", () => {
    const log = silenceReactErrorLog();
    render(
      <ErrorBoundary title="This chart failed" description="Try reloading the page.">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("This chart failed")).toBeInTheDocument();
    expect(screen.getByText("Try reloading the page.")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong.")).not.toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("renders a fallback node as given", () => {
    const log = silenceReactErrorLog();
    render(
      <ErrorBoundary fallback={<p>Nothing to see here</p>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Nothing to see here")).toBeInTheDocument();
    expect(document.querySelector(".vpg-state-panel")).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("calls a fallback render prop with the error and a reset that renders children again", () => {
    const log = silenceReactErrorLog();
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <>
            <p>{String(error)}</p>
            <button
              type="button"
              onClick={() => {
                armed = false;
                reset();
              }}
            >
              Try again
            </button>
          </>
        )}
      >
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error: kaboom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Working again")).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("reports the caught error and its component stack to onError", () => {
    const log = silenceReactErrorLog();
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [error, errorInfo] = onError.mock.calls[0] as [unknown, { componentStack?: string | null }];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("kaboom");
    expect(errorInfo.componentStack).toContain("Bomb");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("clears the error when a resetKeys entry changes", () => {
    const log = silenceReactErrorLog();
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();

    armed = false;
    rerender(
      <ErrorBoundary resetKeys={["b"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Working again")).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("clears the error when resetKeys changes length", () => {
    const log = silenceReactErrorLog();
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    armed = false;
    rerender(
      <ErrorBoundary resetKeys={["a", "b"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Working again")).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("keeps the fallback when resetKeys are unchanged", () => {
    const log = silenceReactErrorLog();
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    armed = false;
    rerender(
      <ErrorBoundary resetKeys={["a"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.queryByText("Working again")).not.toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("does not reset when a child throws for the first time in the same update that changes resetKeys", () => {
    const log = silenceReactErrorLog();
    const onError = vi.fn();
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]} onError={onError}>
        <p>Working again</p>
      </ErrorBoundary>,
    );

    armed = true;
    rerender(
      <ErrorBoundary resetKeys={["b"]} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("keeps the fallback across a re-render when no resetKeys are given", () => {
    const log = silenceReactErrorLog();
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    armed = false;
    rerender(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.queryByText("Working again")).not.toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("toRootErrorHandlers", () => {
  it("serves both root error options from one reporter", () => {
    const report: ErrorReporter = vi.fn();
    const handlers = toRootErrorHandlers(report);

    expect(handlers.onCaughtError).toBe(report);
    expect(handlers.onUncaughtError).toBe(report);
  });
});
