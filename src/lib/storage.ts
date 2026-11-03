import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
export const R2_PART_SIZE = 16 * 1024 * 1024;
export const LOCAL_PART_SIZE = 8 * 1024 * 1024;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.R2_BUCKET || "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, ""),
  };
}

export function r2Configured(): boolean {
  return Boolean(r2Config());
}

let cachedClient: { key: string; client: S3Client } | null = null;

function s3(): { client: S3Client; config: R2Config } {
  const config = r2Config();
  if (!config) throw new Error("R2 is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
  const key = `${config.accountId}:${config.bucket}:${config.accessKeyId}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = {
      key,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }
  return { client: cachedClient.client, config };
}

export function safeName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 90) || "asset";
}

export function r2KeyFor(brandId: string, fileName: string): string {
  return `brands/${brandId}/assets/${crypto.randomUUID()}-${safeName(fileName)}`;
}

export function localPathFor(fileName: string): string {
  return path.join("storage", "assets", `${crypto.randomUUID()}-${safeName(fileName)}`);
}

export function publicR2Url(key: string): string | null {
  const config = r2Config();
  if (!config?.publicBaseUrl) return null;
  return `${config.publicBaseUrl}/${key}`;
}

export async function createMultipart(key: string, mimeType: string) {
  const { client, config } = s3();
  const response = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: mimeType || "application/octet-stream",
    })
  );
  if (!response.UploadId) throw new Error("R2 did not return an upload ID.");
  return response.UploadId;
}

export async function presignPartUrls(key: string, uploadId: string, partCount: number) {
  const { client, config } = s3();
  const urls: Array<{ partNumber: number; url: string }> = [];
  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    const url = await getSignedUrl(
      client,
      new UploadPartCommand({
        Bucket: config.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: 3600 }
    );
    urls.push({ partNumber, url });
  }
  return urls;
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>
) {
  const { client, config } = s3();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
      },
    })
  );
}

export async function abortMultipart(key: string, uploadId: string) {
  const { client, config } = s3();
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      UploadId: uploadId,
    })
  );
}

export async function objectSize(key: string): Promise<number | null> {
  const { client, config } = s3();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  const { client, config } = s3();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch {
    // Best-effort cleanup.
  }
}

export function localAssetFullPath(relativePath: string): string {
  const root = path.join(process.cwd(), "storage", "assets");
  const full = path.join(root, path.basename(relativePath));
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid asset path.");
  fs.mkdirSync(root, { recursive: true });
  return full;
}
