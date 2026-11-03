import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ASSET_DIR = path.join(process.cwd(), "storage", "assets");
export const ASSET_MAX_BYTES = 50 * 1024 * 1024;

export type AssetKind = "image" | "video" | "audio" | "file";

export function kindForMime(mime: string): AssetKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function assetUrl(relativePath: string): string {
  const relative = relativePath.replace(/\\/g, "/").replace(/^storage\//, "");
  return `/api/files/${relative}`;
}

export function saveAssetBuffer(buffer: Buffer, originalName: string, mimeType: string) {
  if (buffer.byteLength > ASSET_MAX_BYTES) {
    throw new Error("Assets must be under 50 MB.");
  }
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const safeName =
    originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 90) || "asset";
  const storedName = `${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(ASSET_DIR, storedName);
  fs.writeFileSync(fullPath, buffer);
  return {
    relativePath: path.join("storage", "assets", storedName),
    size: buffer.byteLength,
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
    kind: kindForMime(mimeType),
    mimeType: mimeType || "application/octet-stream",
  };
}

export function removeAssetFile(relativePath: string) {
  const root = path.join(process.cwd(), "storage", "assets");
  const fullPath = path.join(root, path.basename(relativePath));
  if (!fullPath.startsWith(root + path.sep)) return;
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // File cleanup is best-effort; the database row is removed separately.
  }
}
