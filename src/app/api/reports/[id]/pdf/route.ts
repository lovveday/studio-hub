import fs from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { getReport } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const report = getReport(id);
  if (!report) return new Response("Report not found", { status: 404 });
  const fullPath = path.join(process.cwd(), "storage", "reports", path.basename(report.pdf_path));
  if (!fs.existsSync(fullPath)) return new Response("File missing", { status: 404 });
  const buffer = fs.readFileSync(fullPath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(report.title)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
