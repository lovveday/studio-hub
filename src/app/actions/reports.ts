"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { generateReport } from "@/lib/reports";
import { getReport, logActivity } from "@/lib/data";
import { run } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export async function generateReportAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const days = Number(formData.get("days") ?? 7) === 30 ? 30 : 7;
  let reportId = "";
  try {
    const report = await generateReport(brand.id, days);
    reportId = report.id;
    logActivity({
      brandId: brand.id,
      userId: user.id,
      action: "Generated report",
      entity: "report",
      entityId: report.id,
      detail: `${brand.name} · ${days} days`,
    });
  } catch (error) {
    redirect(`/reports?error=${encodeURIComponent((error as Error).message)}`);
  }
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect(`/reports?generated=${reportId}`);
}

export async function deleteReportAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const report = getReport(id);
  if (!report) redirect("/reports");
  try {
    for (const file of [report.pptx_path, report.pdf_path]) {
      const full = path.join(process.cwd(), "storage", "reports", path.basename(file));
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  } catch {
    // Ignore file cleanup errors; the row is still removed below.
  }
  run("DELETE FROM reports WHERE id = ?", [id]);
  logActivity({
    brandId: report.brand_id,
    userId: user.id,
    action: "Deleted report",
    entity: "report",
    entityId: id,
  });
  revalidatePath("/reports");
  redirect("/reports");
}
