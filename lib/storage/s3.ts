import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import fs from "fs";
import https from "https";
import path from "path";
import { Readable } from "stream";

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function getStorageDriver(): "local" | "s3" {
  const driver = (readEnv("STORAGE_DRIVER", "S3_STORAGE_DRIVER") || "s3").toLowerCase();
  return driver === "local" || driver === "filesystem" || driver === "disk"
    ? "local"
    : "s3";
}

function getLocalUploadsDir(): string {
  const configured = readEnv("LOCAL_UPLOADS_DIR", "UPLOADS_DIR");
  // turbopackIgnore: runtime-only upload dir; do not NFT-trace project root.
  const cwd = /* turbopackIgnore: true */ process.cwd();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/* turbopackIgnore: true */ cwd, configured);
  }
  return path.join(/* turbopackIgnore: true */ cwd, "uploads");
}

function ensureLocalUploadsDir(): string {
  const dir = getLocalUploadsDir();
  fs.mkdirSync(/* turbopackIgnore: true */ dir, { recursive: true });
  return dir;
}

function sanitizeStorageKey(key: string): string {
  const safe = path.basename(key);
  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid storage key.");
  }
  return safe;
}

function guessContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function isCustomS3Endpoint(endpoint?: string): boolean {
  if (!endpoint) return false;

  try {
    const host = new URL(endpoint).hostname.toLowerCase();
    return !host.includes("amazonaws.com") && !host.endsWith(".amazonaws.com.cn");
  } catch {
    return true;
  }
}

function resolveForcePathStyle(endpoint?: string): boolean {
  const explicit = readEnv("S3_FORCE_PATH_STYLE");
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  // RustFS, MinIO, and most self-hosted S3-compatible stores require path-style URLs.
  return isCustomS3Endpoint(endpoint);
}

function getS3Config() {
  const accessKeyId = readEnv("S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY");
  const bucket = readEnv("S3_BUCKET", "S3_BUCKET_NAME", "AWS_S3_BUCKET");
  const endpoint = readEnv("S3_ENDPOINT", "AWS_ENDPOINT_URL");
  const region = readEnv("S3_REGION", "AWS_REGION") || "us-east-1";
  const forcePathStyle = resolveForcePathStyle(endpoint);
  const tlsRejectUnauthorized = readEnv("S3_TLS_REJECT_UNAUTHORIZED") !== "false";

  const missing: string[] = [];
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("S3_BUCKET (or S3_BUCKET_NAME)");

  if (missing.length > 0) {
    throw new Error(
      `S3 storage is not configured. Set ${missing.join(", ")} in next-app/.env (or set STORAGE_DRIVER=local for local filesystem uploads).`
    );
  }

  return {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    endpoint,
    region,
    forcePathStyle,
    tlsRejectUnauthorized,
  };
}

function getS3Client() {
  const config = getS3Config();

  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    maxAttempts: 2,
  };

  const httpsAgent = new https.Agent({
    rejectUnauthorized: config.tlsRejectUnauthorized,
  });

  clientConfig.requestHandler = new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 8_000,
    socketTimeout: 30_000,
  });

  return new S3Client(clientConfig);
}

export function getS3Bucket(): string {
  if (getStorageDriver() === "local") {
    return "local-uploads";
  }
  return getS3Config().bucket;
}

export function buildInvoiceKey(vendorId: string, fileName?: string): string {
  const fileExt = fileName ? path.extname(fileName) : ".pdf";
  const baseName = fileName
    ? path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9]/g, "_")
    : "invoice";
  return `${vendorId}-${Date.now()}-${baseName}${fileExt}`;
}

export function buildKycKey(
  vendorId: string,
  docType: "kyc" | "pan" | "gst" | "msme" | "other",
  fileName?: string
): string {
  const fileExt = fileName ? path.extname(fileName) : ".pdf";
  const baseName = fileName
    ? path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9]/g, "_")
    : `${docType}_doc`;
  const prefix = docType === "kyc" ? "kyc" : `kyc-${docType}`;
  return `${prefix}-${vendorId}-${Date.now()}-${baseName}${fileExt}`;
}

function toStorageError(error: unknown): Error {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

  const isTimeout =
    /TimeoutError|timed out|ECONNREFUSED|ENOTFOUND|ECONNRESET|socket hang up|network/i.test(
      message
    );

  if (isTimeout) {
    const endpoint = readEnv("S3_ENDPOINT", "AWS_ENDPOINT_URL") || "S3 endpoint";
    return new Error(
      `Object storage is unreachable (${endpoint}). Check network/VPN/firewall, verify S3_ENDPOINT, or set STORAGE_DRIVER=local in next-app/.env for local development.`
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(message || "Storage upload failed.");
}

async function uploadLocalFile(key: string, buffer: Buffer): Promise<string> {
  const dir = ensureLocalUploadsDir();
  const safeKey = sanitizeStorageKey(key);
  const filePath = path.join(/* turbopackIgnore: true */ dir, safeKey);
  await fs.promises.writeFile(/* turbopackIgnore: true */ filePath, buffer);
  return safeKey;
}

async function getLocalObject(key: string) {
  const dir = getLocalUploadsDir();
  const safeKey = sanitizeStorageKey(key);
  const filePath = path.join(/* turbopackIgnore: true */ dir, safeKey);

  if (!fs.existsSync(/* turbopackIgnore: true */ filePath)) {
    throw new Error("Invoice file not found in storage.");
  }

  return {
    body: fs.createReadStream(/* turbopackIgnore: true */ filePath),
    contentType: guessContentType(safeKey),
  };
}

export async function uploadInvoiceFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (getStorageDriver() === "local") {
    return uploadLocalFile(key, buffer);
  }

  try {
    const client = getS3Client();
    const bucket = getS3Bucket();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return key;
  } catch (error) {
    throw toStorageError(error);
  }
}

export async function uploadKycFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  return uploadInvoiceFile(key, buffer, contentType);
}

export async function getInvoiceObject(key: string) {
  if (getStorageDriver() === "local") {
    return getLocalObject(key);
  }

  try {
    const client = getS3Client();
    const bucket = getS3Bucket();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error("Invoice file not found in storage.");
    }

    return {
      body: response.Body as Readable,
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch (error) {
    throw toStorageError(error);
  }
}

export async function getKycObject(key: string) {
  return getInvoiceObject(key);
}

export function decodeBase64File(fileData: string): Buffer {
  const base64Data = fileData.replace(/^data:.*;base64,/, "");
  return Buffer.from(base64Data, "base64");
}
