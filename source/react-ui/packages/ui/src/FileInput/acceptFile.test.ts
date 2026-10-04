import { describe, expect, it } from "vitest";
import { exceedsMaxFiles, exceedsMaxSize, isDirectory, matchesAccept, rejectionReason } from "./acceptFile.js";

function file(name: string, type: string, size = 4): File {
  return new File(["x".repeat(size)], name, { type });
}

describe("matchesAccept", () => {
  it.each([undefined, "", " , "])("accepts every file when accept is %j", (accept) => {
    expect(matchesAccept(file("notes.txt", "text/plain"), accept)).toBe(true);
  });

  it("matches an extension against the end of the name, case-insensitively", () => {
    expect(matchesAccept(file("Photo.PNG", "image/png"), ".png")).toBe(true);
    expect(matchesAccept(file("photo.png", "image/png"), ".PNG")).toBe(true);
    expect(matchesAccept(file("photo.jpg", "image/jpeg"), ".png")).toBe(false);
  });

  it("matches an extension even when the browser reports no MIME type", () => {
    expect(matchesAccept(file("scene.blend", ""), ".blend")).toBe(true);
  });

  it("matches a MIME type exactly, case-insensitively", () => {
    expect(matchesAccept(file("photo.png", "image/png"), "IMAGE/PNG")).toBe(true);
    expect(matchesAccept(file("photo.png", "Image/Png"), "image/png")).toBe(true);
    expect(matchesAccept(file("photo.png", "image/png"), "image/pn")).toBe(false);
  });

  it("matches a MIME wildcard against the type's top-level part", () => {
    expect(matchesAccept(file("photo.webp", "image/webp"), "image/*")).toBe(true);
    expect(matchesAccept(file("clip.mp4", "video/mp4"), "image/*")).toBe(false);
    expect(matchesAccept(file("photo.webp", "IMAGE/webp"), "Image/*")).toBe(true);
  });

  it("does not let a wildcard match a type that merely shares its prefix", () => {
    expect(matchesAccept(file("x.bin", "imagery/raw"), "image/*")).toBe(false);
  });

  it("accepts a file that matches any entry of a comma-separated list, ignoring whitespace", () => {
    const accept = " .pdf , image/* ,text/plain";
    expect(matchesAccept(file("report.pdf", "application/pdf"), accept)).toBe(true);
    expect(matchesAccept(file("photo.gif", "image/gif"), accept)).toBe(true);
    expect(matchesAccept(file("notes.txt", "text/plain"), accept)).toBe(true);
    expect(matchesAccept(file("data.csv", "text/csv"), accept)).toBe(false);
  });
});

describe("exceedsMaxSize", () => {
  it("admits every size without a limit", () => {
    expect(exceedsMaxSize(file("a.txt", "text/plain", 1000), undefined)).toBe(false);
  });

  it("admits a file exactly at the limit and rejects one byte over", () => {
    expect(exceedsMaxSize(file("a.txt", "text/plain", 10), 10)).toBe(false);
    expect(exceedsMaxSize(file("a.txt", "text/plain", 11), 10)).toBe(true);
  });
});

describe("exceedsMaxFiles", () => {
  it("admits any count without a limit", () => {
    expect(exceedsMaxFiles(100, undefined)).toBe(false);
  });

  it("admits a file while the active count is below the limit", () => {
    expect(exceedsMaxFiles(1, 2)).toBe(false);
    expect(exceedsMaxFiles(2, 2)).toBe(true);
  });
});

describe("isDirectory", () => {
  it("treats an empty, typeless file as a directory", () => {
    expect(isDirectory(file("folder", "", 0))).toBe(true);
  });

  it("does not treat an empty file with a type, or a typeless file with content, as a directory", () => {
    expect(isDirectory(file("empty.txt", "text/plain", 0))).toBe(false);
    expect(isDirectory(file("scene.blend", "", 4))).toBe(false);
  });
});

describe("rejectionReason", () => {
  it("accepts a file that passes every filter", () => {
    expect(rejectionReason(file("a.png", "image/png"), { accept: "image/*", maxSize: 10, maxFiles: 2 }, 1)).toBeNull();
  });

  it("accepts every file with no filters", () => {
    expect(rejectionReason(file("a.bin", "application/octet-stream"), {}, 99)).toBeNull();
  });

  it("reports a directory as such rather than as a type mismatch", () => {
    expect(rejectionReason(file("folder", "", 0), { accept: "image/*" }, 0)).toBe("directory");
  });

  it("reports a type mismatch", () => {
    expect(rejectionReason(file("a.txt", "text/plain"), { accept: "image/*" }, 0)).toBe("type");
  });

  it("reports an oversized file", () => {
    expect(rejectionReason(file("a.png", "image/png", 20), { maxSize: 10 }, 0)).toBe("size");
  });

  it("reports a file that would exceed the count", () => {
    expect(rejectionReason(file("a.png", "image/png"), { maxFiles: 1 }, 1)).toBe("count");
  });
});
