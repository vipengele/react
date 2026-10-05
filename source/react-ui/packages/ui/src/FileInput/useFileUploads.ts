import { useCallback, useEffect, useId, useRef, useState } from "react";
import { type FileFilter, type FileRejectionReason, rejectionReason } from "./acceptFile.js";

/** What the component hands the consumer's `upload` function alongside the file. */
export interface FileUploadContext {
  /** Reports how much of the file has been sent, as a fraction from 0 to 1. Values outside that
   * range are clamped, and a value below the last one reported is ignored, so the row's progress
   * never moves backwards. Never calling it leaves the row's progress indeterminate. */
  onProgress: (fraction: number) => void;
  /** Aborted when the row is removed or the component unmounts. A transport that ignores it is
   * still safe: a settlement or progress tick after either is dropped. */
  signal: AbortSignal;
}

/** Sends one file. Resolving marks the row done and stores the value as its `result`; rejecting
 * marks it failed with the rejection's message. */
export type FileUploader = (file: File, context: FileUploadContext) => Promise<unknown>;

export type FileUploadStatus = "rejected" | "uploading" | "done" | "failed";

interface FileUploadEntryBase {
  /** Unique per row, so the same file added twice is two rows. */
  id: string;
  file: File;
  /** The fraction of the file sent, from 0 to 1, or `null` while indeterminate: the upload has
   * not reported progress, or the file was rejected and never uploads. */
  progress: number | null;
}

/** A file that failed `accept`, `maxSize`, `maxFiles` or `multiple`. It never uploads. */
export interface RejectedFileEntry extends FileUploadEntryBase {
  status: "rejected";
  reason: FileRejectionReason;
  progress: null;
}

export interface UploadingFileEntry extends FileUploadEntryBase {
  status: "uploading";
}

/** An upload that resolved. Its progress is 1. */
export interface DoneFileEntry extends FileUploadEntryBase {
  status: "done";
  /** The value the upload resolved with. */
  result: unknown;
}

/** An upload that rejected. Its progress is the last value reported before it failed. */
export interface FailedFileEntry extends FileUploadEntryBase {
  status: "failed";
  /** The rejection's message: an `Error`'s `message`, or any other value converted to a string. */
  error: string;
}

export type FileUploadEntry = RejectedFileEntry | UploadingFileEntry | DoneFileEntry | FailedFileEntry;

export interface UseFileUploadsOptions extends FileFilter {
  upload: FileUploader;
  /** Off, an add of several files takes the first and rejects the rest with `count`. Defaults to
   * `true`. */
  multiple?: boolean;
  /** Called with the whole list after an add, a status change or a removal — never per progress
   * tick. */
  onChange?: (entries: readonly FileUploadEntry[]) => void;
  /** Called once per add that rejects any file, with the rejected rows. */
  onReject?: (rejected: readonly RejectedFileEntry[]) => void;
}

export interface UseFileUploadsResult {
  entries: readonly FileUploadEntry[];
  /** Appends the files as rows and starts each accepted file's upload immediately. Call it from
   * the event handler that received the files, never from an effect. */
  addFiles: (files: Iterable<File> | ArrayLike<File>) => void;
  /** Removes a row and aborts its upload if it is still in flight. */
  removeFile: (id: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The upload state behind `FileInput`: an uncontrolled list of rows, each a rejected file or an
 * upload the hook drives through the consumer's `upload` function.
 *
 * The list lives in a ref as well as in state. Every change computes the next list from the ref,
 * writes both, and then calls `onChange` with that list — outside any state updater, which
 * StrictMode invokes twice.
 *
 * A row's `AbortController` sits in a ref map for exactly as long as its upload is in flight.
 * Removal and unmount abort it and take it out of the map, and every settlement and progress tick
 * checks the map first, so a late one for a row that is gone is dropped even when the transport
 * ignores the signal. Uploads start in `addFiles`, never in an effect, so StrictMode's simulated
 * unmount and remount runs before any upload exists and has nothing to cancel.
 */
export function useFileUploads(options: UseFileUploadsOptions): UseFileUploadsResult {
  const [entries, setEntries] = useState<readonly FileUploadEntry[]>([]);
  const entriesRef = useRef<readonly FileUploadEntry[]>(entries);
  const controllersRef = useRef(new Map<string, AbortController>());
  const nextIdRef = useRef(0);
  const idPrefix = useId();

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  const commit = useCallback((next: readonly FileUploadEntry[], notify: boolean) => {
    entriesRef.current = next;
    setEntries(next);
    if (notify) optionsRef.current.onChange?.(next);
  }, []);

  const replaceEntry = useCallback(
    (id: string, replace: (entry: FileUploadEntry) => FileUploadEntry | undefined, notify: boolean) => {
      let changed = false;
      const next = entriesRef.current.map((entry) => {
        if (entry.id !== id) return entry;
        const replacement = replace(entry);
        if (replacement === undefined) return entry;
        changed = true;
        return replacement;
      });
      if (changed) commit(next, notify);
    },
    [commit],
  );

  const settle = useCallback(
    (id: string, settled: (entry: FileUploadEntry) => FileUploadEntry) => {
      if (!controllersRef.current.delete(id)) return;
      replaceEntry(id, settled, true);
    },
    [replaceEntry],
  );

  const reportProgress = useCallback(
    (id: string, fraction: number) => {
      if (!controllersRef.current.has(id) || Number.isNaN(fraction)) return;
      const clamped = Math.min(1, Math.max(0, fraction));
      // A row holds a controller only while it is uploading, so the row being replaced is an
      // uploading one.
      replaceEntry(
        id,
        ({ file, progress }) =>
          progress !== null && clamped <= progress ? undefined : { id, file, status: "uploading", progress: clamped },
        false,
      );
    },
    [replaceEntry],
  );

  const addFiles = useCallback(
    (files: Iterable<File> | ArrayLike<File>) => {
      const { multiple = true, accept, maxSize, maxFiles, upload, onReject } = optionsRef.current;
      const added = Array.from(files);
      if (added.length === 0) return;

      let activeCount = entriesRef.current.filter((entry) => entry.status === "uploading" || entry.status === "done").length;
      const rows: FileUploadEntry[] = [];
      const rejected: RejectedFileEntry[] = [];
      const started: Array<{ id: string; file: File; controller: AbortController }> = [];

      added.forEach((file, index) => {
        const id = `${idPrefix}${nextIdRef.current++}`;
        const reason = !multiple && index > 0 ? "count" : rejectionReason(file, { accept, maxSize, maxFiles }, activeCount);
        if (reason !== null) {
          const row: RejectedFileEntry = { id, file, status: "rejected", reason, progress: null };
          rows.push(row);
          rejected.push(row);
          return;
        }
        activeCount++;
        rows.push({ id, file, status: "uploading", progress: null });
        const controller = new AbortController();
        controllersRef.current.set(id, controller);
        started.push({ id, file, controller });
      });

      commit([...entriesRef.current, ...rows], true);
      if (rejected.length > 0) onReject?.(rejected);

      for (const { id, file, controller } of started) {
        // The executor runs synchronously, so the upload starts inside this handler, and a
        // synchronous throw from `upload` becomes a rejection like any other failure.
        new Promise<unknown>((resolve) => {
          resolve(upload(file, { onProgress: (fraction) => reportProgress(id, fraction), signal: controller.signal }));
        }).then(
          (result) => settle(id, () => ({ id, file, status: "done", progress: 1, result })),
          (error: unknown) => settle(id, (entry) => ({ id, file, status: "failed", progress: entry.progress, error: errorMessage(error) })),
        );
      }
    },
    [commit, idPrefix, reportProgress, settle],
  );

  const removeFile = useCallback(
    (id: string) => {
      const next = entriesRef.current.filter((entry) => entry.id !== id);
      if (next.length === entriesRef.current.length) return;
      controllersRef.current.get(id)?.abort();
      controllersRef.current.delete(id);
      commit(next, true);
    },
    [commit],
  );

  return { entries, addFiles, removeFile };
}
