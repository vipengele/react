import type { FileInputProps } from "./FileInput.js";
import type { FileUploadEntry } from "./useFileUploads.js";

interface FileInputAnnouncerProps extends Pick<FileInputProps, "doneAnnouncement" | "failedAnnouncement"> {
  entries: readonly FileUploadEntry[];
}

/**
 * A `FileInput`'s hidden status region: one message per settled row, derived from the rows on
 * every render, so a message is added exactly once, when its row settles.
 */
export function FileInputAnnouncer({
  entries,
  doneAnnouncement = (fileName) => `${fileName} uploaded`,
  failedAnnouncement = (fileName, error) => `${fileName} failed to upload: ${error}`,
}: FileInputAnnouncerProps) {
  return (
    // `role="status"` implies `aria-atomic="true"`, which would re-read every message on each
    // addition; off, a screen reader reads only the message just added.
    <div className="vpg-file-input-announcer" role="status" aria-atomic="false">
      {entries.map((entry) =>
        entry.status === "done" ? (
          <span key={entry.id}>{doneAnnouncement(entry.file.name)}</span>
        ) : entry.status === "failed" ? (
          <span key={entry.id}>{failedAnnouncement(entry.file.name, entry.error)}</span>
        ) : null,
      )}
    </div>
  );
}
