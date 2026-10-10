import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createToaster, type Toaster } from "./toaster.js";

/** The one part of Node's `process` these tests listen on; the package builds without Node's types. */
declare const process: {
  on(event: "unhandledRejection", listener: (reason: unknown) => void): void;
  off(event: "unhandledRejection", listener: (reason: unknown) => void): void;
};

let warn: MockInstance<typeof console.warn>;

/** Fakes `Date` beside the timers: the store measures the time a paused toast has left with it. */
function useFakeTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
}

/** A toaster with one region registered, so raising shows toasts. */
function mounted(): Toaster {
  const toaster = createToaster();
  toaster.store.registerRegion();
  return toaster;
}

function messages(toaster: Toaster): string[] {
  return toaster.store.getSnapshot().visible.map((toast) => toast.message);
}

/** Lets every pending promise reaction run. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createToaster", () => {
  it("starts with nothing visible and nothing queued", () => {
    const { store } = mounted();
    expect(store.getSnapshot()).toEqual({ visible: [], queued: 0 });
  });

  it("raises a toast with every option resolved and returns its id", () => {
    const { store, toast } = mounted();
    const onAction = () => {};
    const id = toast("Saved", { description: "All changes", action: { label: "Undo", onAction } });

    expect(store.getSnapshot().visible).toEqual([
      {
        id,
        message: "Saved",
        description: "All changes",
        tone: "neutral",
        duration: 5000,
        action: { label: "Undo", onAction },
      },
    ]);
  });

  it("generates a distinct id for each toast raised without one", () => {
    const { toast } = mounted();
    const first = toast("One");
    const second = toast("Two");
    expect(typeof first).toBe("string");
    expect(second).not.toBe(first);
  });

  it("keeps two toasters independent of each other", () => {
    const one = mounted();
    const two = mounted();
    one.toast("Only here");
    expect(messages(one)).toEqual(["Only here"]);
    expect(two.store.getSnapshot().visible).toEqual([]);
  });

  it.each([
    ["success", "success"],
    ["warning", "warning"],
    ["info", "info"],
    ["danger", "danger"],
  ] as const)("raises a %s toast through its shorthand", (shorthand, tone) => {
    const { store, toast } = mounted();
    toast[shorthand]("Status", { description: "Detail" });
    expect(store.getSnapshot().visible[0]).toMatchObject({ message: "Status", description: "Detail", tone });
  });

  it("has no error shorthand: the danger tone is reached through toast.danger", () => {
    const { toast } = mounted();
    expect("error" in toast).toBe(false);
  });
});

describe("snapshot", () => {
  it("returns the same object until something changes", () => {
    const { store, toast } = mounted();
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);

    toast("Saved");
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(store.getSnapshot()).toBe(after);
  });

  it("stays the same object across a dismissal of an unknown id, and of nothing", () => {
    const { store, toast } = mounted();
    const empty = store.getSnapshot();
    toast.dismiss();
    expect(store.getSnapshot()).toBe(empty);

    toast("Saved");
    const shown = store.getSnapshot();
    toast.dismiss("missing");
    expect(store.getSnapshot()).toBe(shown);
  });

  it("serves an empty server snapshot that never changes", () => {
    const { store, toast } = mounted();
    const server = store.getServerSnapshot();
    toast("Saved");
    expect(store.getServerSnapshot()).toBe(server);
    expect(server).toEqual({ visible: [], queued: 0 });
  });
});

describe("subscribe", () => {
  it("notifies a listener on each change until it unsubscribes", () => {
    const { store, toast } = mounted();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const id = toast("Saved");
    expect(listener).toHaveBeenCalledTimes(1);
    toast.dismiss(id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    toast("Again");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not notify when nothing changed", () => {
    const { store, toast } = mounted();
    const listener = vi.fn();
    store.subscribe(listener);
    toast.dismiss("missing");
    toast.dismiss();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("queue", () => {
  it("shows at most three toasts and queues the rest", () => {
    const { store, toast } = mounted();
    for (const message of ["1", "2", "3", "4", "5"]) toast(message);
    expect(store.getSnapshot()).toMatchObject({ queued: 2 });
    expect(store.getSnapshot().visible.map((toast) => toast.message)).toEqual(["1", "2", "3"]);
  });

  it("shows the oldest queued toast when a visible one is dismissed", () => {
    const toaster = mounted();
    const { toast } = toaster;
    const first = toast("1");
    for (const message of ["2", "3", "4", "5"]) toast(message);

    toast.dismiss(first);
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    expect(toaster.store.getSnapshot().queued).toBe(1);
  });

  it("dismisses a queued toast without changing what is visible", () => {
    const toaster = mounted();
    const { toast } = toaster;
    for (const message of ["1", "2", "3"]) toast(message);
    const queued = toast("4");
    toast("5");

    toast.dismiss(queued);
    expect(messages(toaster)).toEqual(["1", "2", "3"]);
    expect(toaster.store.getSnapshot().queued).toBe(1);
    toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
    expect(messages(toaster)).toEqual(["2", "3", "5"]);
  });

  it("dismisses every toast, visible and queued, when no id is given", () => {
    const { store, toast } = mounted();
    for (const message of ["1", "2", "3", "4"]) toast(message);
    toast.dismiss();
    expect(store.getSnapshot()).toEqual({ visible: [], queued: 0 });
  });

  it("starts a queued toast's timer only when it becomes visible", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    const first = toast("1", { duration: 60_000 });
    toast("2", { duration: Infinity });
    toast("3", { duration: Infinity });
    toast("4", { duration: 1000 });

    vi.advanceTimersByTime(5000);
    expect(toaster.store.getSnapshot().queued).toBe(1);

    toast.dismiss(first);
    vi.advanceTimersByTime(999);
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["2", "3"]);
  });
});

describe("queue behind persistent toasts", () => {
  it("queues a toast behind three visible toasts while any of them is timed, persistent or not", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    toast("1");
    toast.danger("2");
    toast.danger("3");
    toast.danger("4");
    toast("5", { duration: Infinity });

    expect(messages(toaster)).toEqual(["1", "2", "3"]);
    expect(toaster.store.getSnapshot().queued).toBe(2);
  });

  it("dismisses the oldest of three persistent toasts to show a raised one", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    for (const message of ["1", "2", "3"]) toast.danger(message);
    toast("4");

    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    expect(toaster.store.getSnapshot().queued).toBe(0);
  });

  it("dismisses the oldest visible toast once for each persistent toast raised, in order", () => {
    const toaster = mounted();
    const { toast } = toaster;
    for (const message of ["1", "2", "3"]) toast.danger(message);
    toast.danger("4");
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    toast.danger("5");

    expect(messages(toaster)).toEqual(["3", "4", "5"]);
    expect(toaster.store.getSnapshot().queued).toBe(0);
  });

  it("queues behind a shown timed toast rather than dismissing another persistent one", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    for (const message of ["1", "2", "3"]) toast.danger(message);
    toast("4");
    toast("5");

    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    expect(toaster.store.getSnapshot().queued).toBe(1);
  });

  it("starts a promoted toast's timer when it is shown, not when it was raised", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    toast("1", { id: "one", duration: 60_000 });
    toast.danger("2");
    toast.danger("3");
    toast("4", { duration: 1000 });

    vi.advanceTimersByTime(5000);
    toast("1, failed", { id: "one", tone: "danger" });
    expect(messages(toaster)).toEqual(["2", "3", "4"]);

    vi.advanceTimersByTime(999);
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["2", "3"]);
  });

  it("dismisses the oldest persistent toast once a dismissal leaves only persistent ones showing", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    const first = toast("1");
    toast.danger("2");
    toast.danger("3");
    toast.danger("4");
    toast("5", { duration: 1000 });

    toast.dismiss(first);
    expect(messages(toaster)).toEqual(["3", "4", "5"]);
    expect(toaster.store.getSnapshot().queued).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(messages(toaster)).toEqual(["3", "4"]);
  });

  it("dismisses the oldest persistent toast once an expiry leaves only persistent ones showing", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    toast("1", { duration: 1000 });
    toast.danger("2");
    toast.danger("3");
    toast.danger("4");
    toast("5");
    const listener = vi.fn();
    store.subscribe(listener);

    vi.advanceTimersByTime(1000);
    expect(messages(toaster)).toEqual(["3", "4", "5"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("leaves what is visible alone when a queued toast is dismissed", () => {
    const toaster = mounted();
    const { toast } = toaster;
    toast("1");
    toast.danger("2");
    toast.danger("3");
    const queued = toast.danger("4");
    toast("5");

    toast.dismiss(queued);
    expect(messages(toaster)).toEqual(["1", "2", "3"]);
    expect(toaster.store.getSnapshot().queued).toBe(1);
  });

  it("counts a pending toast.promise as persistent and does not bring it back once it settles", async () => {
    const toaster = mounted();
    const { toast } = toaster;
    let resolve: (value: string) => void = () => {};
    toast.promise(
      new Promise<string>((done) => {
        resolve = done;
      }),
      { loading: "Saving", success: "Saved", error: "Failed" },
    );
    toast.danger("2");
    toast.danger("3");
    toast("4");
    expect(messages(toaster)).toEqual(["2", "3", "4"]);

    resolve("ok");
    await flush();
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
  });

  it("holds a promoted toast's timer while paused and gives it its whole duration on resume", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    for (const message of ["1", "2", "3"]) toast.danger(message);

    store.pause();
    toast("4", { duration: 1000 });
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    vi.advanceTimersByTime(10_000);
    expect(messages(toaster)).toEqual(["2", "3", "4"]);

    store.resume();
    vi.advanceTimersByTime(999);
    expect(messages(toaster)).toEqual(["2", "3", "4"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["2", "3"]);
  });

  it("notifies once per operation that dismisses to make room, and keeps the snapshot until then", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    for (const message of ["1", "2", "3"]) toast.danger(message);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    toast("4");
    expect(listener).toHaveBeenCalledTimes(1);
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(store.getSnapshot()).toBe(after);
    expect(after).toEqual({ visible: [expect.objectContaining({ message: "2" }), expect.anything(), expect.anything()], queued: 0 });
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe("update in place", () => {
  it("replaces the toast with the same id and keeps its position", () => {
    const toaster = mounted();
    const { toast } = toaster;
    toast("1");
    const id = toast("2", { id: "upload" });
    toast("3");

    expect(toast("2, done", { id, tone: "success" })).toBe("upload");
    expect(messages(toaster)).toEqual(["1", "2, done", "3"]);
    expect(toaster.store.getSnapshot().visible[1]?.tone).toBe("success");
  });

  it("updates a queued toast without making it visible", () => {
    const toaster = mounted();
    const { toast } = toaster;
    for (const message of ["1", "2", "3"]) toast(message);
    toast("4", { id: "late" });
    toast("4, changed", { id: "late" });
    expect(messages(toaster)).toEqual(["1", "2", "3"]);
    expect(toaster.store.getSnapshot().queued).toBe(1);

    toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
    expect(messages(toaster)).toEqual(["2", "3", "4, changed"]);
  });

  it("restarts the timer with the new duration", () => {
    useFakeTimers();
    const toaster = mounted();
    const { toast } = toaster;
    toast("Saving", { id: "save", duration: 1000 });
    vi.advanceTimersByTime(900);
    toast("Saved", { id: "save", duration: 1000 });
    vi.advanceTimersByTime(900);
    expect(messages(toaster)).toEqual(["Saved"]);
    vi.advanceTimersByTime(100);
    expect(messages(toaster)).toEqual([]);
  });

  it("raises a fresh toast when the id is not held", () => {
    const toaster = mounted();
    expect(toaster.toast("Hello", { id: "greeting" })).toBe("greeting");
    expect(toaster.store.getSnapshot().visible[0]?.id).toBe("greeting");
  });
});

describe("auto-dismiss", () => {
  it("dismisses a toast after the default five seconds", () => {
    useFakeTimers();
    const toaster = mounted();
    toaster.toast("Saved");
    vi.advanceTimersByTime(4999);
    expect(messages(toaster)).toEqual(["Saved"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual([]);
  });

  it("dismisses a toast after its own duration", () => {
    useFakeTimers();
    const toaster = mounted();
    toaster.toast("Quick", { duration: 200 });
    vi.advanceTimersByTime(200);
    expect(messages(toaster)).toEqual([]);
  });

  it("keeps a danger toast until it is dismissed", () => {
    useFakeTimers();
    const toaster = mounted();
    const id = toaster.toast.danger("Failed");
    expect(toaster.store.getSnapshot().visible[0]?.duration).toBe(Number.POSITIVE_INFINITY);
    vi.advanceTimersByTime(60_000);
    expect(messages(toaster)).toEqual(["Failed"]);
    toaster.toast.dismiss(id);
    expect(messages(toaster)).toEqual([]);
  });

  it("dismisses a danger toast given an explicit duration", () => {
    useFakeTimers();
    const toaster = mounted();
    toaster.toast.danger("Failed", { duration: 1000 });
    vi.advanceTimersByTime(1000);
    expect(messages(toaster)).toEqual([]);
  });

  it("keeps any toast with an Infinity duration", () => {
    useFakeTimers();
    const toaster = mounted();
    toaster.toast.success("Pinned", { duration: Infinity });
    vi.advanceTimersByTime(60_000);
    expect(messages(toaster)).toEqual(["Pinned"]);
  });

  it("keeps a toast whose duration is longer than a timer can wait", () => {
    useFakeTimers();
    const toaster = mounted();
    toaster.toast("Long", { duration: 2 ** 31 });
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["Long"]);
  });

  it("cancels a dismissed toast's timer", () => {
    useFakeTimers();
    const toaster = mounted();
    const id = toaster.toast("Saved", { id: "saved", duration: 1000 });
    toaster.toast.dismiss(id);
    toaster.toast("Again", { id: "saved", duration: 5000 });
    vi.advanceTimersByTime(1000);
    expect(messages(toaster)).toEqual(["Again"]);
  });
});

describe("pause and resume", () => {
  it("stops every visible timer and resumes each with the time it had left", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    toast("Short", { duration: 1000 });
    toast("Long", { duration: 3000 });
    toast("Pinned", { duration: Infinity });

    vi.advanceTimersByTime(600);
    store.pause();
    vi.advanceTimersByTime(10_000);
    expect(messages(toaster)).toEqual(["Short", "Long", "Pinned"]);

    store.resume();
    vi.advanceTimersByTime(399);
    expect(messages(toaster)).toEqual(["Short", "Long", "Pinned"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["Long", "Pinned"]);
    vi.advanceTimersByTime(1999);
    expect(messages(toaster)).toEqual(["Long", "Pinned"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual(["Pinned"]);
  });

  it("accumulates elapsed time across several pauses", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    toast("Saved", { duration: 1000 });

    vi.advanceTimersByTime(400);
    store.pause();
    store.resume();
    vi.advanceTimersByTime(400);
    store.pause();
    store.resume();
    vi.advanceTimersByTime(199);
    expect(messages(toaster)).toEqual(["Saved"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual([]);
  });

  it("ignores a second pause and a resume with nothing paused", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    store.resume();
    toast("Saved", { duration: 1000 });

    vi.advanceTimersByTime(500);
    store.pause();
    vi.advanceTimersByTime(300);
    store.pause();
    store.resume();
    vi.advanceTimersByTime(499);
    expect(messages(toaster)).toEqual(["Saved"]);
    vi.advanceTimersByTime(1);
    expect(messages(toaster)).toEqual([]);
  });

  it("holds the timer of a toast raised, updated or promoted while paused until resume", () => {
    useFakeTimers();
    const toaster = mounted();
    const { store, toast } = toaster;
    const first = toast("1", { duration: 60_000 });
    toast("2", { duration: Infinity });
    toast("3", { id: "three", duration: Infinity });
    toast("4", { duration: 1000 });

    store.pause();
    toast.dismiss(first);
    toast("3, updated", { id: "three", duration: 1000 });
    vi.advanceTimersByTime(5000);
    expect(messages(toaster)).toEqual(["2", "3, updated", "4"]);

    store.resume();
    vi.advanceTimersByTime(1000);
    expect(messages(toaster)).toEqual(["2"]);
  });
});

describe("toast.promise", () => {
  it("returns the id of a persistent loading toast synchronously, never the promise", () => {
    const { store, toast } = mounted();
    const id = toast.promise(new Promise<never>(() => {}), { loading: "Saving", success: "Saved", error: "Failed" });

    expect(typeof id).toBe("string");
    expect(store.getSnapshot().visible).toEqual([
      expect.objectContaining({ id, message: "Saving", tone: "neutral", duration: Number.POSITIVE_INFINITY }),
    ]);
  });

  it("updates the same toast to a success message on fulfilment", async () => {
    const { store, toast } = mounted();
    const id = toast.promise(Promise.resolve(3), { loading: "Saving", success: "Saved", error: "Failed" });
    await flush();
    expect(store.getSnapshot().visible).toEqual([expect.objectContaining({ id, message: "Saved", tone: "success", duration: 5000 })]);
  });

  it("formats the success message from the fulfilled value", async () => {
    const toaster = mounted();
    toaster.toast.promise(Promise.resolve(3), {
      loading: "Saving",
      success: (count) => `Saved ${count} files`,
      error: "Failed",
    });
    await flush();
    expect(messages(toaster)).toEqual(["Saved 3 files"]);
  });

  it("updates the same toast to a persistent danger message on rejection", async () => {
    useFakeTimers();
    const { store, toast } = mounted();
    const id = toast.promise(Promise.reject(new Error("offline")), {
      loading: "Saving",
      success: "Saved",
      error: "Failed",
    });
    await flush();
    vi.advanceTimersByTime(60_000);
    expect(store.getSnapshot().visible).toEqual([
      expect.objectContaining({ id, message: "Failed", tone: "danger", duration: Number.POSITIVE_INFINITY }),
    ]);
  });

  it("formats the error message from the rejection reason", async () => {
    const toaster = mounted();
    toaster.toast.promise(Promise.reject(new Error("offline")), {
      loading: "Saving",
      success: "Saved",
      error: (reason) => `Failed: ${(reason as Error).message}`,
    });
    await flush();
    expect(messages(toaster)).toEqual(["Failed: offline"]);
  });

  it("keeps the update in the toast's position", async () => {
    const toaster = mounted();
    toaster.toast("Before");
    toaster.toast.promise(Promise.resolve(), { loading: "Saving", success: "Saved", error: "Failed" });
    toaster.toast("After");
    await flush();
    expect(messages(toaster)).toEqual(["Before", "Saved", "After"]);
  });

  it("does not bring back a toast dismissed before the promise settles", async () => {
    const toaster = mounted();
    const fulfilled = toaster.toast.promise(Promise.resolve(), { loading: "A", success: "A done", error: "A failed" });
    const rejected = toaster.toast.promise(Promise.reject(new Error("x")), {
      loading: "B",
      success: "B done",
      error: "B failed",
    });
    toaster.toast.dismiss(fulfilled);
    toaster.toast.dismiss(rejected);
    await flush();
    expect(toaster.store.getSnapshot()).toEqual({ visible: [], queued: 0 });
  });

  it("raises no unhandled rejection of its own for a rejected promise", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const { toast } = mounted();
      toast.promise(Promise.reject(new Error("offline")), { loading: "Saving", success: "Saved", error: "Failed" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("accepts a thenable that is not a native promise", async () => {
    const toaster = mounted();
    const thenable: PromiseLike<string> = {
      // biome-ignore lint/suspicious/noThenProperty: the test needs a non-native thenable
      then: (onFulfilled) => Promise.resolve("ok").then(onFulfilled),
    };
    toaster.toast.promise(thenable, { loading: "Loading", success: (value) => value, error: "Failed" });
    await flush();
    await flush();
    expect(messages(toaster)).toEqual(["ok"]);
  });
});

describe("regions", () => {
  it("drops a toast raised with no region, returns its id and warns once per toaster", () => {
    const { store, toast } = createToaster();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(toast("Saved", { id: "saved" })).toBe("saved");
    expect(typeof toast.success("Again")).toBe("string");
    toast.dismiss("saved");

    expect(store.getSnapshot()).toEqual({ visible: [], queued: 0 });
    expect(listener).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/ToastRegion/);

    createToaster().toast("Elsewhere");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("stays silent about a missing region in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    createToaster().toast("Saved");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once, without throwing, when there is no process global", () => {
    vi.stubGlobal("process", undefined);
    try {
      const { toast } = createToaster();
      expect(() => toast("Saved")).not.toThrow();
      toast("Again");
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("warns when process has no env", () => {
    vi.stubGlobal("process", {});
    try {
      createToaster().toast("Saved");
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not replay a toast raised before the region registered", () => {
    const { store, toast } = createToaster();
    toast("Too early");
    store.registerRegion();
    expect(store.getSnapshot().visible).toEqual([]);
    toast("On time");
    expect(store.getSnapshot().visible.map((toast) => toast.message)).toEqual(["On time"]);
  });

  it("drops every toast and timer when the last region unregisters", () => {
    useFakeTimers();
    const { store, toast } = createToaster();
    const unregister = store.registerRegion();
    for (const message of ["1", "2", "3", "4"]) toast(message);

    unregister();
    expect(store.getSnapshot()).toEqual({ visible: [], queued: 0 });
    expect(vi.getTimerCount()).toBe(0);
    toast("After");
    expect(store.getSnapshot().visible).toEqual([]);
  });

  it("warns on each region registered beside an existing one, and allows it", () => {
    const { store, toast } = createToaster();
    const first = store.registerRegion();
    expect(warn).not.toHaveBeenCalled();

    const second = store.registerRegion();
    const third = store.registerRegion();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toMatch(/second ToastRegion/);

    first();
    second();
    toast("Still shown");
    expect(store.getSnapshot().visible).toHaveLength(1);
    third();
    expect(store.getSnapshot().visible).toEqual([]);
  });

  it("stays silent about a second region in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { store } = createToaster();
    store.registerRegion();
    store.registerRegion();
    expect(warn).not.toHaveBeenCalled();
  });

  it("counts an unregister function called twice once", () => {
    const { store, toast } = createToaster();
    const first = store.registerRegion();
    store.registerRegion();
    first();
    first();
    toast("Shown");
    expect(store.getSnapshot().visible).toHaveLength(1);
  });
});

describe("default toaster", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("is not created by importing the module", async () => {
    const module = await import("./toaster.js");
    expect(module.peekDefaultToaster()).toBeUndefined();
  });

  it("is created by the first toast call and reused by every later one", async () => {
    const { toast, getDefaultToaster, peekDefaultToaster } = await import("./toaster.js");
    toast("Dropped");
    const created = peekDefaultToaster();
    expect(created).toBeDefined();
    expect(getDefaultToaster()).toBe(created);

    created?.store.registerRegion();
    toast.info("Shown");
    toast.dismiss();
    toast.success("Done");
    expect(getDefaultToaster()).toBe(created);
    expect(created?.store.getSnapshot().visible).toEqual([expect.objectContaining({ message: "Done" })]);
  });

  it("is created by getDefaultToaster, and its toast is the exported toast", async () => {
    const { toast, getDefaultToaster, peekDefaultToaster } = await import("./toaster.js");
    const toaster = getDefaultToaster();
    expect(peekDefaultToaster()).toBe(toaster);
    expect(toaster.toast).toBe(toast);
  });

  it("is independent of a toaster made with createToaster", async () => {
    const { toast, createToaster: create, getDefaultToaster } = await import("./toaster.js");
    getDefaultToaster().store.registerRegion();
    const other = create();
    other.store.registerRegion();

    toast.warning("Default");
    const id = toast.promise(Promise.resolve(), { loading: "Saving", success: "Saved", error: "Failed" });
    expect(other.store.getSnapshot().visible).toEqual([]);
    expect(
      getDefaultToaster()
        .store.getSnapshot()
        .visible.map((t) => t.id),
    ).toContain(id);
  });
});
