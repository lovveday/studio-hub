"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { run } from "@/lib/db";
import { logActivity } from "@/lib/data";
import { uuid } from "@/lib/password";
import { truncate } from "@/lib/utils";
import {
  deleteAnalysis,
  getAnalysisForBrand,
  loadSampleAnalysis,
  parseAnalysis,
  regenerateBrief,
  retryViralityAnalysis,
} from "@/lib/virality";

const PLATFORMS = new Set(["tiktok", "instagram", "youtube", "facebook", "linkedin", "x"]);

export async function deleteViralityAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/virality");
  deleteAnalysis(id, brand.id, user.id);
  revalidatePath("/virality");
  revalidatePath("/dashboard");
  redirect("/virality?deleted=1");
}

export async function retryViralityAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/virality");
  const ok = retryViralityAnalysis(id, brand.id);
  revalidatePath("/virality");
  revalidatePath(`/virality/${id}`);
  if (!ok) redirect("/virality?error=That teardown no longer exists.");
  redirect(`/virality/${id}`);
}

export async function regenerateBriefAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/virality");
  const ok = await regenerateBrief(id, brand.id, user.id);
  revalidatePath(`/virality/${id}`);
  revalidatePath("/virality");
  redirect(ok ? `/virality/${id}?rewritten=1` : "/virality?error=Could not rewrite that brief.");
}

export async function loadSampleTeardownAction() {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = loadSampleAnalysis(brand.id, user.id);
  revalidatePath("/virality");
  revalidatePath("/dashboard");
  if (!id) redirect("/virality?error=No sample is available for this brand yet.");
  redirect(`/virality/${id}`);
}

export async function createPostFromAnalysisAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  const platform = String(formData.get("platform") ?? "instagram").toLowerCase();
  if (!PLATFORMS.has(platform)) redirect(`/virality/${id}?error=Choose a supported platform.`);
  const row = getAnalysisForBrand(id, brand.id);
  const analysis = row ? parseAnalysis(row) : null;
  if (!row || !analysis?.adaptation) {
    redirect(`/virality/${id}?error=That brief is not ready yet.`);
  }
  const adaptation = analysis.adaptation;
  if (!adaptation) redirect(`/virality/${id}?error=That brief is not ready yet.`);

  const title = truncate(
    row.source_title || analysis.teardown?.title || adaptation.angle,
    90
  );
  const idea = [
    `Adapted from ${row.creator || "a source clip"}: ${row.source_title}`,
    `Angle: ${adaptation.angle}`,
    `Hook: ${adaptation.hook}`,
    "",
    "Script outline:",
    ...adaptation.script_outline.map(
      (beat) => `${beat.start}s–${beat.end}s · ${beat.beat}: ${beat.line} (${beat.shot})`
    ),
    "",
    `CTA: ${adaptation.cta}`,
    `Guardrails: ${adaptation.guardrails.join(" ")}`,
  ].join("\n");

  const postId = uuid();
  const now = new Date().toISOString();
  run(
    `INSERT INTO posts
     (id, brand_id, title, idea, status, scheduled_at, approved_by, approved_at, share_token, prep_lead_hours, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', NULL, NULL, NULL, NULL, 48, ?, ?)`,
    [postId, brand.id, title, idea, now, now]
  );
  run(
    `INSERT INTO post_variants (id, post_id, platform, caption, hashtags, first_comment, media_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      uuid(),
      postId,
      platform,
      adaptation.caption,
      adaptation.hashtags,
      "Which part should we go deeper on? Tell us below.",
      now,
    ]
  );
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Created post from teardown",
    entity: "post",
    entityId: postId,
    detail: `${row.source_title} → ${platform}`,
  });
  revalidatePath("/virality");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect(`/posts/${postId}?created=1`);
}
