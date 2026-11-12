import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getAnalysisForBrand, parseAnalysis } from "@/lib/virality";
import { generateViralityPdf } from "@/lib/virality-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const brand = await getActiveBrand();
  const { id } = await params;
  const row = getAnalysisForBrand(id, brand.id);
  if (!row) return new Response("Teardown not found", { status: 404 });

  const analysis = parseAnalysis(row);
  if (!analysis.teardown || !analysis.adaptation) {
    return new Response("Brief not ready", { status: 400 });
  }

  try {
    const pdfBuffer = await generateViralityPdf(analysis, brand);
    const filename = `${brand.handle}-virality-teardown-${analysis.id.slice(0, 8)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate virality teardown PDF:", error);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
