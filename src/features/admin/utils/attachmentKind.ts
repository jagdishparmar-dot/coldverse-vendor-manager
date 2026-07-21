export type AttachmentKind = "image" | "pdf" | "unsupported";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const PDF_MIME = new Set(["application/pdf"]);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function extensionOf(fileName?: string): string {
  if (!fileName) return "";
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

/** Resolve printable attachment kind from MIME and/or file name. */
export function resolveAttachmentKind(
  fileType?: string,
  fileName?: string
): AttachmentKind {
  const mime = (fileType || "").toLowerCase().trim();

  if (mime.startsWith("image/") || IMAGE_MIME.has(mime)) {
    return "image";
  }
  if (PDF_MIME.has(mime)) {
    return "pdf";
  }

  const ext = extensionOf(fileName);
  if (ext === ".pdf") return "pdf";
  if (IMAGE_EXT.has(ext)) return "image";

  return "unsupported";
}

export function isPrintableAttachmentKind(kind: AttachmentKind): boolean {
  return kind === "image" || kind === "pdf";
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  if (kind === "image") return "Image";
  if (kind === "pdf") return "PDF";
  return "Unsupported";
}
