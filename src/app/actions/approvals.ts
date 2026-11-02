"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { get, run } from "@/lib/db";
import { logActivity } from "@/lib/data";
import type { Post } from "@/lib/types";

function findPost(token: string): Post | undefined {
  return get<Post>("SELECT * FROM posts WHERE share_token = ?", [token]);
}

export async function clientApproveAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "Client").trim() || "Client";
  const note = String(formData.get("note") ?? "").trim();
  const post = findPost(token);
  if (!post) redirect(`/approvals/${token}?error=This link is no longer valid.`);
  const now = new Date().toISOString();
  run("UPDATE posts SET status = ?, approved_at = ?, updated_at = ? WHERE id = ?", [
    post.scheduled_at ? "scheduled" : "approved",
    now,
    now,
    post.id,
  ]);
  logActivity({
    brandId: post.brand_id,
    action: "Client approved",
    entity: "post",
    entityId: post.id,
    detail: `${name}${note ? ` · ${note}` : ""}`,
  });
  revalidatePath(`/posts/${post.id}`);
  revalidatePath("/calendar");
  redirect(`/approvals/${token}?done=approved`);
}

export async function clientRequestChangesAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const post = findPost(token);
  if (!post) redirect(`/approvals/${token}?error=This link is no longer valid.`);
  const now = new Date().toISOString();
  run("UPDATE posts SET status = 'needs_review', approved_at = NULL, updated_at = ? WHERE id = ?", [
    now,
    post.id,
  ]);
  logActivity({
    brandId: post.brand_id,
    action: "Client requested changes",
    entity: "post",
    entityId: post.id,
    detail: note || "No note provided",
  });
  revalidatePath(`/posts/${post.id}`);
  revalidatePath("/calendar");
  redirect(`/approvals/${token}?done=changes`);
}
