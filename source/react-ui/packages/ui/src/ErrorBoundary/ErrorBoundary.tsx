import { Component, type ErrorInfo, type ReactNode } from "react";
import { StatePanel } from "../StatePanel/StatePanel.js";

/**
 * A reporting sink for a caught error. The same signature React's root-level
 * `onCaughtError`/`onUncaughtError` options take, so one reporter serves both — see
 * {@link toRootErrorHandlers}.
 */
export type ErrorReporter = (error: unknown, errorInfo: { componentStack?: string | null }) => void;

export interface ErrorBoundaryProps {
  /** The subtree this boundary protects. */
  children: ReactNode;
  /**
   * What renders in place of `children` once an error is caught. A function receives the error
   * and a `reset` that clears the error state and re-renders `children`; a node renders as
   * given. Absent, the boundary renders an error `StatePanel`.
   */
  fallback?: ReactNode | ((error: unknown, reset: () => void) => ReactNode);
  /** The default fallback's title. */
  title?: ReactNode;
  /** The default fallback's description. */
  description?: ReactNode;
  /** Called with every error this boundary catches, for reporting. */
  onError?: ErrorReporter;
  /**
   * Values that, while the fallback is showing, clear the error state when any of them changes.
   * Compared by `Object.is`, position by position.
   */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/**
 * An error boundary requires copy it can render without the caller having supplied any — a
 * safety net that needs a prop to render is a safety net that can fail at the one moment it has
 * to work. See `docs/adr/0019-errorboundary-overrides-statepanels-required-title-contract.md`.
 */
const DEFAULT_TITLE = "Something went wrong.";

function resetKeysChanged(previous: unknown[] | undefined, next: unknown[] | undefined): boolean {
  const before = previous ?? [];
  const after = next ?? [];
  if (before.length !== after.length) {
    return true;
  }
  return after.some((key, index) => !Object.is(key, before[index]));
}

/**
 * Catches a rendering error thrown anywhere in its subtree and renders a fallback in its place.
 * Catching is a tree position, not an app-wide setting: the boundary shows the fallback where
 * the failed subtree was, and the rest of the page keeps rendering.
 *
 * `StatePanel` is imported statically, so importing `ErrorBoundary` at all pulls it in — and,
 * transitively, `Typography` and its inline error illustration — whichever `fallback` a given
 * instance passes.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Clears the error state. A child that throws again on the next render is caught again and
   * reported again, which is the boundary working, not a loop to guard against.
   */
  private readonly reset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    if (!this.state.hasError || !prevState.hasError) {
      return;
    }
    if (resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  override render(): ReactNode {
    const { children, fallback, title, description } = this.props;

    if (!this.state.hasError) {
      return children;
    }
    if (typeof fallback === "function") {
      return fallback(this.state.error, this.reset);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    return <StatePanel variant="error" title={title ?? DEFAULT_TITLE} description={description} />;
  }
}

/**
 * Spreads one reporter across React's root-level error options:
 * `createRoot(el, { ...toRootErrorHandlers(report) })`. The root options report errors and
 * cannot render anything, so they complement a boundary rather than replace it — this keeps a
 * single reporter serving both call sites.
 */
export function toRootErrorHandlers(onError: ErrorReporter): {
  onCaughtError: ErrorReporter;
  onUncaughtError: ErrorReporter;
} {
  return { onCaughtError: onError, onUncaughtError: onError };
}
