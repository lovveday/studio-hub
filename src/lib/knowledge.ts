import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { all, get, run } from "./db";
import { extractKnowledge, transcribeAudio, describeImage } from "./ai";
import { listFacts, getBrand, getBrandProfile, logActivity } from "./data";
import type { BrandFact, FactCandidate, KnowledgeItem, KnowledgeType } from "./types";

const MAX_FILE_BYTES = 30 * 1024 * 1024;

function uploadDir(): string {
  const dir = path.join(process.cwd(), "storage", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveBuffer(buffer: Buffer, originalName: string, mimeType: string) {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("File is larger than 30 MB. Split it or compress it first.");
  }
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
  const fileName = `${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(uploadDir(), fileName);
  fs.writeFileSync(fullPath, buffer);
  return {
    relativePath: path.join("storage", "uploads", fileName),
    size: buffer.byteLength,
    mimeType,
  };
}

export async function ingestText(input: {
  brandId: string;
  title: string;
  text: string;
  source: string;
  userId: string;
  type?: KnowledgeType;
}) {
  const id = crypto.randomUUID();
  const brand = getBrand(input.brandId);
  const profile = getBrandProfile(input.brandId);
  const facts = listFacts(input.brandId);
  const extraction = await extractKnowledge({
    text: input.text,
    brandName: brand?.name ?? "the brand",
    profile,
    facts,
    sourceType: input.type ?? "note",
  });

  run(
    `INSERT INTO knowledge_items
     (id, brand_id, type, title, source, status, raw_text, file_path, mime_type, size, transcript, summary, facts_json, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 'needs_review', ?, NULL, NULL, 0, '', ?, ?, ?, ?)`,
    [
      id,
      input.brandId,
      input.type ?? "note",
      input.title,
      input.source,
      input.text,
      extraction.summary,
      JSON.stringify(extraction.facts),
      input.userId,
      new Date().toISOString(),
    ]
  );

  logActivity({
    brandId: input.brandId,
    userId: input.userId,
    action: "Added knowledge",
    entity: "knowledge",
    entityId: id,
    detail: `${input.title} · ${extraction.mode === "gemini" ? "AI extraction" : "demo extraction"}`,
  });

  return { id, extraction };
}

export async function ingestVoiceNote(input: {
  brandId: string;
  title: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
}) {
  const stored = saveBuffer(input.buffer, input.fileName, input.mimeType || "audio/ogg");
  const brand = getBrand(input.brandId);
  const profile = getBrandProfile(input.brandId);
  const facts = listFacts(input.brandId);
  const transcribed = await transcribeAudio(
    input.buffer,
    input.mimeType || "audio/ogg",
    brand?.name ?? "the brand"
  );

  const text = transcribed.text;
  const extraction = text
    ? await extractKnowledge({
        text,
        brandName: brand?.name ?? "the brand",
        profile,
        facts,
        sourceType: "voice note",
      })
    : { summary: transcribed.error ?? "Voice note uploaded. Add a transcript to extract facts.", facts: [], mode: "mock" as const };

  const id = crypto.randomUUID();
  const title = input.title || `Voice note · ${new Date().toLocaleDateString("en-GB")}`;
  run(
    `INSERT INTO knowledge_items
     (id, brand_id, type, title, source, status, raw_text, file_path, mime_type, size, transcript, summary, facts_json, created_by, created_at)
     VALUES (?, ?, 'voice', ?, ?, 'needs_review', '', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.brandId,
      title,
      `Voice note · ${input.fileName}${text ? " · auto-transcribed" : " · needs transcript"}`,
      stored.relativePath,
      stored.mimeType,
      stored.size,
      text,
      extraction.summary,
      JSON.stringify(extraction.facts),
      input.userId,
      new Date().toISOString(),
    ]
  );

  logActivity({
    brandId: input.brandId,
    userId: input.userId,
    action: "Added voice note",
    entity: "knowledge",
    entityId: id,
    detail: text ? "Transcribed and ready to review" : "Uploaded, transcript needed",
  });

  return { id, transcribed, extraction };
}

export async function ingestFile(input: {
  brandId: string;
  title: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
}) {
  const mime = input.mimeType || "";
  const extension = path.extname(input.fileName).toLowerCase();
  const isAudio =
    mime.startsWith("audio/") ||
    [".opus", ".ogg", ".oga", ".m4a", ".mp3", ".wav", ".aac", ".amr", ".webm"].includes(extension);
  if (isAudio) {
    return ingestVoiceNote(input);
  }

  const stored = saveBuffer(input.buffer, input.fileName, mime || "application/octet-stream");
  const brand = getBrand(input.brandId);
  const profile = getBrandProfile(input.brandId);
  const facts = listFacts(input.brandId);

  let text = "";
  let type: KnowledgeType = "file";
  let note = "";

  try {
    if (mime === "application/pdf" || extension === ".pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(input.buffer));
      const result = await extractText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
      note = "PDF text extracted";
    } else if (
      mime.includes("wordprocessingml") ||
      extension === ".docx" ||
      extension === ".doc"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: input.buffer });
      text = result.value;
      note = "DOCX text extracted";
    } else if (
      mime.startsWith("text/") ||
      [".txt", ".md", ".markdown", ".csv"].includes(extension)
    ) {
      text = input.buffer.toString("utf8");
      note = "Text file imported";
    } else if (mime.startsWith("image/")) {
      type = "image";
      text = await describeImage(input.buffer, mime, brand?.name ?? "");
      note = text ? "Image read with AI vision" : "Image uploaded — add a note or transcript";
    } else if (
      mime.includes("html") ||
      extension === ".html" ||
      extension === ".htm"
    ) {
      const cheerio = await import("cheerio");
      const $ = cheerio.load(input.buffer.toString("utf8"));
      $("script, style, nav, footer, header, noscript").remove();
      text = $("article").text() || $("main").text() || $("body").text();
      note = "HTML text extracted";
    } else {
      text = input.buffer.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, " ");
      note = "Unknown file type — treated as text";
    }
  } catch (error) {
    note = `Could not read this file automatically (${(error as Error).message}). Add a note manually.`;
  }

  text = text.replace(/\s+/g, " ").trim().slice(0, 60000);
  const extraction = text
    ? await extractKnowledge({
        text,
        brandName: brand?.name ?? "the brand",
        profile,
        facts,
        sourceType: type,
      })
    : { summary: note, facts: [] as FactCandidate[], mode: "mock" as const };

  const id = crypto.randomUUID();
  run(
    `INSERT INTO knowledge_items
     (id, brand_id, type, title, source, status, raw_text, file_path, mime_type, size, transcript, summary, facts_json, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 'needs_review', ?, ?, ?, ?, '', ?, ?, ?, ?)`,
    [
      id,
      input.brandId,
      type,
      input.title || input.fileName,
      `${note || "Uploaded file"} · ${input.fileName}`,
      text,
      stored.relativePath,
      stored.mimeType,
      stored.size,
      extraction.summary,
      JSON.stringify(extraction.facts),
      input.userId,
      new Date().toISOString(),
    ]
  );

  logActivity({
    brandId: input.brandId,
    userId: input.userId,
    action: "Added knowledge",
    entity: "knowledge",
    entityId: id,
    detail: `${input.title || input.fileName} · ${note}`,
  });

  return { id, extraction, note };
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

export async function ingestUrl(input: {
  brandId: string;
  url: string;
  userId: string;
}) {
  const parsed = new URL(input.url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("That URL points to a private address and cannot be fetched.");
  }

  const response = await fetch(parsed.toString(), {
    redirect: "follow",
    headers: {
      "User-Agent": "StudioHubBot/0.1 (+knowledge inbox)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`The page returned ${response.status}.`);
  const finalUrl = new URL(response.url);
  if (isPrivateHost(finalUrl.hostname)) {
    throw new Error("That URL redirected to a private address and was blocked.");
  }
  const html = await response.text();
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, svg").remove();
  const title = ($("title").first().text() || parsed.hostname).trim();
  const text = ($("article").text() || $("main").text() || $("body").text())
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60000);
  if (!text) throw new Error("Could not extract readable text from that page.");

  return ingestText({
    brandId: input.brandId,
    title,
    text,
    source: `URL · ${finalUrl.toString()}`,
    userId: input.userId,
    type: "url",
  });
}

export function getKnowledgeItem(id: string): KnowledgeItem | undefined {
  return get<KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?", [id]);
}

export function approveKnowledgeItem(id: string, userId: string) {
  const item = getKnowledgeItem(id);
  if (!item) throw new Error("Knowledge item not found.");
  run("UPDATE knowledge_items SET status = 'approved' WHERE id = ?", [id]);

  let candidates: FactCandidate[] = [];
  try {
    candidates = JSON.parse(item.facts_json || "[]") as FactCandidate[];
  } catch {
    candidates = [];
  }

  let created = 0;
  for (const candidate of candidates) {
    if (!candidate.subject || !candidate.value) continue;
    const duplicate = get<BrandFact>(
      "SELECT * FROM brand_facts WHERE brand_id = ? AND subject = ? AND value = ? AND status IN ('pending','approved') AND valid_to IS NULL",
      [item.brand_id, candidate.subject, candidate.value]
    );
    if (duplicate) continue;
    run(
      `INSERT INTO brand_facts
       (id, brand_id, subject, value, status, confidence, source_item_id, valid_from, valid_to, supersedes_id, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?)`,
      [
        crypto.randomUUID(),
        item.brand_id,
        candidate.subject,
        candidate.value,
        Math.max(0, Math.min(1, candidate.confidence ?? 0.6)),
        item.id,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    created += 1;
  }

  logActivity({
    brandId: item.brand_id,
    userId,
    action: "Approved knowledge",
    entity: "knowledge",
    entityId: id,
    detail: `${item.title} · ${created} fact candidate${created === 1 ? "" : "s"}`,
  });

  return { created };
}

export function rejectKnowledgeItem(id: string, userId: string, reason = "") {
  const item = getKnowledgeItem(id);
  if (!item) return;
  run("UPDATE knowledge_items SET status = 'rejected' WHERE id = ?", [id]);
  logActivity({
    brandId: item.brand_id,
    userId,
    action: "Rejected knowledge",
    entity: "knowledge",
    entityId: id,
    detail: reason || item.title,
  });
}

export function approveFact(id: string, userId: string) {
  const fact = get<BrandFact>("SELECT * FROM brand_facts WHERE id = ?", [id]);
  if (!fact) throw new Error("Fact not found.");
  const current = get<BrandFact>(
    `SELECT * FROM brand_facts
     WHERE brand_id = ? AND subject = ? AND status = 'approved' AND valid_to IS NULL AND id <> ?`,
    [fact.brand_id, fact.subject, fact.id]
  );
  const now = new Date().toISOString();
  if (current && current.value.trim() !== fact.value.trim()) {
    run("UPDATE brand_facts SET status = 'superseded', valid_to = ? WHERE id = ?", [now, current.id]);
    run(
      "UPDATE brand_facts SET status = 'approved', valid_from = ?, valid_to = NULL, supersedes_id = ? WHERE id = ?",
      [now, current.id, fact.id]
    );
  } else {
    run("UPDATE brand_facts SET status = 'approved', valid_from = ?, valid_to = NULL WHERE id = ?", [
      now,
      fact.id,
    ]);
  }

  logActivity({
    brandId: fact.brand_id,
    userId,
    action: "Approved fact",
    entity: "brand_fact",
    entityId: fact.id,
    detail: `${fact.subject}: ${fact.value}`,
  });

  return { superseded: current && current.value.trim() !== fact.value.trim() ? current : null };
}

export function rejectFact(id: string, userId: string) {
  const fact = get<BrandFact>("SELECT * FROM brand_facts WHERE id = ?", [id]);
  if (!fact) return;
  run("UPDATE brand_facts SET status = 'rejected', valid_to = ? WHERE id = ?", [
    new Date().toISOString(),
    id,
  ]);
  logActivity({
    brandId: fact.brand_id,
    userId,
    action: "Rejected fact",
    entity: "brand_fact",
    entityId: id,
    detail: `${fact.subject}: ${fact.value}`,
  });
}

export function updateTranscript(id: string, transcript: string) {
  const item = getKnowledgeItem(id);
  if (!item) throw new Error("Knowledge item not found.");
  run("UPDATE knowledge_items SET transcript = ?, raw_text = ?, status = 'needs_review' WHERE id = ?", [
    transcript,
    transcript,
    id,
  ]);
}

export async function reExtractKnowledge(id: string, userId: string) {
  const item = getKnowledgeItem(id);
  if (!item) throw new Error("Knowledge item not found.");
  const text = (item.transcript || item.raw_text).trim();
  if (!text) throw new Error("Add a transcript or source text first.");
  const brand = getBrand(item.brand_id);
  const profile = getBrandProfile(item.brand_id);
  const facts = listFacts(item.brand_id);
  const extraction = await extractKnowledge({
    text,
    brandName: brand?.name ?? "the brand",
    profile,
    facts,
    sourceType: item.type,
  });
  run(
    "UPDATE knowledge_items SET summary = ?, facts_json = ?, status = 'needs_review' WHERE id = ?",
    [extraction.summary, JSON.stringify(extraction.facts), id]
  );
  logActivity({
    brandId: item.brand_id,
    userId,
    action: "Re-extracted knowledge",
    entity: "knowledge",
    entityId: id,
    detail: `${extraction.facts.length} fact candidate${extraction.facts.length === 1 ? "" : "s"} · ${extraction.mode}`,
  });
  return extraction;
}

export function retrieveContext(brandId: string, query: string, limit = 4) {
  // Keep retrieval local and dependency-free: score approved sources by term overlap.
  const rows = all<{
    id: string;
    title: string;
    summary: string;
    raw_text: string;
    transcript: string;
    source: string;
    created_at: string;
  }>(
    `SELECT id, title, summary, raw_text, transcript, source, created_at
     FROM knowledge_items WHERE brand_id = ? AND status = 'approved'
     ORDER BY created_at DESC LIMIT 60`,
    [brandId]
  );
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  return rows
    .map((row) => {
      const haystack = `${row.title} ${row.summary} ${row.raw_text} ${row.transcript}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { ...row, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
