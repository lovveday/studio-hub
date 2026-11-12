import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  createViralityAnalysis,
  fetchLinkMetadata,
  MAX_VIRALITY_VIDEO_BYTES,
  startViralityAnalysis,
} from "@/lib/virality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PLATFORMS = new Set(["tiktok", "instagram", "youtube", "facebook", "linkedin", "x"]);

function safePlatform(value: unknown): string {
  const platform = String(value ?? "").toLowerCase();
  return PLATFORMS.has(platform) ? platform : "tiktok";
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

type FramePayload = { time?: unknown; dataUrl?: unknown };

function parseFrames(raw: unknown): Array<{ time: number; dataUrl: string }> {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as FramePayload[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (frame) =>
          typeof frame?.dataUrl === "string" &&
          frame.dataUrl.startsWith("data:image/") &&
          frame.dataUrl.length < 500_000
      )
      .slice(0, 8)
      .map((frame) => ({
        time: numberOrUndefined(frame.time) ?? 0,
        dataUrl: String(frame.dataUrl),
      }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const brand = await getActiveBrand();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(String(form.get("meta") ?? "{}")) as Record<string, unknown>;
      } catch {
        meta = {};
      }
      const videoEntry = form.get("video");
      const video =
        videoEntry && typeof videoEntry === "object" && "arrayBuffer" in videoEntry
          ? (videoEntry as File)
          : null;
      const frames = parseFrames(form.get("frames"));
      const transcript = String(meta.transcript ?? form.get("transcript") ?? "").slice(0, 40_000);
      const caption = String(meta.caption ?? "").slice(0, 12_000);

      if (!video && frames.length === 0 && transcript.trim().length < 40) {
        return Response.json(
          { error: "Attach a clip, or add a caption or transcript long enough to read." },
          { status: 400 }
        );
      }
      if (video && video.size > MAX_VIRALITY_VIDEO_BYTES) {
        return Response.json(
          { error: "That clip is over 100 MB. Trim it to the first 90 seconds and try again." },
          { status: 413 }
        );
      }

      const videoBuffer = video ? Buffer.from(await video.arrayBuffer()) : undefined;
      const id = createViralityAnalysis({
        brandId: brand.id,
        userId: user.id,
        sourceType: "upload",
        sourceTitle: String(meta.title ?? "").slice(0, 300),
        platform: safePlatform(meta.platform),
        creator: String(meta.creator ?? "").slice(0, 120),
        caption,
        transcript,
        durationSeconds: numberOrUndefined(meta.durationSeconds),
        width: numberOrUndefined(meta.width),
        height: numberOrUndefined(meta.height),
        mimeType: video?.type || String(meta.mimeType ?? "video/mp4"),
        videoBuffer,
        frames,
      });
      startViralityAnalysis(id);
      return Response.json({ id });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const sourceType = body.sourceType === "url" ? "url" : "text";
    const rawUrl = String(body.url ?? "").trim();
    let title = String(body.title ?? "").slice(0, 300);
    let creator = String(body.creator ?? "").slice(0, 120);
    let caption = String(body.caption ?? "").slice(0, 12_000);
    let transcript = String(body.transcript ?? "").slice(0, 40_000);
    let platform = safePlatform(body.platform);
    let durationSeconds = numberOrUndefined(body.durationSeconds);

    if (sourceType === "url") {
      if (!rawUrl) return Response.json({ error: "Paste a link first." }, { status: 400 });
      const metadata = await fetchLinkMetadata(rawUrl);
      title = title || metadata.title;
      creator = creator || metadata.creator;
      caption = caption || metadata.description;
      platform = safePlatform(body.platform || metadata.platform);
      durationSeconds = durationSeconds ?? metadata.durationSeconds ?? undefined;
      if (!title) title = `${platform} clip · ${new URL(rawUrl).hostname}`;
    }

    if (sourceType === "text" && transcript.trim().length < 40) {
      return Response.json(
        { error: "Paste at least a few lines of the script or transcript." },
        { status: 400 }
      );
    }

    const id = createViralityAnalysis({
      brandId: brand.id,
      userId: user.id,
      sourceType,
      sourceUrl: rawUrl || undefined,
      sourceTitle: title,
      platform,
      creator,
      caption,
      transcript,
      durationSeconds,
    });
    startViralityAnalysis(id);
    return Response.json({ id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
