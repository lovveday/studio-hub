"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { get, run } from "@/lib/db";
import { logActivity } from "@/lib/data";
import { uuid } from "@/lib/password";
import {
  createStoryPlan,
  deleteStoryPlan,
  getStoryPlan,
  markStoryPosted,
  STORY_PLATFORMS,
} from "@/lib/stories";
import type { AssetRow, StoryPlatform, StorySticker } from "@/lib/types";

function isoOrEmpty(value: FormDataEntryValue | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function stickerFromForm(formData: FormData): StorySticker | null {
  const type = String(formData.get("stickerType") ?? "none");
  const question = String(formData.get("stickerQuestion") ?? "").trim().slice(0, 120);
  const prompt = String(formData.get("stickerPrompt") ?? "").trim().slice(0, 160);
  const title = String(formData.get("stickerTitle") ?? "").trim().slice(0, 80);
  const location = String(formData.get("stickerLocation") ?? "").trim().slice(0, 120);
  const url = String(formData.get("stickerUrl") ?? "").trim().slice(0, 500);
  const label = String(formData.get("stickerLabel") ?? "").trim().slice(0, 60);
  const answer = String(formData.get("stickerAnswer") ?? "").trim().slice(0, 80);
  const options = String(formData.get("stickerOptions") ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  switch (type) {
    case "poll":
      if (!question || options.length < 2) return null;
      return { type: "poll", question, options };
    case "question":
      if (!prompt) return null;
      return { type: "question", prompt };
    case "quiz":
      if (!question || options.length < 2 || !answer) return null;
      return { type: "quiz", question, options, answer };
    case "countdown": {
      const endsAt = isoOrEmpty(formData.get("stickerEndsAt"));
      if (!title || !endsAt) return null;
      return { type: "countdown", title, endsAt };
    }
    case "event": {
      const startsAt = isoOrEmpty(formData.get("stickerStartsAt"));
      if (!title || !startsAt) return null;
      return { type: "event", title, startsAt, location };
    }
    case "link":
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
      } catch {
        return null;
      }
      return { type: "link", url, label: label || url };
    default:
      return null;
  }
}

export async function createStoryAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const platform = String(formData.get("platform") ?? "instagram");
  const scheduledAt = isoOrEmpty(formData.get("scheduledAt"));
  const assetId = String(formData.get("assetId") ?? "").trim() || null;
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 800);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1200);
  const stickerType = String(formData.get("stickerType") ?? "none");

  if (!title) redirect("/stories/new?error=Give the story a working title.");
  if (!scheduledAt) redirect("/stories/new?error=Choose a date and time.");
  if (!STORY_PLATFORMS.includes(platform as StoryPlatform)) {
    redirect("/stories/new?error=Choose Instagram or TikTok.");
  }
  if (!assetId) redirect("/stories/new?error=Add the 9:16 creative first.");

  const asset = get<AssetRow>("SELECT * FROM assets WHERE id = ? AND brand_id = ?", [
    assetId,
    brand.id,
  ]);
  if (!asset || !["image", "video"].includes(asset.kind)) {
    redirect("/stories/new?error=That creative is not a usable image or video.");
  }

  let stickers: StorySticker[] = [];
  if (stickerType !== "none") {
    const sticker = stickerFromForm(formData);
    if (!sticker) redirect("/stories/new?error=Complete the sticker fields.");
    stickers = [sticker];
  }

  const id = createStoryPlan({
    brandId: brand.id,
    platform: platform as StoryPlatform,
    title,
    caption,
    scheduledAt,
    assetId,
    stickers,
    notes,
    userId: user.id,
  });

  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Scheduled story",
    entity: "story_plan",
    entityId: id,
    detail: `${platform} · ${title}`,
  });
  revalidatePath("/stories");
  revalidatePath("/dashboard");
  redirect(`/stories/${id}?created=1`);
}

export async function markStoryPostedAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  const plan = getStoryPlan(id, brand.id);
  if (!plan) redirect("/stories");
  markStoryPosted(id, brand.id);
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Marked story posted",
    entity: "story_plan",
    entityId: id,
    detail: `${plan.platform} · ${plan.title}`,
  });
  revalidatePath("/stories");
  revalidatePath(`/stories/${id}`);
  revalidatePath("/dashboard");
  redirect(`/stories/${id}?posted=1`);
}

export async function rescheduleStoryAction(formData: FormData) {
  await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  const scheduledAt = isoOrEmpty(formData.get("scheduledAt"));
  const plan = getStoryPlan(id, brand.id);
  if (!plan || !scheduledAt) {
    redirect(`/stories/${id}?error=Choose a valid date and time.`);
  }
  const status = scheduledAt <= new Date().toISOString() ? "ready" : "scheduled";
  run(
    "UPDATE story_plans SET scheduled_at = ?, status = ?, posted_at = NULL, updated_at = ? WHERE id = ? AND brand_id = ?",
    [scheduledAt, status, new Date().toISOString(), id, brand.id]
  );
  revalidatePath(`/stories/${id}`);
  revalidatePath("/stories");
  redirect(`/stories/${id}?rescheduled=1`);
}

export async function deleteStoryAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("id") ?? "");
  const plan = getStoryPlan(id, brand.id);
  if (!plan) redirect("/stories");
  deleteStoryPlan(id, brand.id);
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Deleted story plan",
    entity: "story_plan",
    entityId: id,
    detail: `${plan.platform} · ${plan.title}`,
  });
  revalidatePath("/stories");
  revalidatePath("/dashboard");
  redirect("/stories?deleted=1");
}
