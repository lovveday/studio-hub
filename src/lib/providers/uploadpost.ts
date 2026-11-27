import crypto from "node:crypto";
import fs from "node:fs";
import { all, get, run } from "../db";
import { localAssetFullPath, publicR2Url } from "../storage";
import { platformMeta } from "../platforms";
import { truncate } from "../utils";
import type {
  AssetRow,
  Post,
  PostVariant,
  ProviderProfile,
  ProviderUsage,
} from "../types";
import type { PublishResult } from "../publishers/types";
import { integrationConfig, integrationSecret } from "./credentials";
import { getAppUrl } from "../app-url";

const API_BASE = (process.env.UPLOADPOST_API_BASE || "https://api.upload-post.com").replace(/\/$/, "");
const PROVIDER = "uploadpost";

export type UploadPostPlan = "free" | "paid";

export type ProviderProfileView = ProviderProfile & {
  connectedPlatforms: string[];
};

export type ProviderUsageView = {
  provider: string;
  period: string;
  used: number;
  limit: number;
  lastReset: string | null;
  nextReset: string;
  exhausted: boolean;
  allowed: boolean;
  plan: UploadPostPlan;
};

export type ProviderPublishOutcome = {
  results: Map<string, PublishResult>;
  requestId?: string;
  usage?: ProviderUsageView;
  fallbackAll?: boolean;
  error?: string;
};

export class UploadPostError extends Error {
  status: number;
  code: string;
  body: unknown;

  constructor(message: string, status = 500, code = "uploadpost_error", body: unknown = null) {
    super(message);
    this.name = "UploadPostError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function uploadPostApiKey(): string {
  return integrationSecret("uploadpost", "publishing") || process.env.UPLOADPOST_API_KEY || "";
}

export function uploadPostConfigured(): boolean {
  return Boolean(uploadPostApiKey());
}

export function uploadPostPlan(): UploadPostPlan {
  const config = integrationConfig("uploadpost");
  return String(config.plan ?? process.env.UPLOADPOST_PLAN) === "paid" ? "paid" : "free";
}

export function uploadPostLimit(): number {
  const config = integrationConfig("uploadpost");
  const configured = Number(config.freeLimit ?? process.env.UPLOADPOST_FREE_LIMIT ?? "10");
  return Number.isFinite(configured) && configured > 0 ? configured : 10;
}

export function uploadPostAppUrl(): string {
  return getAppUrl();
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function nextResetIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function authHeaders(): Record<string, string> {
  const key = uploadPostApiKey();
  if (!key) throw new UploadPostError("UPLOADPOST_API_KEY is not set.", 401, "missing_api_key");
  return { Authorization: `Apikey ${key}` };
}

async function parseError(response: Response): Promise<UploadPostError> {
  let body: unknown = null;
  let message = `Upload-Post returned ${response.status}.`;
  let code = "uploadpost_error";
  try {
    body = await response.json();
    const record = body as Record<string, unknown>;
    message =
      String(record.message || record.error || record.detail || message).slice(0, 500) ||
      message;
    code = String(record.error_code || record.code || code);
  } catch {
    // Keep the status message when the body is not JSON.
  }
  return new UploadPostError(message, response.status, code, body);
}

async function apiCall<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 45_000
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

function parseConnectedPlatforms(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const accounts = raw as Record<string, unknown>;
  return Object.entries(accounts)
    .filter(([, value]) => {
      if (!value) return false;
      if (typeof value === "object") return Object.keys(value as object).length > 0;
      return true;
    })
    .map(([platform]) => platform);
}

export function providerProfileForBrand(brandId: string): ProviderProfileView | undefined {
  const row = get<ProviderProfile>(
    "SELECT * FROM provider_profiles WHERE brand_id = ? AND provider = ?",
    [brandId, PROVIDER]
  );
  return row ? withConnectedPlatforms(row) : undefined;
}

function withConnectedPlatforms(row: ProviderProfile): ProviderProfileView {
  let connectedPlatforms: string[] = [];
  try {
    connectedPlatforms = JSON.parse(row.connected_platforms_json || "[]") as string[];
  } catch {
    connectedPlatforms = [];
  }
  return { ...row, connectedPlatforms };
}

export function listProviderProfiles(): ProviderProfileView[] {
  return all<ProviderProfile>(
    "SELECT * FROM provider_profiles WHERE provider = ? ORDER BY created_at ASC",
    [PROVIDER]
  ).map(withConnectedPlatforms);
}

export function saveProviderProfile(input: {
  brandId: string;
  username: string;
  displayName?: string;
  connectedPlatforms?: string[];
  status?: "connected" | "needs_reconnect" | "disconnected";
}): ProviderProfileView {
  const now = new Date().toISOString();
  const existing = get<ProviderProfile>(
    "SELECT * FROM provider_profiles WHERE brand_id = ? AND provider = ?",
    [input.brandId, PROVIDER]
  );
  const id = existing?.id ?? crypto.randomUUID();
  const connected = JSON.stringify(input.connectedPlatforms ?? []);
  if (existing) {
    run(
      `UPDATE provider_profiles
       SET profile_username = ?, display_name = ?, connected_platforms_json = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.username,
        input.displayName ?? existing.display_name,
        connected,
        input.status ?? existing.status,
        now,
        id,
      ]
    );
  } else {
    run(
      `INSERT INTO provider_profiles
       (id, brand_id, provider, profile_username, display_name, connected_platforms_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.brandId,
        PROVIDER,
        input.username,
        input.displayName ?? input.username,
        connected,
        input.status ?? "connected",
        now,
        now,
      ]
    );
  }
  return providerProfileForBrand(input.brandId)!;
}

export function deleteProviderProfile(brandId: string): void {
  run("DELETE FROM provider_profiles WHERE brand_id = ? AND provider = ?", [brandId, PROVIDER]);
}

export type RemoteProfile = {
  username: string;
  displayName: string;
  connectedPlatforms: string[];
  needsReconnect: boolean;
  raw: unknown;
};

function remoteProfileFromPayload(payload: unknown): RemoteProfile {
  const record = (payload ?? {}) as Record<string, unknown>;
  const profile = (record.profile ?? record) as Record<string, unknown>;
  const accounts = profile.social_accounts;
  const needsReconnect =
    Boolean((profile as Record<string, unknown>).reauth_required) ||
    (accounts && typeof accounts === "object"
      ? Object.values(accounts as Record<string, unknown>).some(
          (account) =>
            Boolean(account) &&
            typeof account === "object" &&
            Boolean((account as Record<string, unknown>).reauth_required)
        )
      : false);
  return {
    username: String(profile.username ?? ""),
    displayName: String(profile.display_name ?? profile.username ?? ""),
    connectedPlatforms: parseConnectedPlatforms(accounts),
    needsReconnect,
    raw: payload,
  };
}

export async function fetchRemoteProfile(username: string): Promise<RemoteProfile> {
  const payload = await apiCall<unknown>(
    `/api/uploadposts/users/${encodeURIComponent(username)}`
  );
  return remoteProfileFromPayload(payload);
}

export async function createRemoteProfile(
  username: string,
  displayName: string
): Promise<RemoteProfile> {
  const payload = await apiCall<unknown>("/api/uploadposts/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, display_name: displayName }),
  });
  const remote = remoteProfileFromPayload(payload);
  return remote.username ? remote : { ...remote, username, displayName };
}

export async function listRemoteProfiles(): Promise<
  Array<{ username: string; displayName: string; connectedPlatforms: string[] }>
> {
  const payload = await apiCall<{
    profiles?: Array<Record<string, unknown>>;
  }>("/api/uploadposts/users");
  return (payload.profiles ?? []).map((profile) => ({
    username: String(profile.username ?? ""),
    displayName: String(profile.display_name ?? profile.username ?? ""),
    connectedPlatforms: parseConnectedPlatforms(profile.social_accounts),
  }));
}

export async function generateConnectUrl(username: string): Promise<string> {
  const payload = await apiCall<{ access_url?: string }>(
    "/api/uploadposts/users/generate-jwt",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        redirect_url: `${uploadPostAppUrl()}/settings?provider=connected`,
        connect_title: "Connect your client channels",
        connect_description:
          "Connect the social accounts this Studio Hub brand is allowed to publish to.",
      }),
    }
  );
  if (!payload.access_url) {
    throw new UploadPostError("Upload-Post did not return a connect URL.", 502);
  }
  return payload.access_url;
}

/* -------------------------------------------------------------------------- */
/* Usage / free-tier guard                                                    */
/* -------------------------------------------------------------------------- */

export function providerUsage(): ProviderUsageView {
  const period = currentPeriod();
  const row = get<ProviderUsage>(
    "SELECT * FROM provider_usage WHERE provider = ? AND period = ?",
    [PROVIDER, period]
  );
  const plan = uploadPostPlan();
  const limit =
    plan === "free" ? uploadPostLimit() : Math.max(0, Number(row?.limit_value ?? 0));
  const used = Number(row?.used ?? 0);
  const exhausted = plan === "free" && (used >= limit || Boolean(row?.exhausted));
  return {
    provider: PROVIDER,
    period,
    used,
    limit,
    lastReset: row?.last_reset ?? null,
    nextReset: nextResetIso(),
    exhausted,
    allowed: plan === "paid" || !exhausted,
    plan,
  };
}

function storeUsage(input: {
  used: number;
  limit: number;
  lastReset?: string | null;
  exhausted?: boolean;
}): ProviderUsageView {
  const period = currentPeriod();
  const now = new Date().toISOString();
  run(
    `INSERT INTO provider_usage (provider, period, used, limit_value, last_reset, exhausted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, period) DO UPDATE SET
       used = excluded.used,
       limit_value = excluded.limit_value,
       last_reset = COALESCE(excluded.last_reset, provider_usage.last_reset),
       exhausted = excluded.exhausted,
       updated_at = excluded.updated_at`,
    [
      PROVIDER,
      period,
      Math.max(0, input.used),
      Math.max(0, input.limit),
      input.lastReset ?? null,
      input.exhausted ? 1 : 0,
      now,
    ]
  );
  return providerUsage();
}

function recordUsageFromPayload(payload: unknown): ProviderUsageView | null {
  const usage = (payload as { usage?: Record<string, unknown> } | null)?.usage;
  if (!usage) return null;
  const used = Number(usage.count ?? usage.used ?? 0);
  const limit = Number(usage.limit ?? uploadPostLimit());
  const lastReset = usage.last_reset ? String(usage.last_reset) : null;
  return storeUsage({
    used,
    limit,
    lastReset,
    exhausted: uploadPostPlan() === "free" && used >= limit,
  });
}

function incrementUsage(): ProviderUsageView {
  const current = providerUsage();
  const used = current.used + 1;
  return storeUsage({
    used,
    limit: current.limit,
    lastReset: current.lastReset,
    exhausted: current.plan === "free" && used >= current.limit,
  });
}

export function markProviderExhausted(message: string): ProviderUsageView {
  const current = providerUsage();
  return storeUsage({
    used: current.limit,
    limit: current.limit,
    lastReset: current.lastReset,
    exhausted: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Publishing                                                                 */
/* -------------------------------------------------------------------------- */

type MediaKind = "video" | "photos" | "text";

const VIDEO_PLATFORMS = new Set(["tiktok", "instagram", "youtube", "facebook", "linkedin", "x"]);
const PHOTO_PLATFORMS = new Set(["tiktok", "instagram", "facebook", "linkedin", "x"]);
const TEXT_PLATFORMS = new Set(["x", "linkedin", "facebook"]);

function supportsPlatform(platform: string, kind: MediaKind): boolean {
  if (uploadPostPlan() === "free" && platform === "tiktok") return false;
  if (kind === "video") return VIDEO_PLATFORMS.has(platform);
  if (kind === "photos") return PHOTO_PLATFORMS.has(platform);
  return TEXT_PLATFORMS.has(platform);
}

export function uploadPostCapability(platform: string, kind: MediaKind): boolean {
  return supportsPlatform(platform, kind);
}

function chooseMedia(assets: AssetRow[]): { kind: MediaKind; assets: AssetRow[] } {
  const video = assets.find((asset) => asset.kind === "video");
  if (video) return { kind: "video", assets: [video] };
  const photos = assets.filter((asset) => asset.kind === "image").slice(0, 10);
  if (photos.length) return { kind: "photos", assets: photos };
  return { kind: "text", assets: [] };
}

function fileForAsset(asset: AssetRow): { blob: Blob; name: string } | { url: string } {
  if (asset.storage_provider === "r2") {
    const url = publicR2Url(asset.file_path);
    if (!url) {
      throw new UploadPostError(
        `Asset ${asset.name} is in R2 but R2_PUBLIC_BASE_URL is not set; Upload-Post needs a public URL.`,
        400,
        "asset_not_public"
      );
    }
    return { url };
  }
  const full = localAssetFullPath(asset.file_path);
  if (!fs.existsSync(full)) {
    throw new UploadPostError(`Asset file is missing: ${asset.name}`, 404, "asset_missing");
  }
  const buffer = fs.readFileSync(full);
  return {
    blob: new Blob([new Uint8Array(buffer)], {
      type: asset.mime_type || "application/octet-stream",
    }),
    name: asset.name,
  };
}

function variantText(variant: PostVariant): string {
  const limit = platformMeta(variant.platform).limit;
  const combined = [variant.caption.trim(), variant.hashtags.trim()].filter(Boolean).join("\n\n");
  return truncate(combined, limit);
}

function requestIdFor(postId: string, variants: PostVariant[]): string {
  const hash = crypto
    .createHash("sha1")
    .update(variants.map((variant) => `${variant.id}:${variant.platform}`).sort().join("|"))
    .digest("hex")
    .slice(0, 10);
  return `smh-${postId}-${hash}`;
}

function buildForm(input: {
  post: Post;
  variants: PostVariant[];
  media: { kind: MediaKind; assets: AssetRow[] };
  profile: ProviderProfileView;
  requestId: string;
}): FormData {
  const form = new FormData();
  form.append("user", input.profile.profile_username);
  form.append("async_upload", "true");
  form.append("external_id", input.post.id);
  form.append("request_id", input.requestId);

  const firstText = variantText(input.variants[0]);
  form.append("title", input.media.kind === "video" ? truncate(firstText, 100) : firstText);
  form.append("description", firstText);

  for (const variant of input.variants) {
    const text = variantText(variant);
    form.append("platform[]", variant.platform);
    form.append(`${variant.platform}_title`, text);
    if (variant.first_comment.trim()) {
      form.append(`${variant.platform}_first_comment`, variant.first_comment.trim());
    }
    if (!form.has("first_comment") && variant.first_comment.trim()) {
      form.append("first_comment", variant.first_comment.trim());
    }
  }

  if (input.media.kind === "video") {
    const file = fileForAsset(input.media.assets[0]);
    if ("url" in file) {
      form.append("video", file.url);
    } else {
      form.append("video", file.blob, file.name);
    }
  } else if (input.media.kind === "photos") {
    for (const asset of input.media.assets) {
      const file = fileForAsset(asset);
      if ("url" in file) {
        form.append("photos[]", file.url);
      } else {
        form.append("photos[]", file.blob, file.name);
      }
    }
  }

  return form;
}

function resultFromRecord(
  platform: string,
  record: Record<string, unknown>
): PublishResult {
  const skipped = Boolean(record.skipped) || record.status === "skipped";
  const success = record.success === true || record.status === "completed";
  const error = String(record.error || record.message || "Upload-Post did not publish this platform.").slice(0, 500);
  const url = String(record.post_url || record.url || "").trim();
  const externalId = String(record.platform_post_id || record.post_id || "").trim();
  if (skipped) {
    return {
      status: "assisted_required",
      error: "That platform is not connected inside Upload-Post. Use the assisted kit.",
    };
  }
  if (record.fallback_to_inbox === true) {
    return {
      status: "assisted_required",
      externalId: externalId || undefined,
      externalUrl: url || undefined,
      error:
        "TikTok delivered the video to the account inbox instead of publishing it. Open TikTok and publish it from drafts.",
    };
  }
  if (!success) {
    return {
      status: "assisted_required",
      externalId: externalId || undefined,
      externalUrl: url || undefined,
      error: error || `Upload-Post failed for ${platform}.`,
    };
  }
  return {
    status: "published",
    externalId: externalId || undefined,
    externalUrl: url || undefined,
  };
}

function mapResults(payload: unknown): Map<string, PublishResult> {
  const results = new Map<string, PublishResult>();
  const record = (payload ?? {}) as Record<string, unknown>;
  if (record.results && !Array.isArray(record.results) && typeof record.results === "object") {
    for (const [platform, value] of Object.entries(
      record.results as Record<string, Record<string, unknown>>
    )) {
      results.set(platform, resultFromRecord(platform, value ?? {}));
    }
    return results;
  }
  if (Array.isArray(record.results)) {
    for (const item of record.results as Array<Record<string, unknown>>) {
      const platform = String(item.platform ?? "");
      if (platform) results.set(platform, resultFromRecord(platform, item));
    }
  }
  return results;
}

async function pollUpload(requestId: string, timeoutMs = 120_000): Promise<Map<string, PublishResult>> {
  const started = Date.now();
  let last: unknown = null;
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      last = await apiCall<unknown>(
        `/api/uploadposts/status?request_id=${encodeURIComponent(requestId)}`,
        {},
        30_000
      );
    } catch {
      continue;
    }
    const status = String((last as { status?: string })?.status ?? "");
    if (status === "completed" || status === "failed") {
      return mapResults(last);
    }
  }
  throw new UploadPostError(
    "Upload-Post is still processing this upload. Check the provider before retrying so it is not published twice.",
    504,
    "upload_timeout",
    last
  );
}

export async function publishViaUploadPost(input: {
  post: Post;
  variants: PostVariant[];
  assets: AssetRow[];
  profile: ProviderProfileView;
}): Promise<ProviderPublishOutcome> {
  const results = new Map<string, PublishResult>();
  const usage = providerUsage();
  if (!uploadPostConfigured()) {
    for (const variant of input.variants) {
      results.set(variant.platform, {
        status: "assisted_required",
        error: "Upload-Post is not configured. Use the assisted kit.",
      });
    }
    return { results, usage, fallbackAll: true, error: "Upload-Post is not configured." };
  }
  if (!usage.allowed) {
    const reset = new Date(usage.nextReset).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const message = `Upload-Post free limit reached (${usage.used}/${usage.limit}). It resets on ${reset}; use the assisted kit until then.`;
    for (const variant of input.variants) {
      results.set(variant.platform, { status: "assisted_required", error: message });
    }
    return { results, usage, fallbackAll: true, error: message };
  }

  const media = chooseMedia(input.assets);
  const supported: PostVariant[] = [];
  for (const variant of input.variants) {
    if (supportsPlatform(variant.platform, media.kind)) {
      supported.push(variant);
    } else {
      const reason =
        uploadPostPlan() === "free" && variant.platform === "tiktok"
          ? "TikTok needs a paid Upload-Post plan. Use the assisted kit."
          : media.kind === "text"
            ? "Upload-Post text posts do not cover this platform. Use the assisted kit."
            : media.kind === "photos"
              ? "Upload-Post photo posts do not cover this platform. Use the assisted kit."
              : "That platform is not supported by this Upload-Post upload. Use the assisted kit.";
      results.set(variant.platform, { status: "assisted_required", error: reason });
    }
  }
  if (!supported.length) {
    return { results, usage, fallbackAll: true, error: "No variant can use Upload-Post." };
  }

  const requestId = requestIdFor(input.post.id, supported);
  const endpoint =
    media.kind === "video"
      ? "/api/upload"
      : media.kind === "photos"
        ? "/api/upload_photos"
        : "/api/upload_text";
  let form: FormData;
  try {
    form = buildForm({
      post: input.post,
      variants: supported,
      media,
      profile: input.profile,
      requestId,
    });
  } catch (error) {
    const message = (error as Error).message;
    for (const variant of supported) {
      results.set(variant.platform, { status: "assisted_required", error: message });
    }
    return { results, usage, error: message };
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Idempotency-Key": requestId,
      },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });
    if (!response.ok) {
      const error = await parseError(response);
      if (error.status === 429) {
        const exhausted = markProviderExhausted(error.message);
        for (const variant of supported) {
          results.set(variant.platform, {
            status: "assisted_required",
            error: `Upload-Post free limit reached. ${error.message} Use the assisted kit until the next reset.`,
          });
        }
        return { results, usage: exhausted, fallbackAll: true, error: error.message, requestId };
      }
      if (error.status === 401 || error.status === 403) {
        const message = `Upload-Post rejected the request: ${error.message}`;
        for (const variant of supported) {
          results.set(variant.platform, { status: "assisted_required", error: message });
        }
        return { results, usage, fallbackAll: true, error: message, requestId };
      }
      const message = `Upload-Post error: ${error.message}`;
      for (const variant of supported) {
        results.set(variant.platform, { status: "assisted_required", error: message });
      }
      return { results, usage, error: message, requestId };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const updatedUsage = recordUsageFromPayload(payload) ?? incrementUsage();
    let mapped = mapResults(payload);
    const requestFromPayload = String(payload.request_id ?? "");
    if (mapped.size === 0 && (requestFromPayload || requestId)) {
      try {
        mapped = await pollUpload(requestFromPayload || requestId);
      } catch (error) {
        const message = (error as Error).message;
        for (const variant of supported) {
          results.set(variant.platform, {
            status: "assisted_required",
            error: message,
          });
        }
        return {
          results,
          usage: updatedUsage,
          error: message,
          requestId: requestFromPayload || requestId,
        };
      }
    }

    for (const variant of supported) {
      results.set(
        variant.platform,
        mapped.get(variant.platform) ?? {
          status: "assisted_required",
          error: "Upload-Post did not return a result for this platform. Check the provider before retrying.",
        }
      );
    }
    return {
      results,
      usage: updatedUsage,
      requestId: requestFromPayload || requestId,
    };
  } catch (error) {
    if (error instanceof UploadPostError && error.code === "upload_timeout") {
      for (const variant of supported) {
        results.set(variant.platform, { status: "failed", error: error.message });
      }
      return { results, usage, error: error.message, requestId };
    }
    const message = `Upload-Post could not be reached: ${(error as Error).message}`;
    for (const variant of supported) {
      results.set(variant.platform, { status: "assisted_required", error: message });
    }
    return { results, usage, error: message, requestId };
  }
}
