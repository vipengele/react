/** The status colour a toast is drawn in. `neutral` is the default. */
export type ToastTone = "neutral" | "success" | "warning" | "info" | "danger";

/** A single button a toast offers. The region renders it and calls `onAction` when it is pressed. */
export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  /** Raising with the id of a toast the toaster still holds updates that toast in place. */
  id?: string;
  description?: string;
  tone?: ToastTone;
  /**
   * Milliseconds the toast stays visible before it dismisses itself. Defaults to `5000`, or to
   * `Infinity` for `danger`; `Infinity` keeps any toast until it is dismissed.
   */
  duration?: number;
  action?: ToastAction;
}

/** The options a status shorthand takes: everything but the tone it fixes. */
export type ToastShorthandOptions = Omit<ToastOptions, "tone">;

/** One toast as the store holds it: plain data, every option resolved. */
export interface ToastData {
  id: string;
  message: string;
  description: string | undefined;
  tone: ToastTone;
  /** Milliseconds from becoming visible to dismissing itself; `Infinity` when persistent. */
  duration: number;
  action: ToastAction | undefined;
}

/**
 * What a region renders. `visible` holds at most three toasts, oldest first; `queued` counts the
 * toasts waiting behind them, each shown first-in, first-out as a visible one leaves. The object is
 * replaced on every change and is the same object between changes, as `useSyncExternalStore`
 * requires.
 */
export interface ToasterSnapshot {
  visible: readonly ToastData[];
  queued: number;
}

export interface ToastPromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((reason: unknown) => string);
}

/**
 * Raises a toast and returns its id. A toaster's handle never changes identity and is valid before,
 * outside and after any React render.
 */
export interface Toast {
  (message: string, options?: ToastOptions): string;
  success(message: string, options?: ToastShorthandOptions): string;
  warning(message: string, options?: ToastShorthandOptions): string;
  info(message: string, options?: ToastShorthandOptions): string;
  danger(message: string, options?: ToastShorthandOptions): string;
  /**
   * Raises a persistent `loading` toast at once and, when `promise` settles, updates the same id in
   * place: to `success` with the default duration, or to `danger`, persistent. A toast dismissed
   * before the promise settles stays dismissed. The toaster handles the promise's rejection itself;
   * the caller's own handling of `promise` is unaffected.
   */
  promise<T>(promise: PromiseLike<T>, messages: ToastPromiseMessages<T>): string;
  /** Dismisses the toast with `id`, visible or queued, or every toast when `id` is omitted. */
  dismiss(id?: string): void;
}

/** The store a `ToastRegion` reads with `useSyncExternalStore` and drives. */
export interface ToasterStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ToasterSnapshot;
  /** Always empty: no region exists on the server, so no toast is ever visible there. */
  getServerSnapshot(): ToasterSnapshot;
  /** Stops every visible toast's timer, keeping the time each had left. */
  pause(): void;
  /** Restarts the timers `pause` stopped, each with the time it had left. */
  resume(): void;
  /**
   * Records a mounted region and returns the function that unregisters it. While no region is
   * registered every raise is a no-op, and unregistering the last region drops every toast.
   */
  registerRegion(): () => void;
}

export interface Toaster {
  store: ToasterStore;
  toast: Toast;
}

/** What a `Toast` handle needs from the toaster it raises into. */
interface ToastCore {
  raise(message: string, options: ToastOptions | undefined): string;
  /** Replaces the toast with `id` only while the toaster still holds it. */
  settle(id: string, message: string, tone: ToastTone): void;
  dismiss(id: string | undefined): void;
}

interface Entry {
  data: ToastData;
  /** Milliseconds left before the toast dismisses itself, counted while it is visible and unpaused. */
  remaining: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 5000;
/** `setTimeout` fires at once for any delay above this, so a longer duration counts as persistent. */
const MAX_TIMEOUT = 2_147_483_647;
const EMPTY: ToasterSnapshot = { visible: [], queued: 0 };

const NO_REGION_WARNING =
  "@vipengele/react-ui: a toast was raised with no ToastRegion mounted for its toaster, so it was dropped. " +
  "Mount one ToastRegion at the application root, above whatever raises toasts.";
const SECOND_REGION_WARNING =
  "@vipengele/react-ui: a second ToastRegion registered on a toaster that already has one, so every toast " +
  "renders twice. Showing toasts in another place needs its own toaster from createToaster().";

/**
 * The consumer's bundler replaces `process.env.NODE_ENV`, as it does for React's own development
 * checks. The package builds without Node's types, so the one property read is declared here.
 * Loaded as plain ESM with no bundler, `process` is undeclared and reading it would throw, so an
 * absent `process` or `process.env` counts as development.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined;

function isDevelopment(): boolean {
  if (typeof process === "undefined" || process.env === undefined) return true;
  return process.env.NODE_ENV !== "production";
}

function isTimed(ms: number): boolean {
  return ms <= MAX_TIMEOUT;
}

function createToasterCore(): { store: ToasterStore; core: ToastCore } {
  let entries: Entry[] = [];
  let snapshot = EMPTY;
  let paused = false;
  let regions = 0;
  let warnedNoRegion = false;
  let nextId = 0;
  const listeners = new Set<() => void>();

  function emit() {
    snapshot = {
      visible: entries.slice(0, MAX_VISIBLE).map((entry) => entry.data),
      queued: Math.max(entries.length - MAX_VISIBLE, 0),
    };
    for (const listener of [...listeners]) listener();
  }

  function start(entry: Entry) {
    if (paused || !isTimed(entry.remaining)) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => dismiss(entry.data.id), entry.remaining);
  }

  function stop(entry: Entry) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
  }

  function put(data: ToastData) {
    const index = entries.findIndex((entry) => entry.data.id === data.id);
    const existing = entries[index];
    if (existing === undefined) {
      const entry: Entry = { data, remaining: data.duration, startedAt: 0, timer: undefined };
      entries = [...entries, entry];
      if (entries.length <= MAX_VISIBLE) start(entry);
    } else {
      stop(existing);
      existing.data = data;
      existing.remaining = data.duration;
      if (index < MAX_VISIBLE) start(existing);
    }
    emit();
  }

  function raise(message: string, options: ToastOptions = {}): string {
    let id = options.id;
    if (id === undefined) {
      nextId += 1;
      id = `vpg-toast-${nextId}`;
    }
    if (regions === 0) {
      if (!warnedNoRegion && isDevelopment()) console.warn(NO_REGION_WARNING);
      warnedNoRegion = true;
      return id;
    }
    const tone = options.tone ?? "neutral";
    put({
      id,
      message,
      description: options.description,
      tone,
      duration: options.duration ?? (tone === "danger" ? Number.POSITIVE_INFINITY : DEFAULT_DURATION),
      action: options.action,
    });
    return id;
  }

  function settle(id: string, message: string, tone: ToastTone) {
    if (entries.some((entry) => entry.data.id === id)) raise(message, { id, tone });
  }

  function dismiss(id: string | undefined) {
    if (id === undefined) {
      if (entries.length === 0) return;
      for (const entry of entries) stop(entry);
      entries = [];
      emit();
      return;
    }
    const index = entries.findIndex((entry) => entry.data.id === id);
    const entry = entries[index];
    if (entry === undefined) return;
    stop(entry);
    entries = entries.filter((other) => other !== entry);
    const promoted = entries[MAX_VISIBLE - 1];
    if (index < MAX_VISIBLE && promoted !== undefined) start(promoted);
    emit();
  }

  const store: ToasterStore = {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY,
    pause() {
      if (paused) return;
      paused = true;
      const now = Date.now();
      for (const entry of entries.slice(0, MAX_VISIBLE)) {
        if (entry.timer === undefined) continue;
        stop(entry);
        entry.remaining -= now - entry.startedAt;
      }
    },
    resume() {
      if (!paused) return;
      paused = false;
      for (const entry of entries.slice(0, MAX_VISIBLE)) start(entry);
    },
    registerRegion() {
      if (regions > 0 && isDevelopment()) console.warn(SECOND_REGION_WARNING);
      regions += 1;
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        regions -= 1;
        if (regions === 0) dismiss(undefined);
      };
    },
  };

  return { store, core: { raise, settle, dismiss } };
}

function resolveMessage<T>(message: string | ((input: T) => string), input: T): string {
  return typeof message === "function" ? message(input) : message;
}

function createToastHandle(resolveCore: () => ToastCore): Toast {
  const shorthand =
    (tone: ToastTone) =>
    (message: string, options?: ToastShorthandOptions): string =>
      resolveCore().raise(message, { ...options, tone });

  return Object.assign((message: string, options?: ToastOptions) => resolveCore().raise(message, options), {
    success: shorthand("success"),
    warning: shorthand("warning"),
    info: shorthand("info"),
    danger: shorthand("danger"),
    promise<T>(promise: PromiseLike<T>, messages: ToastPromiseMessages<T>): string {
      const core = resolveCore();
      const id = core.raise(messages.loading, { tone: "neutral", duration: Number.POSITIVE_INFINITY });
      void Promise.resolve(promise).then(
        (value) => core.settle(id, resolveMessage(messages.success, value), "success"),
        (reason: unknown) => core.settle(id, resolveMessage(messages.error, reason), "danger"),
      );
      return id;
    },
    dismiss(id?: string): void {
      resolveCore().dismiss(id);
    },
  });
}

/**
 * Creates a toaster: a store holding its toasts and their timers, and the `toast` handle that
 * raises into it. Each toaster is independent of every other, the default one included.
 */
export function createToaster(): Toaster {
  const { store, core } = createToasterCore();
  return { store, toast: createToastHandle(() => core) };
}

let defaultToaster: { toaster: Toaster; core: ToastCore } | undefined;

function defaultParts(): { toaster: Toaster; core: ToastCore } {
  if (defaultToaster === undefined) {
    const { store, core } = createToasterCore();
    defaultToaster = { toaster: { store, toast }, core };
  }
  return defaultToaster;
}

/**
 * The package's default toaster, created on the first call. Its `toast` is the exported `toast`.
 * Importing this module creates no toaster, which keeps the package free of module-load side
 * effects.
 */
export function getDefaultToaster(): Toaster {
  return defaultParts().toaster;
}

/** The default toaster if something has used it, without creating it. */
export function peekDefaultToaster(): Toaster | undefined {
  return defaultToaster?.toaster;
}

/** The default toaster's handle. Each call resolves the default toaster, creating it on first use. */
export const toast: Toast = /* @__PURE__ */ createToastHandle(() => defaultParts().core);
