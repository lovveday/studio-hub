import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { run } from "@/lib/db";
import { assetUrl, saveAssetBuffer } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const brand = await getActiveBrand();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Choose an image or short video first." }, { status: 400 });
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return Response.json({ error: "Stories need an image or a video." }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return Response.json(
        { error: "Story media must be under 50 MB. Use a shorter clip or compress the image." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = saveAssetBuffer(buffer, file.name, file.type || "application/octet-stream");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const width = Number(formData.get("width") ?? 0) || null;
    const height = Number(formData.get("height") ?? 0) || null;
    const duration = Number(formData.get("duration") ?? 0) || null;

    run(
      `INSERT INTO assets
       (id, brand_id, name, file_path, mime_type, size, kind, width, height, duration_seconds,
        alt_text, tags, checksum, storage_provider, upload_status, upload_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'story', ?, 'local', 'ready', NULL, ?, ?)`,
      [
        id,
        brand.id,
        file.name.slice(0, 160),
        saved.relativePath,
        saved.mimeType,
        saved.size,
        saved.kind,
        width,
        height,
        duration,
        saved.checksum,
        user.id,
        now,
      ]
    );

    return Response.json({
      assetId: id,
      name: file.name,
      kind: saved.kind,
      url: assetUrl(saved.relativePath, "local"),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
