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
      JSON.stringify({ platform: input.platform }),
      JSON.stringify({ status: input.result.status, externalId: input.result.externalId ?? null }),
      new Date().toISOString(),
    ]
  );
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
        error: "The real adapter is not enabled yet. Use the assisted post kit.",
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

  const now = new Date().toISOString();
  if (summary.failed > 0) {
    run("UPDATE posts SET status = 'failed', updated_at = ? WHERE id = ?", [now, postId]);
  } else if (summary.published > 0 && summary.assisted === 0) {
    run("UPDATE posts SET status = 'published', updated_at = ? WHERE id = ?", [now, postId]);
  } else if (summary.published > 0 || summary.assisted > 0) {
    run("UPDATE posts SET status = 'ready', updated_at = ? WHERE id = ?", [now, postId]);
  }

  logActivity({
    brandId: post.brand_id,
    userId,
    action: "Publisher ran",
    entity: "post",
    entityId: postId,
    detail: `${summary.published} published · ${summary.assisted} assisted · ${summary.failed} failed`,
  });

  return summary;
}
