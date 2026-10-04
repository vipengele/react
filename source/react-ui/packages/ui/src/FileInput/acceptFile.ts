/**
 * Why a file was turned away before it could upload. The component maps each code to a string
 * prop with an English default.
 *
 * - `directory` — the file is a dropped folder: size 0 and no MIME type.
 * - `type` — it matches none of `accept`'s extensions, MIME types or wildcards.
 * - `size` — it is larger than `maxSize` bytes.
 * - `count` — accepting it would exceed `maxFiles`, or it is not the first file of a
 *   multi-file add while `multiple` is off.
 */
export type FileRejectionReason = "directory" | "type" | "size" | "count";

/** The filters a file passes before it may upload. Every one is optional; an absent filter
 * accepts everything. */
export interface FileFilter {
  /** The native `accept` grammar: a comma-separated list of extensions (`.png`), MIME types
   * (`image/png`) and MIME wildcards (`image/*`), matched case-insensitively. */
  accept?: string;
  /** The largest size a file may have, in bytes. */
  maxSize?: number;
  /** The most rows that may be uploading or done at once. */
  maxFiles?: number;
}

/**
 * Whether a file is a dropped directory. A drop hands a folder over as a `File` with size 0 and an
 * empty type, which no upload can read, so it is never sent. An empty file with no recognisable
 * type is indistinguishable from it and is rejected the same way.
 */
export function isDirectory(file: File): boolean {
  return file.size === 0 && file.type === "";
}

/** Whether a file matches the `accept` list. An absent or blank list accepts every file. */
export function matchesAccept(file: File, accept: string | undefined): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

/** Whether a file is larger than `maxSize` bytes. An absent `maxSize` admits every size. */
export function exceedsMaxSize(file: File, maxSize: number | undefined): boolean {
  return maxSize !== undefined && file.size > maxSize;
}

/** Whether one more row would exceed `maxFiles`, given how many rows are uploading or done. */
export function exceedsMaxFiles(activeCount: number, maxFiles: number | undefined): boolean {
  return maxFiles !== undefined && activeCount >= maxFiles;
}

/**
 * The reason a file is rejected, or `null` when it may upload. `activeCount` is the number of rows
 * already uploading or done, including files accepted earlier in the same add. A directory is
 * reported as such before its empty type can fail `accept`.
 */
export function rejectionReason(file: File, filter: FileFilter, activeCount: number): FileRejectionReason | null {
  if (isDirectory(file)) return "directory";
  if (!matchesAccept(file, filter.accept)) return "type";
  if (exceedsMaxSize(file, filter.maxSize)) return "size";
  if (exceedsMaxFiles(activeCount, filter.maxFiles)) return "count";
  return null;
}
