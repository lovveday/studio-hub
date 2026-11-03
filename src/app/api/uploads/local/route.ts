import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { appendLocalChunk } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const brand = await getActiveBrand();
    const url = new URL(request.url);
    const assetId = url.searchParams.get("assetId") ?? "";
    const index = Number(url.searchParams.get("index") ?? "0");
    const total = Number(url.searchParams.get("total") ?? "1");
    if (!assetId || !Number.isFinite(index) || !Number.isFinite(total)) {
      return Response.json({ error: "Invalid chunk request." }, { status: 400 });
    }
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.byteLength > 12 * 1024 * 1024) {
      return Response.json({ error: "Chunk is too large." }, { status: 413 });
    }
    const result = await appendLocalChunk({
      assetId,
      brandId: brand.id,
      index,
      total,
      chunk: buffer,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
