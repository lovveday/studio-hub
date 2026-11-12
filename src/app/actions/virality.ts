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

import { PLATFORM_ORDER, type Platform } from "@/lib/platforms";

const PLATFORMS = new Set(["tiktok", "instagram", "youtube", "facebook", "linkedin", "x", "all"]);

function formatVariantForPlatform(target: Platform, adaptation: NonNullable<ReturnType<typeof parseAnalysis>["adaptation"]>) {
  switch (target) {
    case "tiktok": {
      const caption = truncate(`${adaptation.hook}\n\n${adaptation.cta}`, 2100);
      return {
        caption,
        hashtags: `${adaptation.hashtags} #fyp #viral`,
        firstComment: "Drop a comment if you want part 2!",
      };
    }
    case "youtube": {
      const summary = adaptation.script_outline.map((b) => `- ${b.line}`).join("\n");
      const caption = `${adaptation.hook}\n\n${adaptation.caption}\n\nKey takeaways:\n${summary}\n\n${adaptation.cta}`;
      return {
        caption,
        hashtags: adaptation.hashtags,
        firstComment: "What topic should we break down in our next Short?",
      };
    }
    case "linkedin": {
      const points = adaptation.script_outline.map((b) => `→ ${b.beat}: ${b.line}`).join("\n\n");
      const caption = `${adaptation.hook}\n\nHere is what we discovered about ${adaptation.angle.toLowerCase()}:\n\n${points}\n\nThe lesson: ${adaptation.cta}\n\nWhat has your experience been with this approach?`;
      return {
        caption,
        hashtags: adaptation.hashtags,
        firstComment: "Read our full case breakdown in the brand knowledge base.",
      };
    }
    case "x": {
      const caption = truncate(`${adaptation.hook}\n\n${adaptation.cta}`, 275);
      return {
        caption,
        hashtags: adaptation.hashtags.split(" ").slice(0, 2).join(" "),
        firstComment: "Bookmark this post and follow for more.",
      };
    }
    case "facebook": {
      return {
        caption: `${adaptation.hook}\n\n${adaptation.caption}\n\n${adaptation.cta}`,
        hashtags: adaptation.hashtags,
        firstComment: "Share your thoughts with us in the comments below!",
      };
    }
    default: {
      return {
        caption: adaptation.caption,
        hashtags: adaptation.hashtags,
        firstComment: "Which part should we go deeper on? Tell us below.",
      };
    }
  }
}

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

  const targets: Platform[] = platform === "all" ? PLATFORM_ORDER : [platform as Platform];

  for (const target of targets) {
    const formatted = formatVariantForPlatform(target, adaptation);
    run(
      `INSERT INTO post_variants (id, post_id, platform, caption, hashtags, first_comment, media_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        uuid(),
        postId,
        target,
        formatted.caption,
        formatted.hashtags,
        formatted.firstComment,
        now,
      ]
    );
  }

  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Created post from teardown",
    entity: "post",
    entityId: postId,
    detail: `${row.source_title} → ${platform === "all" ? "all channels" : platform}`,
  });
  revalidatePath("/virality");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect(`/posts/${postId}?created=1`);
}
