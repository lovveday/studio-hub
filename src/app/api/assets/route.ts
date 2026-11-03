import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { get, run } from "@/lib/db";
import { uuid } from "@/lib/password";
import { getPost, logActivity } from "@/lib/data";
import { ASSET_MAX_BYTES, assetUrl, saveAssetBuffer } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const brand = await getActiveBrand();
  const formData = await request.formData();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post || post.brand_id !== brand.id) {
    return Response.json({ error: "Post not found for this brand." }, { status: 404 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a file first." }, { status: 400 });
  }
  if (file.size > ASSET_MAX_BYTES) {
    return Response.json({ error: "Assets must be under 50 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = saveAssetBuffer(buffer, file.name, file.type || "application/octet-stream");
    const assetId = uuid();
    const now = new Date().toISOString();
    run(
      `INSERT INTO assets
       (id, brand_id, name, file_path, mime_type, size, kind, width, height, duration_seconds,
        alt_text, tags, checksum, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, '', ?, ?, ?)`,
      [
        assetId,
        brand.id,
        file.name,
        stored.relativePath,
        stored.mimeType,
        stored.size,
        stored.kind,
        String(formData.get("altText") ?? ""),
        stored.checksum,
        user.id,
        now,
      ]
    );
    const maxPosition = get<{ max: number | null }>(
      "SELECT MAX(position) AS max FROM post_media WHERE post_id = ?",
      [postId]
    );
    run(
      "INSERT INTO post_media (id, post_id, asset_id, position, created_at) VALUES (?, ?, ?, ?, ?)",
      [uuid(), postId, assetId, Number(maxPosition?.max ?? -1) + 1, now]
    );
    run("UPDATE post_variants SET media_path = ? WHERE post_id = ?", [stored.relativePath, postId]);
    logActivity({
      brandId: brand.id,
      userId: user.id,
      action: "Attached media",
      entity: "post",
      entityId: postId,
      detail: file.name,
    });
    return Response.json({
      asset: {
        id: assetId,
        name: file.name,
        url: assetUrl(stored.relativePath),
        kind: stored.kind,
        size: stored.size,
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
