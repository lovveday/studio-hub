"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { draftReply } from "@/lib/ai";
import { getBrand, getBrandProfile, listFacts, logActivity } from "@/lib/data";
import type { CommentRow } from "@/lib/types";

function getComment(id: string): CommentRow | undefined {
  return get<CommentRow>("SELECT * FROM comments WHERE id = ?", [id]);
}

export async function draftReplyAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("commentId") ?? "");
  const comment = getComment(id);
  if (!comment) redirect("/inbox");
  const brand = getBrand(comment.brand_id);
  const profile = getBrandProfile(comment.brand_id);
  const facts = listFacts(comment.brand_id);
  const draft = await draftReply({
    brandName: brand?.name ?? "the brand",
    profile,
    facts,
    comment: comment.text,
    author: comment.author,
    sentiment: comment.sentiment,
  });
  const { run } = await import("@/lib/db");
  run("UPDATE comments SET reply_draft = ? WHERE id = ?", [draft.reply, id]);
  revalidatePath("/inbox");
  redirect(`/inbox?drafted=${comment.id}`);
}

export async function sendReplyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("commentId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  const comment = getComment(id);
  if (!comment) redirect("/inbox");
  const { run } = await import("@/lib/db");
  run("UPDATE comments SET status = 'replied', reply_draft = ? WHERE id = ?", [
    reply || comment.reply_draft,
    id,
  ]);
  logActivity({
    brandId: comment.brand_id,
    userId: user.id,
    action: "Replied to comment",
    entity: "comment",
    entityId: id,
    detail: `@${comment.author_handle}`,
  });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect("/inbox?replied=1");
}

export async function likeCommentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("commentId") ?? "");
  const comment = getComment(id);
  if (!comment) redirect("/inbox");
  const { run } = await import("@/lib/db");
  run("UPDATE comments SET status = 'liked' WHERE id = ?", [id]);
  logActivity({
    brandId: comment.brand_id,
    userId: user.id,
    action: "Liked comment",
    entity: "comment",
    entityId: id,
    detail: `@${comment.author_handle}`,
  });
  revalidatePath("/inbox");
  redirect("/inbox?liked=1");
}

export async function escalateCommentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("commentId") ?? "");
  const comment = getComment(id);
  if (!comment) redirect("/inbox");
  const { run } = await import("@/lib/db");
  run("UPDATE comments SET status = 'escalated' WHERE id = ?", [id]);
  logActivity({
    brandId: comment.brand_id,
    userId: user.id,
    action: "Escalated comment",
    entity: "comment",
    entityId: id,
    detail: `@${comment.author_handle}`,
  });
  revalidatePath("/inbox");
  redirect("/inbox?escalated=1");
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const user = await requireUser();
  const { run } = await import("@/lib/db");
  run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [
    new Date().toISOString(),
    user.id,
  ]);
  revalidatePath("/", "layout");
  redirect(String(formData.get("next") ?? "/dashboard"));
}
