import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { initUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const brand = await getActiveBrand();
    const body = (await request.json()) as {
      postId?: string;
      fileName?: string;
      size?: number;
      mimeType?: string;
      altText?: string;
    };
    const result = await initUpload({
      brandId: brand.id,
      userId: user.id,
      postId: String(body.postId ?? ""),
      fileName: String(body.fileName ?? "asset"),
      size: Number(body.size ?? 0),
      mimeType: String(body.mimeType ?? "application/octet-stream"),
      altText: String(body.altText ?? ""),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
