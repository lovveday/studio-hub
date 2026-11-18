import crypto from "node:crypto";
import { all, get, run } from "./db";
import { assetUrl } from "./assets";
import type { AssetRow, StoryPlan, StoryPlanView, StoryPlatform, StorySticker } from "./types";

export const STORY_PLATFORMS: StoryPlatform[] = ["instagram", "tiktok"];

export function storyPlatformMeta(platform: StoryPlatform): {
  label: string;
  deepLink: string;
  appLabel: string;
  note: string;
} {
  if (platform === "tiktok") {
    return {
      label: "TikTok",
      deepLink: "https://www.tiktok.com/upload",
      appLabel: "Open TikTok",
      note: "TikTok’s Content Posting API does not support Stories. Post the Story in the TikTok app.",
    };
  }
  return {
    label: "Instagram",
    deepLink: "https://www.instagram.com/",
    appLabel: "Open Instagram",
    note: "Instagram allows Story media publishing by API, but not interactive stickers. Add the sticker in the app.",
  };
}

export function parseStickers(value: string): StorySticker[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StorySticker => {
      if (!item || typeof item !== "object") return false;
      const type = (item as { type?: unknown }).type;
      return ["poll", "question", "quiz", "countdown", "event", "link"].includes(String(type));
    });
  } catch {
    return [];
  }
}

function hydrate(row: StoryPlan): StoryPlanView {
  const asset = row.asset_id ? get<AssetRow>("SELECT * FROM assets WHERE id = ?", [row.asset_id]) : undefined;
  return {
    ...row,
    asset: asset ?? null,
    stickers: parseStickers(row.sticker_json),
  };
}

export function listStoryPlans(brandId: string, limit = 80): StoryPlanView[] {
  return all<StoryPlan>(
    "SELECT * FROM story_plans WHERE brand_id = ? ORDER BY scheduled_at ASC, created_at ASC LIMIT ?",
    [brandId, limit]
  ).map(hydrate);
}

export function getStoryPlan(id: string, brandId?: string): StoryPlanView | undefined {
  const row = brandId
    ? get<StoryPlan>("SELECT * FROM story_plans WHERE id = ? AND brand_id = ?", [id, brandId])
    : get<StoryPlan>("SELECT * FROM story_plans WHERE id = ?", [id]);
  return row ? hydrate(row) : undefined;
}

export function countStoryPlans(brandId: string): number {
  const row = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM story_plans WHERE brand_id = ?",
    [brandId]
  );
  return Number(row?.c ?? 0);
}

export function countDueStories(brandId: string): number {
  const row = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM story_plans WHERE brand_id = ? AND status = 'ready'",
    [brandId]
  );
  return Number(row?.c ?? 0);
}

export function createStoryPlan(input: {
  brandId: string;
  platform: StoryPlatform;
  title: string;
  caption: string;
  scheduledAt: string;
  assetId: string | null;
  stickers: StorySticker[];
  notes: string;
  userId: string;
}): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = input.scheduledAt <= now ? "ready" : "scheduled";
  run(
    `INSERT INTO story_plans
     (id, brand_id, platform, title, caption, scheduled_at, status, asset_id, sticker_json, notes, created_by, created_at, updated_at, posted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      input.brandId,
      input.platform,
      input.title,
      input.caption,
      input.scheduledAt,
      status,
      input.assetId,
      JSON.stringify(input.stickers),
      input.notes,
      input.userId,
      now,
      now,
    ]
  );
  return id;
}

export function markStoryPosted(id: string, brandId: string): boolean {
  const row = get<StoryPlan>("SELECT * FROM story_plans WHERE id = ? AND brand_id = ?", [id, brandId]);
  if (!row) return false;
  const now = new Date().toISOString();
  run("UPDATE story_plans SET status = 'posted', posted_at = ?, updated_at = ? WHERE id = ?", [
    now,
    now,
    id,
  ]);
  return true;
}

export function deleteStoryPlan(id: string, brandId: string): boolean {
  const row = get<StoryPlan>("SELECT * FROM story_plans WHERE id = ? AND brand_id = ?", [id, brandId]);
  if (!row) return false;
  run("DELETE FROM story_plans WHERE id = ?", [id]);
  return true;
}

export function dueStoryPlans(now = new Date()): StoryPlan[] {
  return all<StoryPlan>(
    `SELECT * FROM story_plans
     WHERE status = 'scheduled' AND scheduled_at <= ?
     ORDER BY scheduled_at ASC`,
    [now.toISOString()]
  );
}

export function markStoryReady(id: string): void {
  run("UPDATE story_plans SET status = 'ready', updated_at = ? WHERE id = ? AND status = 'scheduled'", [
    new Date().toISOString(),
    id,
  ]);
}

export function stickerTypeLabel(type: StorySticker["type"]): string {
  switch (type) {
    case "poll":
      return "Poll";
    case "question":
      return "Question";
    case "quiz":
      return "Quiz";
    case "countdown":
      return "Countdown";
    case "event":
      return "Event";
    case "link":
      return "Link";
    default:
      return "Sticker";
  }
}

export function stickerSummary(sticker: StorySticker): string {
  switch (sticker.type) {
    case "poll":
      return `Poll · ${sticker.question} · ${sticker.options.join(" / ")}`;
    case "question":
      return `Question · ${sticker.prompt}`;
    case "quiz":
      return `Quiz · ${sticker.question} · answer: ${sticker.answer}`;
    case "countdown":
      return `Countdown · ${sticker.title}`;
    case "event":
      return `Event · ${sticker.title}${sticker.location ? ` · ${sticker.location}` : ""}`;
    case "link":
      return `Link · ${sticker.label || sticker.url}`;
    default:
      return "Sticker";
  }
}

export function storyAssetUrl(asset: AssetRow | null): string {
  return asset ? assetUrl(asset.file_path, asset.storage_provider) : "";
}

export function storyStatusLabel(status: StoryPlan["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "ready":
      return "Ready to post";
    case "posted":
      return "Posted";
    default:
      return status;
  }
}
