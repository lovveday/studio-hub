"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, canApprove } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { get, run } from "@/lib/db";
import { uuid, randomToken } from "@/lib/password";
import { generateVariants } from "@/lib/ai";
import { getBrand, getBrandProfile, getPost, getPostVariants, listFacts, logActivity } from "@/lib/data";
import { retrieveContext } from "@/lib/knowledge";
import type { Platform } from "@/lib/platforms";

function parseDate(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function platformsFromForm(formData: FormData): Platform[] {
  return formData
    .getAll("platforms")
    .map(String)
    .filter((value): value is Platform =>
      ["facebook", "instagram", "tiktok", "x", "linkedin", "youtube"].includes(value)
    );
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const title = String(formData.get("title") ?? "").trim();
  const idea = String(formData.get("idea") ?? "").trim();
  const platforms = platformsFromForm(formData);
  const extraInstructions = String(formData.get("instructions") ?? "").trim();
  const scheduledAt = parseDate(formData.get("scheduledAt"));
  if (!title) redirect("/composer?error=Give the post a working title.");
  if (platforms.length === 0) redirect("/composer?error=Choose at least one platform.");

  const profile = getBrandProfile(brand.id);
  const facts = listFacts(brand.id);
  const context = retrieveContext(brand.id, `${title} ${idea}`, 4);
  const contextText = context.map((item) => `${item.title}: ${item.summary}`).join("\n");
  const generated = await generateVariants({
    brandName: brand.name,
    profile,
    facts,
    title,
    idea,
    platforms,
    extraInstructions: [extraInstructions, contextText ? `Approved brand context:\n${contextText}` : ""]
      .filter(Boolean)
      .join("\n\n"),
  });

  const postId = uuid();
  const now = new Date().toISOString();
  run(
    `INSERT INTO posts
     (id, brand_id, title, idea, status, scheduled_at, approved_by, approved_at, share_token, prep_lead_hours, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 48, ?, ?)`,
    [postId, brand.id, title, idea, scheduledAt ? "needs_review" : "draft", scheduledAt, now, now]
  );

  for (const variant of generated.variants) {
    run(
      `INSERT INTO post_variants (id, post_id, platform, caption, hashtags, first_comment, media_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        uuid(),
        postId,
        variant.platform,
        variant.caption,
        variant.hashtags,
        variant.firstComment,
        now,
      ]
    );
  }

  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Created post",
    entity: "post",
    entityId: postId,
    detail: `${title} · ${platforms.join(", ")} · ${generated.mode}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect(`/posts/${postId}?created=1`);
}

export async function updatePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  const title = String(formData.get("title") ?? post.title).trim();
  const idea = String(formData.get("idea") ?? post.idea);
  const scheduledAt = parseDate(formData.get("scheduledAt"));
  run("UPDATE posts SET title = ?, idea = ?, scheduled_at = ?, updated_at = ? WHERE id = ?", [
    title,
    idea,
    scheduledAt,
    new Date().toISOString(),
    postId,
  ]);

  const variants = getPostVariants(postId);
  for (const variant of variants) {
    const caption = String(formData.get(`caption_${variant.platform}`) ?? variant.caption);
    const hashtags = String(formData.get(`hashtags_${variant.platform}`) ?? variant.hashtags);
    const firstComment = String(formData.get(`first_comment_${variant.platform}`) ?? variant.first_comment);
    run(
      "UPDATE post_variants SET caption = ?, hashtags = ?, first_comment = ? WHERE id = ?",
      [caption, hashtags, firstComment, variant.id]
    );
  }

  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Edited post",
    entity: "post",
    entityId: postId,
    detail: title,
  });

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/posts/${postId}?saved=1`);
}

export async function generateVariantsAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  const platforms = platformsFromForm(formData);
  if (platforms.length === 0) redirect(`/posts/${postId}?error=Select at least one platform.`);
  const brand = getBrand(post.brand_id);
  const profile = getBrandProfile(post.brand_id);
  const facts = listFacts(post.brand_id);
  const context = retrieveContext(post.brand_id, `${post.title} ${post.idea}`, 4);
  const generated = await generateVariants({
    brandName: brand?.name ?? "the brand",
    profile,
    facts,
    title: post.title,
    idea: post.idea,
    platforms,
    extraInstructions: context.map((item) => `${item.title}: ${item.summary}`).join("\n"),
  });

  const now = new Date().toISOString();
  for (const variant of generated.variants) {
    run(
      `INSERT INTO post_variants (id, post_id, platform, caption, hashtags, first_comment, media_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
       ON CONFLICT(post_id, platform) DO UPDATE SET
         caption = excluded.caption,
         hashtags = excluded.hashtags,
         first_comment = excluded.first_comment`,
      [uuid(), postId, variant.platform, variant.caption, variant.hashtags, variant.firstComment, now]
    );
  }
  run("UPDATE posts SET status = 'needs_review', updated_at = ? WHERE id = ?", [now, postId]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Generated variants",
    entity: "post",
    entityId: postId,
    detail: `${platforms.join(", ")} · ${generated.mode}`,
  });
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}?generated=${generated.mode}`);
}

export async function approvePostAction(formData: FormData) {
  const user = await requireUser();
  if (!canApprove(user)) redirect("/calendar?error=Only owners and managers can approve.");
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  const now = new Date().toISOString();
  const status = post.scheduled_at ? "scheduled" : "approved";
  run("UPDATE posts SET status = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?", [
    status,
    user.id,
    now,
    now,
    postId,
  ]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Approved post",
    entity: "post",
    entityId: postId,
    detail: post.title,
  });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/posts/${postId}?approved=1`);
}

export async function schedulePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  const scheduledAt = parseDate(formData.get("scheduledAt"));
  if (!scheduledAt) redirect(`/posts/${postId}?error=Choose a valid date and time.`);
  const approved = Boolean(post.approved_at);
  run("UPDATE posts SET scheduled_at = ?, status = ?, updated_at = ? WHERE id = ?", [
    scheduledAt,
    approved ? "scheduled" : "needs_review",
    new Date().toISOString(),
    postId,
  ]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Scheduled post",
    entity: "post",
    entityId: postId,
    detail: scheduledAt,
  });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  redirect(`/posts/${postId}?scheduled=1`);
}

export async function markPublishedAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  run("UPDATE posts SET status = 'published', updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    postId,
  ]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Marked as published",
    entity: "post",
    entityId: postId,
    detail: post.title,
  });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/posts/${postId}?published=1`);
}

export async function createShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  const token = post.share_token || randomToken(18);
  run("UPDATE posts SET share_token = ?, updated_at = ? WHERE id = ?", [
    token,
    new Date().toISOString(),
    postId,
  ]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Created client link",
    entity: "post",
    entityId: postId,
  });
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}?shared=1`);
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  run("DELETE FROM posts WHERE id = ?", [postId]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Deleted post",
    entity: "post",
    entityId: postId,
    detail: post.title,
  });
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect("/calendar");
}

export async function markReadyAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const post = getPost(postId);
  if (!post) redirect("/calendar");
  run("UPDATE posts SET status = 'ready', updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    postId,
  ]);
  logActivity({
    brandId: post.brand_id,
    userId: user.id,
    action: "Post kit ready",
    entity: "post",
    entityId: postId,
    detail: post.title,
  });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  redirect(`/posts/${postId}?ready=1`);
}
