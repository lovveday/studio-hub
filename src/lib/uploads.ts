import crypto from "node:crypto";
import { get, run } from "./db";
import { getPost, logActivity } from "./data";
import { kindForMime, removeAssetFile } from "./assets";
import {
  MAX_UPLOAD_BYTES,
  R2_PART_SIZE,
  LOCAL_PART_SIZE,
  abortMultipart,
  completeMultipart,
  createMultipart,
  localAssetFullPath,
  localPathFor,
  objectSize,
  presignPartUrls,
  r2Configured,
  r2KeyFor,
} from "./storage";
import type { AssetRow } from "./types";

export type UploadInitResult =
  | {
      mode: "r2";
      assetId: string;
      partSize: number;
      partCount: number;
      parts: Array<{ partNumber: number; url: string }>;
    }
  | {
      mode: "local";
      assetId: string;
      partSize: number;
      partCount: number;
      uploadPath: string;
    };

export async function initUpload(input: {
  brandId: string;
  userId: string;
  postId: string;
  fileName: string;
  size: number;
  mimeType: string;
  altText?: string;
}): Promise<UploadInitResult> {
  const post = getPost(input.postId);
  if (!post || post.brand_id !== input.brandId) throw new Error("Post not found for this brand.");
  if (!Number.isFinite(input.size) || input.size <= 0) throw new Error("The file is empty.");
  if (input.size > MAX_UPLOAD_BYTES) throw new Error("The maximum file size is 300 MB.");

  const provider = r2Configured() ? "r2" : "local";
  const key = provider === "r2" ? r2KeyFor(input.brandId, input.fileName) : localPathFor(input.fileName);
  const kind = kindForMime(input.mimeType);
  const assetId = crypto.randomUUID();
  const now = new Date().toISOString();
  run(
    `INSERT INTO assets
     (id, brand_id, name, file_path, mime_type, size, kind, width, height, duration_seconds,
      alt_text, tags, checksum, storage_provider, upload_status, upload_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, '', '', ?, 'uploading', NULL, ?, ?)`,
    [
      assetId,
      input.brandId,
      input.fileName,
      key,
      input.mimeType || "application/octet-stream",
      input.size,
      kind,
      input.altText ?? "",
      provider,
      input.userId,
      now,
    ]
  );
  const maxPosition = get<{ max: number | null }>(
    "SELECT MAX(position) AS max FROM post_media WHERE post_id = ?",
    [input.postId]
  );
  run(
    "INSERT INTO post_media (id, post_id, asset_id, position, created_at) VALUES (?, ?, ?, ?, ?)",
    [crypto.randomUUID(), input.postId, assetId, Number(maxPosition?.max ?? -1) + 1, now]
  );

  if (provider === "r2") {
    try {
      const uploadId = await createMultipart(key, input.mimeType);
      run("UPDATE assets SET upload_id = ? WHERE id = ?", [uploadId, assetId]);
      const partCount = Math.max(1, Math.ceil(input.size / R2_PART_SIZE));
      const parts = await presignPartUrls(key, uploadId, partCount);
      return { mode: "r2", assetId, partSize: R2_PART_SIZE, partCount, parts };
    } catch (error) {
      run("DELETE FROM post_media WHERE asset_id = ?", [assetId]);
      run("DELETE FROM assets WHERE id = ?", [assetId]);
      throw error;
    }
  }

  return {
    mode: "local",
    assetId,
    partSize: LOCAL_PART_SIZE,
    partCount: Math.max(1, Math.ceil(input.size / LOCAL_PART_SIZE)),
    uploadPath: `/api/uploads/local?assetId=${encodeURIComponent(assetId)}`,
  };
}

export async function completeUpload(input: {
  assetId: string;
  brandId: string;
  userId: string;
  uploadId?: string;
  parts?: Array<{ partNumber: number; etag: string }>;
}) {
  const asset = get<AssetRow>("SELECT * FROM assets WHERE id = ? AND brand_id = ?", [
    input.assetId,
    input.brandId,
  ]);
  if (!asset) throw new Error("Asset not found.");
  if (asset.upload_status === "ready") {
    return { asset, alreadyComplete: true };
  }

  if (asset.storage_provider === "r2") {
    const uploadId = input.uploadId || asset.upload_id;
    if (!uploadId) throw new Error("Upload ID is missing.");
    if (!input.parts || input.parts.length === 0) throw new Error("Upload parts are missing.");
    await completeMultipart(asset.file_path, uploadId, input.parts);
    const size = await objectSize(asset.file_path);
    if (size === null) throw new Error("R2 did not return the completed object.");
    if (size !== asset.size) {
      throw new Error(`Uploaded size does not match the file (${size} vs ${asset.size} bytes).`);
    }
  } else {
    const full = localAssetFullPath(asset.file_path);
    let size = 0;
    try {
      const fs = await import("node:fs");
      size = fs.statSync(full).size;
    } catch {
      throw new Error("The local upload is missing. Try again.");
    }
    if (size !== asset.size) {
      throw new Error("Uploaded size does not match the file.");
    }
  }

  const now = new Date().toISOString();
  run("UPDATE assets SET upload_status = 'ready', upload_id = NULL WHERE id = ?", [
    input.assetId,
  ]);
  const postMedia = get<{ post_id: string }>("SELECT post_id FROM post_media WHERE asset_id = ?", [
    input.assetId,
  ]);
  if (postMedia) {
    run("UPDATE post_variants SET media_path = ? WHERE post_id = ?", [asset.file_path, postMedia.post_id]);
    logActivity({
      brandId: input.brandId,
      userId: input.userId,
      action: "Uploaded media",
      entity: "post",
      entityId: postMedia.post_id,
      detail: `${asset.name} · ${asset.size} bytes`,
    });
  }
  return {
    asset: get<AssetRow>("SELECT * FROM assets WHERE id = ?", [input.assetId]) as AssetRow,
    alreadyComplete: false,
  };
}

export async function abortUpload(input: { assetId: string; brandId: string; userId: string }) {
  const asset = get<AssetRow>("SELECT * FROM assets WHERE id = ? AND brand_id = ?", [
    input.assetId,
    input.brandId,
  ]);
  if (!asset) return;
  if (asset.storage_provider === "r2" && asset.upload_id) {
    try {
      await abortMultipart(asset.file_path, asset.upload_id);
    } catch {
      // Best-effort abort.
    }
  }
  if (asset.storage_provider === "local") {
    removeAssetFile(asset.file_path);
  }
  run("DELETE FROM post_media WHERE asset_id = ?", [input.assetId]);
  run("DELETE FROM assets WHERE id = ?", [input.assetId]);
  logActivity({
    brandId: input.brandId,
    userId: input.userId,
    action: "Aborted upload",
    entity: "asset",
    entityId: input.assetId,
  });
}

export async function appendLocalChunk(input: {
  assetId: string;
  brandId: string;
  index: number;
  total: number;
  chunk: Buffer;
}) {
  const asset = get<AssetRow>("SELECT * FROM assets WHERE id = ? AND brand_id = ?", [
    input.assetId,
    input.brandId,
  ]);
  if (!asset || asset.storage_provider !== "local" || asset.upload_status !== "uploading") {
    throw new Error("This upload is not active.");
  }
  if (input.index < 0 || input.index >= input.total) throw new Error("Invalid chunk index.");
  const fs = await import("node:fs");
  const full = localAssetFullPath(asset.file_path);
  fs.writeFileSync(full, input.chunk, { flag: input.index === 0 ? "w" : "a" });
  return { received: input.chunk.byteLength, index: input.index, total: input.total };
}
