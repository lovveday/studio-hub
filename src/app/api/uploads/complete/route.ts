import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { assetUrl } from "@/lib/assets";
import { completeUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const brand = await getActiveBrand();
    const body = (await request.json()) as {
      assetId?: string;
      uploadId?: string;
      parts?: Array<{ partNumber: number; etag: string }>;
    };
    const result = await completeUpload({
      assetId: String(body.assetId ?? ""),
      brandId: brand.id,
      userId: user.id,
      uploadId: body.uploadId,
      parts: body.parts,
    });
    return Response.json({
      asset: result.asset,
      url: assetUrl(result.asset.file_path, result.asset.storage_provider),
      alreadyComplete: result.alreadyComplete,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
