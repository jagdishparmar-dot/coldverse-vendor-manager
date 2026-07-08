import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
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
      `S3 storage is not configured. Set ${missing.join(", ")} in next-app/.env`
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
  };

  const httpsAgent = new https.Agent({
    rejectUnauthorized: config.tlsRejectUnauthorized,
  });

  clientConfig.requestHandler = new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 10_000,
    socketTimeout: 30_000,
  });

  return new S3Client(clientConfig);
}

export function getS3Bucket(): string {
  return getS3Config().bucket;
}

export function buildInvoiceKey(vendorId: string, fileName?: string): string {
  const fileExt = fileName ? path.extname(fileName) : ".pdf";
  const baseName = fileName
    ? path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9]/g, "_")
    : "invoice";
  return `${vendorId}-${Date.now()}-${baseName}${fileExt}`;
}

export async function uploadInvoiceFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
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
}

export async function getInvoiceObject(key: string) {
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
}

export function decodeBase64File(fileData: string): Buffer {
  const base64Data = fileData.replace(/^data:.*;base64,/, "");
  return Buffer.from(base64Data, "base64");
}
