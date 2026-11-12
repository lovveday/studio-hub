import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getAnalysisForBrand } from "@/lib/virality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const brand = await getActiveBrand();
  const { id } = await params;
  const row = getAnalysisForBrand(id, brand.id);
  if (!row) return Response.json({ error: "Teardown not found." }, { status: 404 });
  return Response.json({
    id: row.id,
    status: row.status,
    stage: row.stage,
    error: row.error,
    mode: row.mode,
    confidence: row.confidence,
    title: row.source_title,
    ready: row.status === "ready",
  });
}
