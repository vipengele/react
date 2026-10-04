import { act, renderHook } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { type FileUploadContext, type UseFileUploadsOptions, useFileUploads } from "./useFileUploads.js";

interface PendingUpload {
  file: File;
  context: FileUploadContext;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** An `upload` whose calls stay pending until the test settles them. It ignores the abort signal,
 * the way a careless transport would. */
function controlledUpload() {
  const calls: PendingUpload[] = [];
  const upload = vi.fn((file: File, context: FileUploadContext) => {
    return new Promise<unknown>((resolve, reject) => {
      calls.push({ file, context, resolve, reject });
    });
  });
  return { upload, calls };
}

function file(name: string, type = "text/plain", size = 4): File {
  return new File(["x".repeat(size)], name, { type });
}

function setup(options: Partial<UseFileUploadsOptions> = {}, wrapper?: (props: { children: ReactNode }) => ReactNode) {
  const transport = controlledUpload();
  const onChange = vi.fn();
  const onReject = vi.fn();
  const hook = renderHook(
    (props: Partial<UseFileUploadsOptions>) => useFileUploads({ upload: transport.upload, onChange, onReject, ...props }),
    {
      initialProps: options,
      wrapper,
    },
  );
  return { ...transport, onChange, onReject, hook };
}

/** Lets pending promise reactions run inside `act`, so the state they set is flushed. */
async function flush() {
  await act(async () => {});
}

function call(calls: PendingUpload[], index: number): PendingUpload {
  const pending = calls[index];
  if (pending === undefined) throw new Error(`no upload call at index ${index}`);
  return pending;
}

describe("useFileUploads", () => {
  it("starts with no rows", () => {
    const { hook } = setup();
    expect(hook.result.current.entries).toEqual([]);
  });

  it("appends each accepted file as an uploading row with indeterminate progress, and starts its upload synchronously", () => {
    const { hook, upload, onChange } = setup();
    const a = file("a.txt");
    act(() => hook.result.current.addFiles([a]));

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0]).toBe(a);
    expect(hook.result.current.entries).toEqual([{ id: expect.any(String), file: a, status: "uploading", progress: null }]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(hook.result.current.entries);
  });

  it("appends a later add after the rows already there", () => {
    const { hook } = setup();
    act(() => hook.result.current.addFiles([file("a.txt")]));
    act(() => hook.result.current.addFiles([file("b.txt"), file("c.txt")]));
    expect(hook.result.current.entries.map((entry) => entry.file.name)).toEqual(["a.txt", "b.txt", "c.txt"]);
  });

  it("accepts a FileList-like array", () => {
    const { hook } = setup();
    const list: ArrayLike<File> = { length: 1, 0: file("a.txt") };
    act(() => hook.result.current.addFiles(list));
    expect(hook.result.current.entries).toHaveLength(1);
  });

  it("does nothing for an empty add", () => {
    const { hook, onChange, onReject } = setup();
    act(() => hook.result.current.addFiles([]));
    expect(hook.result.current.entries).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("gives the same file added twice two rows with distinct ids, and uploads it twice", () => {
    const { hook, upload } = setup();
    const a = file("a.txt");
    act(() => hook.result.current.addFiles([a]));
    act(() => hook.result.current.addFiles([a]));
    const [first, second] = hook.result.current.entries;
    expect(first?.file).toBe(a);
    expect(second?.file).toBe(a);
    expect(first?.id).not.toBe(second?.id);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("gives two hooks distinct row ids", () => {
    const one = setup();
    const two = setup();
    act(() => one.hook.result.current.addFiles([file("a.txt")]));
    act(() => two.hook.result.current.addFiles([file("a.txt")]));
    expect(one.hook.result.current.entries[0]?.id).not.toBe(two.hook.result.current.entries[0]?.id);
  });

  describe("rejection", () => {
    it.each([
      ["an extension", ".png", file("a.txt")],
      ["a MIME type", "image/png", file("a.txt")],
      ["a wildcard", "image/*", file("a.txt")],
    ])("rejects a file that fails accept given as %s, without uploading it", (_label, accept, rejected) => {
      const { hook, upload, onChange, onReject } = setup({ accept });
      act(() => hook.result.current.addFiles([rejected]));

      expect(upload).not.toHaveBeenCalled();
      const expected = { id: expect.any(String), file: rejected, status: "rejected", reason: "type", progress: null };
      expect(hook.result.current.entries).toEqual([expected]);
      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledWith([expected]);
      expect(onChange).toHaveBeenCalledWith([expected]);
    });

    it.each([
      ["an extension", ".png", file("a.png", "image/png")],
      ["a MIME type", "image/png", file("a.png", "image/png")],
      ["a wildcard", "image/*", file("a.webp", "image/webp")],
    ])("uploads a file that passes accept given as %s", (_label, accept, accepted) => {
      const { hook, upload, onReject } = setup({ accept });
      act(() => hook.result.current.addFiles([accepted]));
      expect(upload).toHaveBeenCalledTimes(1);
      expect(hook.result.current.entries[0]?.status).toBe("uploading");
      expect(onReject).not.toHaveBeenCalled();
    });

    it("rejects a file larger than maxSize", () => {
      const { hook, upload } = setup({ maxSize: 3 });
      act(() => hook.result.current.addFiles([file("big.txt", "text/plain", 4), file("small.txt", "text/plain", 3)]));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["rejected", "uploading"]);
      expect(hook.result.current.entries[0]).toMatchObject({ reason: "size" });
      expect(upload).toHaveBeenCalledTimes(1);
    });

    it("rejects a dropped directory", () => {
      const { hook, upload } = setup();
      act(() => hook.result.current.addFiles([file("folder", "", 0)]));
      expect(hook.result.current.entries[0]).toMatchObject({ status: "rejected", reason: "directory" });
      expect(upload).not.toHaveBeenCalled();
    });

    it("rejects files beyond maxFiles, counting files accepted earlier in the same add", () => {
      const { hook, onReject } = setup({ maxFiles: 2 });
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt"), file("c.txt")]));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["uploading", "uploading", "rejected"]);
      expect(onReject).toHaveBeenCalledWith([expect.objectContaining({ reason: "count" })]);
    });

    it("counts uploading and done rows towards maxFiles, but not rejected or failed ones", async () => {
      const { hook, calls } = setup({ maxFiles: 2, accept: ".txt" });
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt"), file("c.png", "image/png")]));
      await act(async () => {
        call(calls, 0).resolve("ok");
        call(calls, 1).reject(new Error("offline"));
      });
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["done", "failed", "rejected"]);

      act(() => hook.result.current.addFiles([file("d.txt"), file("e.txt")]));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["done", "failed", "rejected", "uploading", "rejected"]);
    });

    it("frees a maxFiles slot when a row is removed", () => {
      const { hook } = setup({ maxFiles: 1 });
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      act(() => hook.result.current.addFiles([file("b.txt")]));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["uploading"]);
    });

    it("takes the first file of a multi-file add and rejects the rest when multiple is off", () => {
      const { hook, upload, onReject } = setup({ multiple: false });
      const [a, b, c] = [file("a.txt"), file("b.txt"), file("c.txt")];
      act(() => hook.result.current.addFiles([a, b, c]));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["uploading", "rejected", "rejected"]);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload.mock.calls[0]?.[0]).toBe(a);
      expect(onReject).toHaveBeenCalledWith([
        expect.objectContaining({ file: b, reason: "count" }),
        expect.objectContaining({ file: c, reason: "count" }),
      ]);
    });

    it("still filters the first file when multiple is off", () => {
      const { hook, upload } = setup({ multiple: false, accept: "image/*" });
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.png", "image/png")]));
      expect(hook.result.current.entries).toMatchObject([
        { status: "rejected", reason: "type" },
        { status: "rejected", reason: "count" },
      ]);
      expect(upload).not.toHaveBeenCalled();
    });

    it("reads the latest filter props", () => {
      const { hook } = setup({ accept: ".png" });
      hook.rerender({ accept: ".txt" });
      act(() => hook.result.current.addFiles([file("a.txt")]));
      expect(hook.result.current.entries[0]?.status).toBe("uploading");
    });
  });

  describe("settlement", () => {
    it("marks a resolved upload done with its result and full progress", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      await act(async () => call(calls, 0).resolve({ url: "/files/a" }));

      expect(hook.result.current.entries[0]).toMatchObject({ status: "done", progress: 1, result: { url: "/files/a" } });
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith(hook.result.current.entries);
    });

    it("marks a rejected upload failed with the error's message and its last progress", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => call(calls, 0).context.onProgress(0.4));
      await act(async () => call(calls, 0).reject(new Error("Network down")));

      expect(hook.result.current.entries[0]).toMatchObject({ status: "failed", progress: 0.4, error: "Network down" });
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it("stringifies a rejection that is not an Error", async () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      await act(async () => call(calls, 0).reject("quota exceeded"));
      expect(hook.result.current.entries[0]).toMatchObject({ status: "failed", progress: null, error: "quota exceeded" });
    });

    it("treats a synchronous throw from upload as a failure", async () => {
      const upload = vi.fn(() => {
        throw new Error("bad config");
      });
      const { result } = renderHook(() => useFileUploads({ upload }));
      act(() => result.current.addFiles([file("a.txt")]));
      expect(upload).toHaveBeenCalledTimes(1);
      await flush();
      expect(result.current.entries[0]).toMatchObject({ status: "failed", error: "bad config" });
    });

    it("settles each row independently", async () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      await act(async () => call(calls, 1).resolve("b"));
      expect(hook.result.current.entries.map((entry) => entry.status)).toEqual(["uploading", "done"]);
    });

    it("calls the latest onChange and upload", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      const laterOnChange = vi.fn();
      const later = controlledUpload();
      hook.rerender({ onChange: laterOnChange, upload: later.upload });

      await act(async () => call(calls, 0).resolve("ok"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(laterOnChange).toHaveBeenCalledTimes(1);

      act(() => hook.result.current.addFiles([file("b.txt")]));
      expect(later.upload).toHaveBeenCalledTimes(1);
    });

    it("works without onChange or onReject", async () => {
      const { upload, calls } = controlledUpload();
      const { result } = renderHook(() => useFileUploads({ upload, accept: ".txt" }));
      act(() => result.current.addFiles([file("a.txt"), file("b.png", "image/png")]));
      await act(async () => call(calls, 0).resolve("ok"));
      expect(result.current.entries.map((entry) => entry.status)).toEqual(["done", "rejected"]);
    });
  });

  describe("progress", () => {
    it("records reported progress without calling onChange", () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => call(calls, 0).context.onProgress(0.25));
      act(() => call(calls, 0).context.onProgress(0.5));
      expect(hook.result.current.entries[0]?.progress).toBe(0.5);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("records a first report of zero as determinate", () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => call(calls, 0).context.onProgress(0));
      expect(hook.result.current.entries[0]?.progress).toBe(0);
    });

    it("never moves progress backwards", () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      const { onProgress } = call(calls, 0).context;
      act(() => onProgress(0.6));
      act(() => onProgress(0.3));
      act(() => onProgress(0.6));
      expect(hook.result.current.entries[0]?.progress).toBe(0.6);
    });

    it("clamps progress into 0..1 and ignores NaN", () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      const { onProgress } = call(calls, 0).context;
      act(() => onProgress(-1));
      expect(hook.result.current.entries[0]?.progress).toBe(0);
      act(() => onProgress(Number.NaN));
      expect(hook.result.current.entries[0]?.progress).toBe(0);
      act(() => onProgress(3));
      expect(hook.result.current.entries[0]?.progress).toBe(1);
    });

    it("updates only the reporting row", () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      act(() => call(calls, 1).context.onProgress(0.5));
      expect(hook.result.current.entries.map((entry) => entry.progress)).toEqual([null, 0.5]);
    });

    it("ignores a progress tick after the upload settles", async () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => call(calls, 0).context.onProgress(0.2));
      await act(async () => call(calls, 0).reject(new Error("x")));
      act(() => call(calls, 0).context.onProgress(0.9));
      expect(hook.result.current.entries[0]).toMatchObject({ status: "failed", progress: 0.2 });
    });
  });

  describe("removal", () => {
    it("removes a row and reports the shorter list", () => {
      const { hook, onChange } = setup({ accept: ".txt" });
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.png", "image/png")]));
      const [uploading, rejected] = hook.result.current.entries;
      act(() => hook.result.current.removeFile(rejected?.id ?? ""));
      expect(hook.result.current.entries).toEqual([uploading]);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith([uploading]);
    });

    it("aborts the signal of an upload removed while in flight", () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      expect(call(calls, 0).context.signal.aborted).toBe(true);
      expect(call(calls, 1).context.signal.aborted).toBe(false);
    });

    it("removes a settled row without aborting its signal", async () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      await act(async () => call(calls, 0).resolve("ok"));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      expect(hook.result.current.entries).toEqual([]);
      expect(call(calls, 0).context.signal.aborted).toBe(false);
    });

    it("drops a late settlement and progress tick for a removed row whose transport ignores the abort", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      const remaining = hook.result.current.entries;
      onChange.mockClear();

      act(() => call(calls, 0).context.onProgress(0.5));
      await act(async () => call(calls, 0).resolve("late"));
      expect(hook.result.current.entries).toBe(remaining);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("drops a late failure for a removed row", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      onChange.mockClear();
      await act(async () => call(calls, 0).reject(new Error("aborted")));
      expect(hook.result.current.entries).toEqual([]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores removal of an unknown id", () => {
      const { hook, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt")]));
      const before = hook.result.current.entries;
      act(() => hook.result.current.removeFile("missing"));
      expect(hook.result.current.entries).toBe(before);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("unmount", () => {
    it("aborts every in-flight upload", async () => {
      const { hook, calls } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      await act(async () => call(calls, 1).resolve("ok"));
      hook.unmount();
      expect(call(calls, 0).context.signal.aborted).toBe(true);
      expect(call(calls, 1).context.signal.aborted).toBe(false);
    });

    it("drops a late settlement and progress tick after unmount when the transport ignores the abort", async () => {
      const { hook, calls, onChange } = setup();
      act(() => hook.result.current.addFiles([file("a.txt"), file("b.txt")]));
      hook.unmount();
      onChange.mockClear();

      call(calls, 0).context.onProgress(0.5);
      call(calls, 0).resolve("late");
      call(calls, 1).reject(new Error("late"));
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("StrictMode", () => {
    const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

    it("does not cancel uploads through the simulated unmount and remount", async () => {
      const { hook, calls, onChange } = setup({}, strict);
      act(() => hook.result.current.addFiles([file("a.txt")]));
      expect(calls).toHaveLength(1);
      expect(call(calls, 0).context.signal.aborted).toBe(false);

      act(() => call(calls, 0).context.onProgress(0.5));
      expect(hook.result.current.entries[0]?.progress).toBe(0.5);
      await act(async () => call(calls, 0).resolve("ok"));
      expect(hook.result.current.entries[0]).toMatchObject({ status: "done", result: "ok" });
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it("calls onChange and onReject once per change", () => {
      const { hook, onChange, onReject } = setup({ accept: ".txt" }, strict);
      act(() => hook.result.current.addFiles([file("a.png", "image/png")]));
      act(() => hook.result.current.removeFile(hook.result.current.entries[0]?.id ?? ""));
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("still aborts in-flight uploads on a real unmount", () => {
      const { hook, calls } = setup({}, strict);
      act(() => hook.result.current.addFiles([file("a.txt")]));
      hook.unmount();
      expect(call(calls, 0).context.signal.aborted).toBe(true);
    });
  });
});
