import fs from "node:fs";
import crypto from "node:crypto";
import { get, run } from "../db";
import { localAssetFullPath, publicR2Url } from "../storage";
import { getAppUrl } from "../app-url";
import { integrationConfig, integrationSecret } from "./credentials";
import { platformMeta } from "../platforms";
import { truncate } from "../utils";
import type { AssetRow, Post, PostVariant, ProviderProfile, ProviderUsage } from "../types";
import type { PublishResult } from "../publishers/types";

const BASE = "https://api.social-api.ai/v1";
const PROVIDER = "socialapi";

export class SocialApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status = 500, body: unknown = null) {
    super(message);
    this.name = "SocialApiError";
    this.status = status;
    this.body = body;
  }
}

export type SocialApiUsageView = {
  provider: string;
  period: string;
  used: number;
  limit: number;
  allowed: boolean;
  exhausted: boolean;
  nextReset: string;
};

export type SocialApiProfile = ProviderProfile & {
  connectedPlatforms: string[];
  accounts: Array<{ platform: string; account_id: string; username: string; display_name?: string }>;
};

export function socialApiKey(): string {
  return integrationSecret("socialapi", "publishing") || process.env.SOCIALAPI_API_KEY || "";
}

export function socialApiConfigured(): boolean {
  return Boolean(socialApiKey());
}

function socialApiLimit(): number {
  const config = integrationConfig("socialapi");
  const value = Number(config.freeLimit ?? 10);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function nextResetIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

async function apiCall<T>(path: string, init: RequestInit = {}, timeoutMs = 45_000): Promise<T> {
  const key = socialApiKey();
  if (!key) throw new SocialApiError("SocialAPI is not configured.", 401);
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    const message =
      (body as { error?: { message?: string } })?.error?.message ||
      (body as { message?: string })?.message ||
      `SocialAPI returned ${response.status}.`;
    throw new SocialApiError(message, response.status, body);
  }
  return (await response.json()) as T;
}

export async function testSocialApi(): Promise<{ ok: boolean; message: string; plan?: string }> {
  const payload = await apiCall<{ plan?: string; email?: string }>("/users/me");
  return {
    ok: true,
    message: `Connected${payload.email ? ` as ${payload.email}` : ""}${payload.plan ? ` (${payload.plan})` : ""}.`,
    plan: payload.plan,
  };
}

export function socialApiUsage(): SocialApiUsageView {
  const period = currentPeriod();
  const row = get<ProviderUsage>(
    "SELECT * FROM provider_usage WHERE provider = ? AND period = ?",
    [PROVIDER, period]
  );
  const limit = socialApiLimit();
  const used = Number(row?.used ?? 0);
  const exhausted = used >= limit || Boolean(row?.exhausted);
  return {
    provider: PROVIDER,
    period,
    used,
    limit,
    allowed: !exhausted,
    exhausted,
    nextReset: nextResetIso(),
  };
}

function storeUsage(used: number, exhausted: boolean): SocialApiUsageView {
  const period = currentPeriod();
  run(
    `INSERT INTO provider_usage (provider, period, used, limit_value, last_reset, exhausted, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)
     ON CONFLICT(provider, period) DO UPDATE SET
       used = excluded.used, limit_value = excluded.limit_value,
       exhausted = excluded.exhausted, updated_at = excluded.updated_at`,
    [PROVIDER, period, Math.max(0, used), socialApiLimit(), exhausted ? 1 : 0, new Date().toISOString()]
  );
  return socialApiUsage();
}

export function markSocialApiExhausted(): SocialApiUsageView {
  return storeUsage(socialApiLimit(), true);
}

export function socialApiProfile(brandId: string): SocialApiProfile | undefined {
  const row = get<ProviderProfile>(
    "SELECT * FROM provider_profiles WHERE brand_id = ? AND provider = ?",
    [brandId, PROVIDER]
  );
  if (!row) return undefined;
  let accounts: SocialApiProfile["accounts"] = [];
  try {
    const metadata = JSON.parse(row.metadata_json || "{}") as { accounts?: SocialApiProfile["accounts"] };
    accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
  } catch {
    accounts = [];
  }
  let connectedPlatforms: string[] = [];
  try {
    connectedPlatforms = JSON.parse(row.connected_platforms_json || "[]") as string[];
  } catch {
    connectedPlatforms = [];
  }
  return { ...row, accounts, connectedPlatforms };
}

function remotePlatform(platform: string): string {
  return platform === "x" ? "twitter" : platform;
}

function localPlatform(platform: string): string {
  return platform === "twitter" ? "x" : platform;
}

export async function ensureSocialApiBrand(brandId: string, brandName: string): Promise<SocialApiProfile> {
  const existing = socialApiProfile(brandId);
  if (existing?.remote_id) return existing;
  const remote = await apiCall<{ id?: string; name?: string }>("/brands", {
    method: "POST",
    body: JSON.stringify({ name: brandName }),
  });
  if (!remote.id) throw new SocialApiError("SocialAPI did not return a brand ID.");
  const now = new Date().toISOString();
  run(
    `INSERT INTO provider_profiles
     (id, brand_id, provider, profile_username, display_name, connected_platforms_json, status, remote_id, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '[]', 'connected', ?, '{}', ?, ?)`,
    [crypto.randomUUID(), brandId, PROVIDER, remote.id, brandName, remote.id, now, now]
  );
  return socialApiProfile(brandId)!;
}

export async function refreshSocialApiProfile(brandId: string): Promise<SocialApiProfile> {
  const profile = socialApiProfile(brandId);
  if (!profile?.remote_id) throw new SocialApiError("Create or link the SocialAPI brand first.");
  const payload = await apiCall<{
    accounts?: Array<Record<string, unknown>>;
    data?: Array<Record<string, unknown>>;
  }>(`/accounts?brand_id=${encodeURIComponent(profile.remote_id)}`);
  const rows = payload.accounts ?? payload.data ?? [];
  const accounts = rows
    .map((row) => {
      const platform = localPlatform(String(row.platform ?? ""));
      const accountId = String(row.account_id ?? row.id ?? "");
      if (!platform || !accountId) return null;
      return {
        platform,
        account_id: accountId,
        username: String(row.username ?? row.display_name ?? ""),
        display_name: String(row.display_name ?? row.username ?? ""),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const platforms = [...new Set(accounts.map((account) => account.platform))];
  const now = new Date().toISOString();
  run(
    "UPDATE provider_profiles SET connected_platforms_json = ?, metadata_json = ?, status = 'connected', updated_at = ? WHERE brand_id = ? AND provider = ?",
    [JSON.stringify(platforms), JSON.stringify({ accounts }), now, brandId, PROVIDER]
  );
  return socialApiProfile(brandId)!;
}

export async function socialApiConnectUrl(brandId: string, brandName: string, platform: string): Promise<string> {
  const profile = await ensureSocialApiBrand(brandId, brandName);
  const payload = await apiCall<{ auth_url?: string }>("/accounts/connect", {
    method: "POST",
    body: JSON.stringify({
      brand_id: profile.remote_id,
      platform: remotePlatform(platform),
      redirect_uri: `${getAppUrl()}/api/providers/socialapi/callback`,
      state: brandId,
    }),
  });
  if (!payload.auth_url) throw new SocialApiError("SocialAPI did not return a connection URL.");
  return payload.auth_url;
}

function assetBlob(asset: AssetRow): { blob: Blob; name: string } {
  if (asset.storage_provider === "r2") {
    const url = publicR2Url(asset.file_path);
    if (!url) throw new SocialApiError("R2 asset has no public URL.");
    // Ayrshare-style remote URLs are not used here; download to upload to SocialAPI.
    throw new SocialApiError("R2 assets are not supported by this fallback yet; use local storage.");
  }
  const full = localAssetFullPath(asset.file_path);
  if (!fs.existsSync(full)) throw new SocialApiError(`Asset file is missing: ${asset.name}`);
  const buffer = fs.readFileSync(full);
  return {
    blob: new Blob([new Uint8Array(buffer)], { type: asset.mime_type || "application/octet-stream" }),
    name: asset.name,
  };
}

async function uploadMedia(assets: AssetRow[]): Promise<string[]> {
  const ids: string[] = [];
  for (const asset of assets) {
    const file = assetBlob(asset);
    const form = new FormData();
    form.append("file", file.blob, file.name);
    const payload = await apiCall<{ id?: string; media_id?: string }>(
      "/media/upload",
      { method: "POST", body: form },
      120_000
    );
    const id = payload.id ?? payload.media_id;
    if (!id) throw new SocialApiError(`SocialAPI did not return a media ID for ${asset.name}.`);
    ids.push(id);
  }
  return ids;
}

function variantText(variant: PostVariant): string {
  const limit = platformMeta(variant.platform).limit;
  const combined = [variant.caption.trim(), variant.hashtags.trim()].filter(Boolean).join("\n\n");
  return truncate(combined, limit);
}

type SocialTarget = {
  platform: string;
  status?: string;
  permalink?: string;
  platform_post_id?: string;
  error?: { message?: string };
};

function resultForTarget(target: SocialTarget): PublishResult {
  if (target.status === "published") {
    return {
      status: "published",
      externalId: target.platform_post_id,
      externalUrl: target.permalink,
    };
  }
  if (target.status === "failed") {
    return {
      status: "failed",
      error: target.error?.message || "SocialAPI failed this target.",
      externalUrl: target.permalink,
    };
  }
  return {
    status: "assisted_required",
    error: target.error?.message || "SocialAPI did not publish this target.",
    externalUrl: target.permalink,
  };
}

export async function publishViaSocialApi(input: {
  post: Post;
  variants: PostVariant[];
  assets: AssetRow[];
  profile: SocialApiProfile;
}): Promise<{ results: Map<string, PublishResult>; usage: SocialApiUsageView; error?: string; fallbackAll?: boolean }> {
  const results = new Map<string, PublishResult>();
  const usage = socialApiUsage();
  if (!socialApiConfigured()) {
    for (const variant of input.variants) {
      results.set(variant.platform, { status: "assisted_required", error: "SocialAPI is not configured." });
    }
    return { results, usage, fallbackAll: true, error: "SocialAPI is not configured." };
  }
  if (!usage.allowed) {
    for (const variant of input.variants) {
      results.set(variant.platform, {
        status: "assisted_required",
        error: `SocialAPI free limit reached (${usage.used}/${usage.limit}). Resets ${new Date(usage.nextReset).toLocaleDateString("en-GB")}.`,
      });
    }
    return { results, usage, fallbackAll: true, error: "SocialAPI free limit reached." };
  }

  const accountByPlatform = new Map(
    input.profile.accounts.map((account) => [account.platform, account.account_id])
  );
  const supported = input.variants.filter((variant) => accountByPlatform.has(variant.platform));
  for (const variant of input.variants) {
    if (!accountByPlatform.has(variant.platform)) {
      results.set(variant.platform, {
        status: "assisted_required",
        error: "SocialAPI has no connected account for this platform.",
      });
    }
  }
  if (!supported.length) {
    return { results, usage, fallbackAll: true, error: "No SocialAPI account matches this post." };
  }

  let mediaIds: string[] = [];
  try {
    if (input.assets.length) {
      const video = input.assets.find((asset) => asset.kind === "video");
      mediaIds = await uploadMedia(video ? [video] : input.assets.filter((asset) => asset.kind === "image").slice(0, 10));
    }
  } catch (error) {
    const message = `SocialAPI media upload failed: ${(error as Error).message}`;
    for (const variant of supported) {
      results.set(variant.platform, { status: "assisted_required", error: message });
    }
    return { results, usage, error: message };
  }

  const targets = supported.map((variant) => ({
    account_id: accountByPlatform.get(variant.platform),
    text: variantText(variant),
    ...(mediaIds.length
      ? { media: mediaIds.map((id) => ({ source: id, source_type: "media_id" })) }
      : {}),
  }));

  try {
    const created = await apiCall<{ id?: string; status?: string; targets?: SocialTarget[] }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        text: variantText(supported[0]),
        publish_now: true,
        targets,
      }),
    });
    const postId = created.id;
    if (!postId) throw new SocialApiError("SocialAPI did not return a post ID.");
    let payload = created;
    let attempts = 0;
    while (
      (payload.status === "publishing" || payload.status === "scheduled" || !payload.targets) &&
      attempts < 30
    ) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      payload = await apiCall<{ id?: string; status?: string; targets?: SocialTarget[] }>(
        `/posts/${encodeURIComponent(postId)}`
      );
      attempts += 1;
    }
    for (const target of payload.targets ?? []) {
      const platform = localPlatform(target.platform);
      if (supported.some((variant) => variant.platform === platform)) {
        results.set(platform, resultForTarget(target));
      }
    }
    for (const variant of supported) {
      if (!results.has(variant.platform)) {
        results.set(variant.platform, {
          status: "assisted_required",
          error: "SocialAPI returned no result for this target.",
        });
      }
    }
    const updated = storeUsage(usage.used + 1, usage.used + 1 >= usage.limit);
    return { results, usage: updated };
  } catch (error) {
    if (error instanceof SocialApiError && error.status === 429) {
      const exhausted = markSocialApiExhausted();
      for (const variant of supported) {
        results.set(variant.platform, {
          status: "assisted_required",
          error: `SocialAPI free limit reached. ${error.message}`,
        });
      }
      return { results, usage: exhausted, fallbackAll: true, error: error.message };
    }
    const message = `SocialAPI error: ${(error as Error).message}`;
    for (const variant of supported) {
      results.set(variant.platform, { status: "assisted_required", error: message });
    }
    return { results, usage, error: message };
  }
}
