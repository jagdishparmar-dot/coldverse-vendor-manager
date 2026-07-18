import { ServiceError } from "@/lib/services/utils";

/** Max decoded upload size (bytes) for invoice / KYC base64 payloads. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Map<string, string>([
  ["application/pdf", "application/pdf"],
  ["image/jpeg", "image/jpeg"],
  ["image/jpg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
]);

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function extensionOf(fileName?: string): string {
  if (!fileName) return "";
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

function sniffMime(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === "%PDF") {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function decodeAndValidateUpload(
  fileData: string,
  options?: { fileName?: string; claimedType?: string }
): { buffer: Buffer; contentType: string } {
  if (!fileData || typeof fileData !== "string") {
    throw new ServiceError(400, "Missing file data.");
  }

  // Rough pre-check on base64 payload length (~4/3 expansion)
  const approxBytes = Math.floor((fileData.length * 3) / 4);
  if (approxBytes > MAX_UPLOAD_BYTES * 1.15) {
    throw new ServiceError(413, "File exceeds the 10MB upload limit.");
  }

  const base64Data = fileData.replace(/^data:.*;base64,/, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    throw new ServiceError(400, "Invalid file encoding.");
  }

  if (!buffer.length) {
    throw new ServiceError(400, "Empty file.");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ServiceError(413, "File exceeds the 10MB upload limit.");
  }

  const sniffed = sniffMime(buffer);
  const fromClaim = options?.claimedType
    ? ALLOWED_MIME.get(options.claimedType.toLowerCase().trim())
    : undefined;
  const fromExt = EXT_MIME[extensionOf(options?.fileName)];

  const contentType = sniffed || fromClaim || fromExt;
  if (!contentType || !ALLOWED_MIME.has(contentType)) {
    throw new ServiceError(
      400,
      "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP."
    );
  }

  // If we sniffed a type, it must agree with claim/ext when those are set
  if (sniffed && fromClaim && sniffed !== fromClaim) {
    throw new ServiceError(400, "File content does not match declared type.");
  }
  if (sniffed && fromExt && sniffed !== fromExt) {
    throw new ServiceError(400, "File content does not match file extension.");
  }

  return { buffer, contentType };
}
