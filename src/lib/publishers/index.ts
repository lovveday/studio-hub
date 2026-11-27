import crypto from "node:crypto";
import { get, run } from "../db";
import {
  getSocialAccountForPlatform,
  getPost,
  getPostVariants,
  getPublishedAttempt,
  listPostAssets,
  logActivity,
} from "../data";
import { safeJson } from "../utils";
import { MockAdapter } from "./mock";
import type { PublishResult } from "./types";
import {
  providerProfileForBrand,
  providerUsage,
  publishViaUploadPost,
  rememberUploadPostPlatforms,
  uploadPostConfigured,
} from "../providers/uploadpost";
import {
  publishViaSocialApi,
  socialApiConfigured,
  socialApiProfile,
  socialApiUsage,
} from "../providers/socialapi";

type PublishSummary = {
  published: number;
  assisted: number;
  failed: number;
  total: number;
  results: Array<{ platform: string; status: PublishResult["status"]; error?: string }>;
};

function insertAttempt(input: {
  postId: string;
  platform: string;
  accountId: string | null;
  result: PublishResult;
  request?: unknown;
  response?: unknown;
}) {
  run(
    `INSERT INTO publish_attempts
     (id, post_id, platform, social_account_id, status, attempt, external_id, external_url, error, request_json, response_json, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.postId,
      input.platform,
      input.accountId,
      input.result.status,
      input.result.externalId ?? null,
      input.result.externalUrl ?? null,
      input.result.error ?? null,
      JSON.stringify(input.request ?? { platform: input.platform }),
      JSON.stringify(
        input.response ?? {
          status: input.result.status,
          externalId: input.result.externalId ?? null,
        }
      ),
      new Date().toISOString(),
    ]
  );
}

function finishPost(
  postId: string,
  summary: PublishSummary,
  brandId: string,
  userId: string | null,
  detail: string
) {
  const now = new Date().toISOString();
  if (summary.failed > 0) {
    run("UPDATE posts SET status = 'failed', updated_at = ? WHERE id = ?", [now, postId]);
  } else if (summary.published > 0 && summary.assisted === 0) {
    run("UPDATE posts SET status = 'published', updated_at = ? WHERE id = ?", [now, postId]);
  } else if (summary.published > 0 || summary.assisted > 0) {
    run("UPDATE posts SET status = 'ready', updated_at = ? WHERE id = ?", [now, postId]);
  }

  logActivity({
    brandId,
    userId,
    action: "Publisher ran",
    entity: "post",
    entityId: postId,
    detail: `${summary.published} published · ${summary.assisted} assisted · ${summary.failed} failed${detail}`,
  });
}

/**
 * Publish a post through every connected channel.
 * Real adapters are not enabled yet; any non-mock account is left as an assisted target.
 */
export async function publishPost(postId: string, userId: string | null): Promise<PublishSummary> {
  const post = getPost(postId);
  if (!post) throw new Error("Post not found.");
  if (post.status === "published") {
    return { published: 0, assisted: 0, failed: 0, total: 0, results: [] };
  }

  const variants = getPostVariants(postId);
  const assets = listPostAssets(postId).map((row) => row.asset);
  const summary: PublishSummary = {
    published: 0,
    assisted: 0,
    failed: 0,
    total: variants.length,
    results: [],
  };

  const provider = providerProfileForBrand(post.brand_id);
  const primaryAvailable = Boolean(
    provider && uploadPostConfigured() && providerUsage().allowed
  );
  const secondaryProfile = socialApiProfile(post.brand_id);
  const secondaryAvailable = Boolean(
    secondaryProfile && socialApiConfigured() && socialApiUsage().allowed
  );

  if (!primaryAvailable && secondaryAvailable && secondaryProfile) {
    const pending = variants.filter((variant) => !getPublishedAttempt(postId, variant.platform));
    if (pending.length === 0) {
      for (const variant of variants) {
        summary.published += 1;
        summary.results.push({ platform: variant.platform, status: "published" });
      }
    } else {
      try {
        const outcome = await publishViaSocialApi({
          post,
          variants: pending,
          assets,
          profile: secondaryProfile,
        });
        for (const variant of variants) {
          if (!pending.some((item) => item.id === variant.id)) {
            summary.published += 1;
            summary.results.push({ platform: variant.platform, status: "published" });
            continue;
          }
          const result = outcome.results.get(variant.platform) ?? {
            status: "assisted_required" as const,
            error: "SocialAPI did not return a result for this platform.",
          };
          insertAttempt({
            postId,
            platform: variant.platform,
            accountId: null,
            result,
            request: {
              provider: "socialapi",
              profile: secondaryProfile.remote_id || secondaryProfile.profile_username,
            },
            response: {
              status: result.status,
              externalId: result.externalId ?? null,
              usage: outcome.usage ?? null,
              error: result.error ?? outcome.error ?? null,
            },
          });
          if (result.status === "published") summary.published += 1;
          else if (result.status === "failed") summary.failed += 1;
          else summary.assisted += 1;
          summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
        }
      } catch (error) {
        for (const variant of pending) {
          const result: PublishResult = {
            status: "assisted_required",
            error: `SocialAPI failed: ${(error as Error).message}`,
          };
          insertAttempt({
            postId,
            platform: variant.platform,
            accountId: null,
            result,
            request: { provider: "socialapi" },
          });
          summary.assisted += 1;
          summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
        }
      }
    }
    finishPost(postId, summary, post.brand_id, userId, " · socialapi");
    return summary;
  }

  const hasRealPublishingProvider = uploadPostConfigured() || socialApiConfigured();
  if (hasRealPublishingProvider && !primaryAvailable && !secondaryAvailable) {
    const pending = variants.filter((variant) => !getPublishedAttempt(postId, variant.platform));
    const reason = !provider && !secondaryProfile
      ? "No publishing profile is connected. Use the assisted kit."
      : "Both publishing providers are exhausted or unavailable. Use the assisted kit until the next reset.";
    for (const variant of pending) {
      const result: PublishResult = { status: "assisted_required", error: reason };
      insertAttempt({
        postId,
        platform: variant.platform,
        accountId: null,
        result,
        request: { provider: "assisted", reason },
      });
      summary.assisted += 1;
      summary.results.push({ platform: variant.platform, status: result.status, error: reason });
    }
    for (const variant of variants) {
      if (!pending.some((item) => item.id === variant.id)) {
        summary.published += 1;
        summary.results.push({ platform: variant.platform, status: "published" });
      }
    }
    finishPost(postId, summary, post.brand_id, userId, " · assisted (no provider capacity)");
    return summary;
  }

  if (provider && uploadPostConfigured() && providerUsage().allowed) {
    const pending = variants.filter((variant) => !getPublishedAttempt(postId, variant.platform));
    if (pending.length === 0) {
      for (const variant of variants) {
        summary.published += 1;
        summary.results.push({ platform: variant.platform, status: "published" });
      }
    } else {
      try {
        const outcome = await publishViaUploadPost({
          post,
          variants: pending,
          assets,
          profile: provider,
        });
        rememberUploadPostPlatforms(
          post.brand_id,
          [...outcome.results.entries()]
            .filter(([, result]) => result.status === "published")
            .map(([platform]) => platform)
        );
        for (const variant of variants) {
          if (!pending.some((item) => item.id === variant.id)) {
            summary.published += 1;
            summary.results.push({ platform: variant.platform, status: "published" });
            continue;
          }
          const result = outcome.results.get(variant.platform) ?? {
            status: "assisted_required" as const,
            error: "Upload-Post did not return a result for this platform. Use the assisted kit.",
          };
          insertAttempt({
            postId,
            platform: variant.platform,
            accountId: null,
            result,
            request: {
              provider: "uploadpost",
              profile: provider.profile_username,
              requestId: outcome.requestId,
            },
            response: {
              status: result.status,
              externalId: result.externalId ?? null,
              usage: outcome.usage ?? null,
              error: result.error ?? outcome.error ?? null,
            },
          });
          if (result.status === "published") summary.published += 1;
          else if (result.status === "failed") summary.failed += 1;
          else summary.assisted += 1;
          summary.results.push({
            platform: variant.platform,
            status: result.status,
            error: result.error,
          });
        }
      } catch (error) {
        for (const variant of pending) {
          const result: PublishResult = {
            status: "assisted_required",
            error: `Upload-Post failed: ${(error as Error).message}`,
          };
          insertAttempt({
            postId,
            platform: variant.platform,
            accountId: null,
            result,
            request: { provider: "uploadpost", profile: provider.profile_username },
          });
          summary.assisted += 1;
          summary.results.push({
            platform: variant.platform,
            status: result.status,
            error: result.error,
          });
        }
      }
    }
    finishPost(postId, summary, post.brand_id, userId, " · uploadpost");
    return summary;
  }

  for (const variant of variants) {
    const existing = getPublishedAttempt(postId, variant.platform);
    if (existing) {
      summary.published += 1;
      summary.results.push({ platform: variant.platform, status: "published" });
      continue;
    }

    const account = getSocialAccountForPlatform(post.brand_id, variant.platform);
    if (!account) {
      const result: PublishResult = {
        status: "assisted_required",
        error: "No connected account for this platform.",
      };
      insertAttempt({ postId, platform: variant.platform, accountId: null, result });
      summary.assisted += 1;
      summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
      continue;
    }

    const metadata = safeJson<{ mock?: boolean }>(account.metadata_json, {});
    if (!metadata.mock) {
      const result: PublishResult = {
        status: "assisted_required",
        error: "No automatic publisher is connected for this channel. Use the assisted kit.",
      };
      insertAttempt({
        postId,
        platform: variant.platform,
        accountId: account.id,
        result,
      });
      summary.assisted += 1;
      summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
      continue;
    }

    try {
      const adapter = new MockAdapter();
      const result = await adapter.publish({ post, variant, assets, account });
      insertAttempt({
        postId,
        platform: variant.platform,
        accountId: account.id,
        result,
      });
      if (result.status === "published") summary.published += 1;
      else if (result.status === "failed") summary.failed += 1;
      else summary.assisted += 1;
      summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
    } catch (error) {
      const result: PublishResult = { status: "failed", error: (error as Error).message };
      insertAttempt({ postId, platform: variant.platform, accountId: account.id, result });
      summary.failed += 1;
      summary.results.push({ platform: variant.platform, status: result.status, error: result.error });
    }
  }

  finishPost(postId, summary, post.brand_id, userId, "");
  return summary;
}
