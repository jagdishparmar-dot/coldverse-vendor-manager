import {
  attachmentKindLabel,
  isPrintableAttachmentKind,
  resolveAttachmentKind,
} from "../src/features/admin/utils/attachmentKind";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const cases: Array<[string, string | undefined, "image" | "pdf" | "unsupported"]> = [
  ["image/jpeg", "scan.jpg", "image"],
  ["application/pdf", "invoice.pdf", "pdf"],
  ["", "proof.PDF", "pdf"],
  ["text/plain", "note.txt", "unsupported"],
  ["image/png", undefined, "image"],
];

for (const [fileType, fileName, expected] of cases) {
  const kind = resolveAttachmentKind(fileType, fileName);
  assert(kind === expected, `Expected ${expected} for ${fileType}/${fileName}, got ${kind}`);
  assert(
    isPrintableAttachmentKind(kind) === (expected !== "unsupported"),
    `Printable mismatch for ${fileType}/${fileName}`
  );
  assert(attachmentKindLabel(kind).length > 0, "Label should not be empty");
}

console.log("attachmentKind tests passed");
