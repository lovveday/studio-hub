"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { run } from "@/lib/db";
import { uuid } from "@/lib/password";
import {
  approveFact,
  approveKnowledgeItem,
  ingestFile,
  ingestText,
  ingestUrl,
  reExtractKnowledge,
  rejectFact,
  rejectKnowledgeItem,
  updateTranscript,
} from "@/lib/knowledge";
import { logActivity } from "@/lib/data";

function fail(message: string): never {
  redirect(`/knowledge?error=${encodeURIComponent(message)}`);
}

export async function addNoteAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const text = String(formData.get("text") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || `Quick note · ${new Date().toLocaleDateString("en-GB")}`;
  if (text.length < 3) fail("Add a little more text so the hub can extract something useful.");
  const result = await ingestText({
    brandId: brand.id,
    title,
    text,
    source: "Pasted note",
    userId: user.id,
    type: "note",
  });
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
  redirect(`/knowledge/${result.id}`);
}

export async function addUrlAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) fail("Paste a URL first.");
  try {
    const result = await ingestUrl({ brandId: brand.id, url, userId: user.id });
    revalidatePath("/knowledge");
    redirect(`/knowledge/${result.id}`);
  } catch (error) {
    fail((error as Error).message);
  }
}

export async function uploadKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail("Choose a file first.");
  if (file.size > 30 * 1024 * 1024) fail("Files must be under 30 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await ingestFile({
      brandId: brand.id,
      title: String(formData.get("title") ?? "").trim() || file.name,
      buffer,
      fileName: file.name,
      mimeType: file.type,
      userId: user.id,
    });
    revalidatePath("/knowledge");
    revalidatePath("/dashboard");
    redirect(`/knowledge/${result.id}`);
  } catch (error) {
    fail((error as Error).message);
  }
}

export async function approveKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const result = approveKnowledgeItem(id, user.id);
  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${id}`);
  revalidatePath("/dashboard");
  redirect(`/knowledge/${id}?approved=${result.created}`);
}

export async function rejectKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  rejectKnowledgeItem(id, user.id, String(formData.get("reason") ?? ""));
  revalidatePath("/knowledge");
  redirect("/knowledge");
}

export async function approveFactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const result = approveFact(id, user.id);
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
  redirect(result.superseded ? "/knowledge?factStatus=approved&replaced=1" : "/knowledge?factStatus=approved");
}

export async function rejectFactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  rejectFact(id, user.id);
  revalidatePath("/knowledge");
  redirect("/knowledge?factStatus=pending");
}

export async function updateTranscriptAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const transcript = String(formData.get("transcript") ?? "").trim();
  updateTranscript(id, transcript);
  logActivity({
    brandId: String(formData.get("brandId") ?? "") || null,
    userId: user.id,
    action: "Edited transcript",
    entity: "knowledge",
    entityId: id,
  });
  revalidatePath(`/knowledge/${id}`);
  redirect(`/knowledge/${id}?saved=1`);
}

export async function reExtractKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    const result = await reExtractKnowledge(id, user.id);
    revalidatePath(`/knowledge/${id}`);
    redirect(`/knowledge/${id}?reextracted=${result.facts.length}`);
  } catch (error) {
    redirect(`/knowledge/${id}?error=${encodeURIComponent((error as Error).message)}`);
  }
}

export async function addManualFactAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const subject = String(formData.get("subject") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!subject || !value) redirect("/knowledge?error=Fact subject and value are required.");
  const now = new Date().toISOString();
  run(
    `INSERT INTO brand_facts
     (id, brand_id, subject, value, status, confidence, source_item_id, valid_from, valid_to, supersedes_id, created_at)
     VALUES (?, ?, ?, ?, 'approved', 1.0, NULL, ?, NULL, NULL, ?)`,
    [uuid(), brand.id, subject, value, now, now]
  );
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: "Added fact manually",
    entity: "brand_fact",
    detail: `${subject}: ${value}`,
  });
  revalidatePath("/knowledge");
  redirect("/knowledge?factStatus=approved");
}
