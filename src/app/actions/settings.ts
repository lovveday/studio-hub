"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { run } from "@/lib/db";
import { getRetentionStats, logActivity, setSetting } from "@/lib/data";

export async function saveRetentionAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const hotDays = Math.max(30, Math.min(365, Number(formData.get("hotDays") ?? 90)));
  const voiceDays = Math.max(0, Math.min(90, Number(formData.get("voiceDays") ?? 7)));
  setSetting("retention.hot_days", String(hotDays));
  setSetting("retention.voice_audio_days", String(voiceDays));
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Updated retention",
    entity: "settings",
    detail: `hot ${hotDays}d · voice ${voiceDays}d`,
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function runRetentionAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const mode = String(formData.get("mode") ?? "prune");
  const stats = getRetentionStats();
  if (mode === "dry-run") {
    redirect(
      `/settings?retentionDryRun=1&notifications=${stats.prunable[0].count}&sessions=${stats.prunable[1].count}`
    );
  }

  const now = new Date();
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const deletedNotifications = run("DELETE FROM notifications WHERE created_at < ?", [cutoff90]).changes;
  const deletedSessions = run("DELETE FROM sessions WHERE expires_at < ?", [now.toISOString()]).changes;
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Pruned transient data",
    entity: "settings",
    detail: `notifications ${deletedNotifications} · sessions ${deletedSessions}`,
  });
  revalidatePath("/settings");
  redirect(
    `/settings?pruned=1&notifications=${deletedNotifications}&sessions=${deletedSessions}`
  );
}
