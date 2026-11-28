import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { all, get, run } from "./db";
import { getBrand, getBrandProfile, listFacts, logActivity } from "./data";
import { uuid } from "./password";
import type { Brand } from "./types";
import {
  adaptationFallback,
  adaptationWithGemini,
  analysisWithFrames,
  analysisWithText,
  analysisWithVideo,
  compareWording,
  fallbackAdaptation,
  geminiReady,
  normalizeTeardown,
  removeGeminiFile,
  teardownFallback,
  uploadSourceToGemini,
  type AnalysisContext,
} from "./virality-ai";
import type {
  Adaptation,
  Confidence,
  Similarity,
  StoredFrame,
  Teardown,
  ViralityAnalysis,
  ViralityMode,
  ViralityRow,
  ViralitySourceType,
} from "./virality-types";
import { sampleForBrand } from "./virality-samples";

const ROOT = path.join(process.cwd(), "storage", "virality");
export const MAX_VIRALITY_VIDEO_BYTES = 100 * 1024 * 1024;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function analysisDir(id: string): string {
  if (!/^[a-f0-9-]{16,}$/i.test(id)) throw new Error("Invalid analysis id.");
  return path.join(ROOT, id);
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    return { buffer: Buffer.from(match[2], "base64"), mime: match[1].toLowerCase() };
  } catch {
    return null;
  }
}

function extensionFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("mpeg")) return "mp4";
  return "mp4";
}

export function createViralityAnalysis(input: {
  brandId: string;
  userId: string;
  sourceType: ViralitySourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  platform?: string;
  creator?: string;
  caption?: string;
  transcript?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  videoBuffer?: Buffer;
  frames?: Array<{ time: number; dataUrl: string }>;
}): string {
  const id = uuid();
  const dir = ensureDir(analysisDir(id));
  let filePath: string | null = null;

  if (input.videoBuffer?.byteLength) {
    const ext = extensionFor(input.mimeType ?? "video/mp4");
    const name = `source.${ext}`;
    fs.writeFileSync(path.join(dir, name), input.videoBuffer);
    filePath = name;
  }

  const frames: StoredFrame[] = [];
  for (const [index, frame] of (input.frames ?? []).slice(0, 8).entries()) {
    const decoded = decodeDataUrl(frame.dataUrl);
    if (!decoded) continue;
    const name = `frame-${index}.jpg`;
    try {
      fs.writeFileSync(path.join(dir, name), decoded.buffer);
      frames.push({ time: Math.max(0, Number(frame.time) || 0), path: name });
    } catch {
      // A frame that cannot be written is not worth failing the analysis over.
    }
  }

  const now = new Date().toISOString();
  run(
    `INSERT INTO virality_analyses
     (id, brand_id, status, stage, source_type, source_url, source_title, platform, creator, caption,
      transcript, duration_seconds, width, height, mime_type, file_path, poster_path, frames_json,
      metadata_json, teardown_json, adaptation_json, similarity_json, mode, confidence, error,
      source_deleted_at, created_by, created_at, updated_at)
     VALUES (?, ?, 'processing', 'saving-source', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    [
      id,
      input.brandId,
      input.sourceType,
      input.sourceUrl ?? null,
      (input.sourceTitle ?? "").slice(0, 300),
      input.platform ?? "",
      input.creator ?? "",
      (input.caption ?? "").slice(0, 12_000),
      (input.transcript ?? "").slice(0, 40_000),
      input.durationSeconds ?? null,
      input.width ?? null,
      input.height ?? null,
      input.mimeType ?? null,
      filePath,
      frames[0]?.path ?? null,
      JSON.stringify(frames),
      input.userId,
      now,
      now,
    ]
  );
  return id;
}

export function parseAnalysis(row: ViralityRow): ViralityAnalysis {
  const parse = <T>(value: string, fallback: T): T => {
    try {
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    ...row,
    teardown: parse<Teardown | null>(row.teardown_json, null),
    adaptation: parse<Adaptation | null>(row.adaptation_json, null),
    similarity: parse<Similarity | null>(row.similarity_json, null),
    frames: parse<StoredFrame[]>(row.frames_json, []),
    metadata: parse<Record<string, unknown>>(row.metadata_json, {}),
  };
}

export function getAnalysis(id: string): ViralityRow | undefined {
  return get<ViralityRow>("SELECT * FROM virality_analyses WHERE id = ?", [id]);
}

export function getAnalysisForBrand(id: string, brandId: string): ViralityRow | undefined {
  return get<ViralityRow>("SELECT * FROM virality_analyses WHERE id = ? AND brand_id = ?", [
    id,
    brandId,
  ]);
}

export function listAnalyses(brandId: string, limit = 60): ViralityRow[] {
  return all<ViralityRow>(
    "SELECT * FROM virality_analyses WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?",
    [brandId, limit]
  );
}

export function countAnalyses(brandId: string): number {
  const row = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM virality_analyses WHERE brand_id = ?",
    [brandId]
  );
  return Number(row?.c ?? 0);
}

function update(id: string, fields: Record<string, string | number | null>) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;
  const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
  run(`UPDATE virality_analyses SET ${assignments}, updated_at = ? WHERE id = ?`, [
    ...entries.map(([, value]) => value),
    new Date().toISOString(),
    id,
  ]);
}

export function setAnalysisStage(id: string, stage: string) {
  update(id, { stage });
}

function setStatus(id: string, status: string, error: string | null = null) {
  update(id, { status, error });
}

export function readFrameFile(id: string, fileName: string): { buffer: Buffer; mime: string } | null {
  const safe = path.basename(fileName);
  if (safe !== fileName) return null;
  const full = path.join(analysisDir(id), safe);
  if (!fs.existsSync(full)) return null;
  return { buffer: fs.readFileSync(full), mime: "image/jpeg" };
}

const running = new Set<string>();

export function startViralityAnalysis(id: string): void {
  if (running.has(id)) return;
  running.add(id);
  void runViralityAnalysis(id)
    .catch((error) => {
      console.error("[virality] unhandled analysis error:", error);
      setStatus(id, "failed", (error as Error).message.slice(0, 500));
      setAnalysisStage(id, "failed");
    })
    .finally(() => running.delete(id));
}

export function retryViralityAnalysis(id: string, brandId: string): boolean {
  const row = getAnalysisForBrand(id, brandId);
  if (!row) return false;
  update(id, {
    status: "processing",
    stage: "saving-source",
    error: null,
    source_deleted_at: null,
  });
  startViralityAnalysis(id);
  return true;
}

export async function regenerateBrief(
  id: string,
  brandId: string,
  userId: string
): Promise<boolean> {
  const row = getAnalysisForBrand(id, brandId);
  if (!row || !row.teardown_json) return false;
  const brand = getBrand(brandId);
  if (!brand) return false;
  const analysis = parseAnalysis(row);
  const context = contextFor(row, brand);
  const teardown = analysis.teardown;
  if (!teardown) return false;

  setAnalysisStage(id, "grounding-brief");
  let adaptation = null;
  let briefSource: "gemini" | "fallback" = "fallback";
  if (geminiReady()) {
    try {
      adaptation = await adaptationWithGemini(context, teardown, {
        phrases: analysis.similarity?.matches ?? [],
      });
      briefSource = "gemini";
    } catch (error) {
      console.warn("[virality] brief regeneration fell back:", (error as Error).message);
    }
  }
  if (!adaptation) adaptation = adaptationFallback(context, teardown);

  setAnalysisStage(id, "checking-wording");
  const similarity = compareWording(sourceTextFor(row, teardown), draftTextFor(adaptation));
  update(id, {
    adaptation_json: JSON.stringify(adaptation),
    similarity_json: JSON.stringify(similarity),
    metadata_json: JSON.stringify({
      ...analysis.metadata,
      brief: briefSource,
      source_mode: analysis.mode,
    }),
    stage: "ready",
    status: "ready",
    error: null,
  });
  logActivity({
    brandId,
    userId,
    action: "Rewrote adaptation brief",
    entity: "virality_analysis",
    entityId: id,
    detail: row.source_title || id,
  });
  return true;
}


export function deleteAnalysis(id: string, brandId: string, userId: string): boolean {
  const row = getAnalysisForBrand(id, brandId);
  if (!row) return false;
  try {
    fs.rmSync(analysisDir(id), { recursive: true, force: true });
  } catch {
    // Best effort; the row is still removed.
  }
  run("DELETE FROM virality_analyses WHERE id = ?", [id]);
  logActivity({
    brandId,
    userId,
    action: "Deleted teardown",
    entity: "virality_analysis",
    entityId: id,
    detail: row.source_title || row.creator || id,
  });
  return true;
}

function contextFor(row: ViralityRow, brand: Brand): AnalysisContext {
  return {
    brand,
    profile: getBrandProfile(brand.id),
    facts: listFacts(brand.id),
    title: row.source_title,
    caption: row.caption,
    transcript: row.transcript,
    platform: row.platform,
    creator: row.creator,
    durationSeconds: row.duration_seconds ?? 0,
    sourceType: row.source_type,
  };
}

function sourceTextFor(row: ViralityRow, teardown: Teardown): string {
  return [
    row.transcript,
    row.caption,
    teardown.transcript.map((line) => line.text).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function draftTextFor(adaptation: Adaptation): string {
  return [
    adaptation.hook,
    adaptation.caption,
    ...adaptation.script_outline.map((beat) => beat.line),
  ].join(" ");
}

export async function runViralityAnalysis(id: string): Promise<void> {
  const row = getAnalysis(id);
  if (!row || row.status === "ready") return;
  const brand = getBrand(row.brand_id);
  if (!brand) {
    setStatus(id, "failed", "The brand for this teardown no longer exists.");
    return;
  }
  const context = contextFor(row, brand);
  let geminiFile: { name: string; uri: string; mimeType: string } | undefined;

  try {
    setAnalysisStage(id, "reading-source");
    let teardown: Teardown | null = null;
    let mode: ViralityMode = "demo";

    if (row.source_type === "upload" && row.file_path) {
      const full = path.join(analysisDir(id), path.basename(row.file_path));
      if (fs.existsSync(full)) {
        try {
          const buffer = fs.readFileSync(full);
          geminiFile = await uploadSourceToGemini(
            buffer,
            row.mime_type || "video/mp4",
            path.basename(row.file_path)
          );
          setAnalysisStage(id, "writing-teardown");
          teardown = await analysisWithVideo(context, geminiFile);
          mode = "video";
        } catch (error) {
          console.warn("[virality] video teardown unavailable:", (error as Error).message);
        } finally {
          if (geminiFile) await removeGeminiFile(geminiFile.name);
          geminiFile = undefined;
        }
      }

      if (!teardown) {
        const frames = parseAnalysis(row).frames;
        const frameInputs = frames
          .slice(0, 8)
          .map((frame) => {
            const file = readFrameFile(id, frame.path);
            if (!file) return null;
            return {
              ...frame,
              dataUrl: `data:${file.mime};base64,${file.buffer.toString("base64")}`,
            };
          })
          .filter((frame): frame is StoredFrame & { dataUrl: string } => Boolean(frame));
        if (frameInputs.length >= 3) {
          try {
            setAnalysisStage(id, "writing-teardown");
            teardown = await analysisWithFrames(context, frameInputs);
            mode = "vision";
          } catch (error) {
            console.warn("[virality] frame teardown unavailable:", (error as Error).message);
          }
        }
      }
    }

    if (!teardown) {
      const text = [row.transcript, row.caption, row.source_title].filter(Boolean).join("\n");
      if (geminiReady() && text.trim().length >= 60) {
        try {
          setAnalysisStage(id, "writing-teardown");
          teardown = await analysisWithText(context);
          mode = "text";
        } catch (error) {
          console.warn("[virality] text teardown unavailable:", (error as Error).message);
        }
      }
    }

    if (!teardown) {
      teardown = teardownFallback(context);
      mode = row.source_type === "url" && !row.transcript && !row.caption ? "metadata" : "demo";
    }

    setAnalysisStage(id, "grounding-brief");
    let adaptation: Adaptation | null = null;
    let briefSource: "gemini" | "fallback" = "fallback";
    if (geminiReady()) {
      try {
        adaptation = await adaptationWithGemini(context, teardown);
        briefSource = "gemini";
      } catch (error) {
        console.warn("[virality] adaptation unavailable:", (error as Error).message);
      }
    }
    if (!adaptation) adaptation = adaptationFallback(context, teardown);

    setAnalysisStage(id, "checking-wording");
    let similarity = compareWording(sourceTextFor(row, teardown), draftTextFor(adaptation));
    if (similarity.level === "high" && geminiReady()) {
      try {
        const tightened = await adaptationWithGemini(context, teardown, {
          phrases: similarity.matches,
        });
        const tightenedSimilarity = compareWording(
          sourceTextFor(row, teardown),
          draftTextFor(tightened)
        );
        if (tightenedSimilarity.score <= similarity.score) {
          adaptation = tightened;
          similarity = tightenedSimilarity;
        }
      } catch (error) {
        console.warn("[virality] wording rewrite unavailable:", (error as Error).message);
      }
    }
    if (similarity.level === "high") {
      adaptation.guardrails = [
        "Wording overlap is still high. Rewrite the highlighted phrases before publishing.",
        ...adaptation.guardrails,
      ].slice(0, 8);
    }

    if (row.source_type === "upload" && row.file_path) {
      try {
        fs.rmSync(path.join(analysisDir(id), path.basename(row.file_path)), { force: true });
      } catch {
        // The teardown is already written; a stuck temp file should not fail it.
      }
    }

    update(id, {
      status: "ready",
      stage: "ready",
      teardown_json: JSON.stringify(teardown),
      adaptation_json: JSON.stringify(adaptation),
      similarity_json: JSON.stringify(similarity),
      metadata_json: JSON.stringify({
        ...parseAnalysis(row).metadata,
        brief: briefSource,
        source_mode: mode,
      }),
      mode,
      confidence: teardown.confidence,
      error: null,
      duration_seconds:
        row.duration_seconds && row.duration_seconds > 0
          ? row.duration_seconds
          : teardown.duration_seconds,
      source_deleted_at:
        row.source_type === "upload" && row.file_path ? new Date().toISOString() : row.source_deleted_at,
    });
  } catch (error) {
    console.error("[virality] analysis failed:", error);
    if (geminiFile) await removeGeminiFile(geminiFile.name);
    setStatus(id, "failed", (error as Error).message.slice(0, 500));
    setAnalysisStage(id, "failed");
  }
}

/* -------------------------------------------------------------------------- */
/* Link metadata — no video download, only public page metadata.              */
/* -------------------------------------------------------------------------- */

export type LinkMetadata = {
  ok: boolean;
  platform: string;
  title: string;
  creator: string;
  thumbnail: string;
  description: string;
  durationSeconds: number | null;
  provider: string;
  note: string;
};

const ALLOWED_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.watch",
  "linkedin.com",
  "x.com",
  "twitter.com",
];

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function platformFromHost(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("youtu")) return "youtube";
  if (host.includes("facebook") || host.includes("fb.watch")) return "facebook";
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("x.com") || host.includes("twitter")) return "x";
  return "";
}

function metaContent($: ReturnType<typeof load>, names: string[]): string {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr("content") ||
      $(`meta[name="${name}"]`).attr("content") ||
      $(`meta[itemprop="${name}"]`).attr("content");
    if (value?.trim()) return value.trim();
  }
  return "";
}

async function oEmbed(url: string, platform: string): Promise<Partial<LinkMetadata> | null> {
  const endpoint =
    platform === "tiktok"
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      : platform === "youtube"
        ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        : "";
  if (!endpoint) return null;
  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "StudioHubViralityLab/1.0" },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      ok: true,
      title: data.title ?? "",
      creator: data.author_name ?? "",
      thumbnail: data.thumbnail_url ?? "",
      provider: `${platform} oEmbed`,
    };
  } catch {
    return null;
  }
}

function creatorFromUrl(url: URL): string {
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (host.includes("tiktok.com")) {
    const at = parts.find((part) => part.startsWith("@"));
    if (at) return at;
  }
  if (host.includes("instagram.com")) {
    const first = parts[0];
    if (first && !["reel", "reels", "p", "tv", "stories", "explore"].includes(first)) return `@${first}`;
  }
  if (host.includes("x.com") || host.includes("twitter.com")) {
    if (parts[0] && !["i", "home", "search", "intent"].includes(parts[0])) return `@${parts[0]}`;
  }
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    const at = parts.find((part) => part.startsWith("@"));
    if (at) return at;
    const channel = parts.indexOf("channel");
    if (channel >= 0 && parts[channel + 1]) return parts[channel + 1];
  }
  return "";
}

function creatorFromTitle(title: string): string {
  const bracket = title.match(/\(@([a-zA-Z0-9._]+)\)/);
  if (bracket) return `@${bracket[1]}`;
  const at = title.match(/(?:^|\s)@([a-zA-Z0-9._]{2,})/);
  return at ? `@${at[1]}` : "";
}

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  const empty: LinkMetadata = {
    ok: false,
    platform: "",
    title: "",
    creator: "",
    thumbnail: "",
    description: "",
    durationSeconds: null,
    provider: "",
    note: "Paste a public TikTok, Instagram, YouTube, Facebook, LinkedIn or X link.",
  };
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return empty;
  }
  if (!["http:", "https:"].includes(url.protocol) || !hostAllowed(url.hostname)) {
    return {
      ...empty,
      note: "Only public links from TikTok, Instagram, YouTube, Facebook, LinkedIn and X are supported.",
    };
  }
  const platform = platformFromHost(url.hostname);
  const base: LinkMetadata = {
    ...empty,
    platform,
    provider: url.hostname,
    note: "",
  };

  const embedded = await oEmbed(url.toString(), platform);
  let page: Partial<LinkMetadata> = {};
  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (response.ok && hostAllowed(new URL(response.url).hostname)) {
      const html = await response.text();
      if (html.length < 4_000_000) {
        const $ = load(html);
        page = {
          title: metaContent($, ["og:title", "twitter:title"]) || $("title").first().text().trim(),
          creator:
            metaContent($, ["author", "article:author", "og:site_name"]) ||
            $('meta[name="twitter:creator"]').attr("content") ||
            "",
          thumbnail: metaContent($, ["og:image", "twitter:image"]),
          description: metaContent($, ["og:description", "description", "twitter:description"]),
          durationSeconds:
            Number(
              metaContent($, ["og:video:duration", "video:duration", "duration"]) || 0
            ) || null,
          provider: new URL(response.url).hostname,
        };
      }
    }
  } catch {
    // A blocked page is expected on Instagram and X; oEmbed or manual entry covers it.
  }

  const merged: LinkMetadata = {
    ...base,
    ...Object.fromEntries(Object.entries(page).filter(([, value]) => value !== "" && value != null)),
    ...Object.fromEntries(
      Object.entries(embedded ?? {}).filter(([, value]) => value !== "" && value != null)
    ),
    platform,
    ok: Boolean(
      (embedded?.title ?? page.title ?? "").trim() ||
        (embedded?.thumbnail ?? page.thumbnail ?? "").trim()
    ),
  };
  if (!merged.ok) {
    merged.note =
      "That page would not share its metadata publicly. Add the caption or transcript below so the teardown is grounded.";
  }
  const genericCreator = /^(instagram|tiktok|youtube|facebook|linkedin|x|twitter)$/i.test(
    merged.creator.trim()
  );
  merged.creator =
    (!genericCreator ? merged.creator : "") ||
    creatorFromUrl(url) ||
    creatorFromTitle(merged.title) ||
    "";
  return merged;
}

/* -------------------------------------------------------------------------- */
/* Sample teardowns                                                           */
/* -------------------------------------------------------------------------- */

export function loadSampleAnalysis(brandId: string, userId: string): string | null {
  const existing = get<ViralityRow>(
    "SELECT * FROM virality_analyses WHERE brand_id = ? AND source_type = 'sample' ORDER BY created_at DESC LIMIT 1",
    [brandId]
  );
  if (existing) return existing.id;
  const brand = getBrand(brandId);
  if (!brand) return null;
  const sample = sampleForBrand(brand, listFacts(brandId));
  if (!sample) return null;
  const id = uuid();
  const now = new Date().toISOString();
  const similarity = compareWording(sample.sourceText, sample.draftText);
  run(
    `INSERT INTO virality_analyses
     (id, brand_id, status, stage, source_type, source_url, source_title, platform, creator, caption,
      transcript, duration_seconds, width, height, mime_type, file_path, poster_path, frames_json,
      metadata_json, teardown_json, adaptation_json, similarity_json, mode, confidence, error,
      source_deleted_at, created_by, created_at, updated_at)
     VALUES (?, ?, 'ready', 'ready', 'sample', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL,
      '[]', ?, ?, ?, ?, 'sample', 'medium', NULL, NULL, ?, ?, ?)`,
    [
      id,
      brandId,
      `sample://${brandId}`,
      sample.title,
      sample.platform,
      sample.creator,
      sample.caption,
      sample.transcript,
      sample.durationSeconds,
      JSON.stringify({ sample: true, note: sample.note }),
      JSON.stringify(sample.teardown),
      JSON.stringify(sample.adaptation),
      JSON.stringify(similarity),
      userId,
      now,
      now,
    ]
  );
  logActivity({
    brandId,
    userId,
    action: "Loaded sample teardown",
    entity: "virality_analysis",
    entityId: id,
    detail: sample.title,
  });
  return id;
}
