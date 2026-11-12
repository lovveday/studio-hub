import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getAnalysisForBrand, readFrameFile } from "@/lib/virality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const brand = await getActiveBrand();
  const { id, name } = await params;
  const row = getAnalysisForBrand(id, brand.id);
  if (!row) return new Response("Not found", { status: 404 });
  const file = readFrameFile(id, name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
