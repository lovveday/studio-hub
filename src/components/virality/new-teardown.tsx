"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ArrowUpRight,
  FileVideo,
  Image as ImageIcon,
  Link2,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import { fileSize } from "@/lib/utils";
import { formatTimecode } from "@/lib/virality-types";
import { ViralityProcessing } from "./processing";

type Mode = "upload" | "link" | "text";
type Frame = { time: number; dataUrl: string };
type LinkMetadata = {
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

const MAX_BYTES = 100 * 1024 * 1024;

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    try {
      video.currentTime = Math.max(0, time);
    } catch {
      done();
      return;
    }
    window.setTimeout(done, 2500);
  });
}

function waitForPaint(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const withFrameCallback = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };
    if (typeof withFrameCallback.requestVideoFrameCallback === "function") {
      withFrameCallback.requestVideoFrameCallback(done);
    }
    window.setTimeout(done, 220);
  });
}

async function extractVideo(file: File): Promise<{
  frames: Frame[];
  width: number;
  height: number;
  duration: number;
}> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Video metadata timed out.")), 8000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("The browser could not read that video."));
      };
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    const frames: Frame[] = [];
    if (!width || !height) return { frames, width, height, duration };

    const candidates =
      duration > 5
        ? [0.6, 3, 6, 9, duration * 0.25, duration * 0.5, duration * 0.75, duration * 0.95]
        : [0.2, duration * 0.35, duration * 0.6, duration * 0.85];
    const times = [...new Set(candidates.map((time) => Math.max(0, Math.round(time * 10) / 10)))]
      .filter((time) => time < Math.max(0.4, duration - 0.15))
      .slice(0, 8);

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 360 / width);
    canvas.width = Math.max(2, Math.round(width * scale));
    canvas.height = Math.max(2, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return { frames, width, height, duration };

    for (const time of times) {
      await seekVideo(video, time);
      await waitForPaint(video);
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({ time, dataUrl: canvas.toDataURL("image/jpeg", 0.68) });
      } catch {
        // A frame the browser refuses to paint is skipped; the video still goes up.
      }
    }
    return { frames, width, height, duration };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

export function NewTeardown({
  brandName,
  niche,
  approvedFacts,
  bannedClaims,
  defaultPlatform = "tiktok",
}: {
  brandName: string;
  niche: string;
  approvedFacts: number;
  bannedClaims: string;
  defaultPlatform?: string;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [meta, setMeta] = useState({ width: 0, height: 0, duration: 0 });
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [creator, setCreator] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [url, setUrl] = useState("");
  const [linkMeta, setLinkMeta] = useState<LinkMetadata | null>(null);
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [analysisId, setAnalysisId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function acceptFile(selected: File | null | undefined) {
    setError("");
    setWarning("");
    if (!selected) return;
    if (!selected.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm)$/i.test(selected.name)) {
      setError("Use an MP4, MOV or WebM clip.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("That clip is over 100 MB. Trim it to the first 90 seconds and try again.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setFrames([]);
    setMeta({ width: 0, height: 0, duration: 0 });
    setExtracting(true);
    try {
      const result = await extractVideo(selected);
      setFrames(result.frames);
      setMeta({ width: result.width, height: result.height, duration: result.duration });
      if (result.frames.length === 0) {
        setWarning(
          "Frames could not be captured in this browser. The clip itself will still be analysed."
        );
      }
    } catch (extractionError) {
      setWarning(
        `${(extractionError as Error).message} The clip itself will still be sent for analysis.`
      );
    } finally {
      setExtracting(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFile(event.dataTransfer.files?.[0]);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setFrames([]);
    setMeta({ width: 0, height: 0, duration: 0 });
    setWarning("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function fetchLink() {
    setLinkError("");
    setFetchingLink(true);
    try {
      const response = await fetch("/api/virality/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as LinkMetadata & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not read that link.");
      setLinkMeta(data);
      if (data.platform) setPlatform(data.platform);
      if (data.creator) setCreator(data.creator);
      if (data.title) setTitle(data.title);
      if (data.description) setCaption(data.description);
      if (!data.ok) {
        setLinkError(
          data.note ||
            "That page did not share public metadata. Add the caption or transcript so the teardown is grounded."
        );
      }
    } catch (linkFetchError) {
      setLinkMeta(null);
      setLinkError((linkFetchError as Error).message);
    } finally {
      setFetchingLink(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "upload" && !file) {
      setError("Choose a clip first.");
      return;
    }
    if (mode === "link" && !url.trim()) {
      setError("Paste the link first.");
      return;
    }
    if (mode === "text" && transcript.trim().length < 40) {
      setError("Paste at least a few lines of the script or transcript.");
      return;
    }
    setSubmitting(true);
    try {
      let response: Response;
      if (mode === "upload") {
        const form = new FormData();
        if (file) form.append("video", file);
        form.append("frames", JSON.stringify(frames));
        form.append(
          "meta",
          JSON.stringify({
            platform,
            creator,
            title,
            caption,
            transcript,
            width: meta.width,
            height: meta.height,
            durationSeconds: meta.duration,
            mimeType: file?.type || "video/mp4",
          })
        );
        response = await fetch("/api/virality/analyze", { method: "POST", body: form });
      } else {
        response = await fetch("/api/virality/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: mode === "link" ? "url" : "text",
            url,
            platform,
            creator,
            title,
            caption,
            transcript,
            durationSeconds: linkMeta?.durationSeconds ?? undefined,
          }),
        });
      }
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || "Could not start the analysis.");
      setAnalysisId(data.id);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (analysisId) {
    return (
      <div className="p-5 sm:p-6">
        <ViralityProcessing id={analysisId} redirectOnReady />
      </div>
    );
  }

  const tabs: Array<{ id: Mode; label: string; short: string; hint: string; icon: typeof Upload }> = [
    { id: "upload", label: "Upload a clip", short: "Upload", hint: "MP4, MOV or WebM up to 100 MB", icon: Upload },
    { id: "link", label: "Paste a link", short: "Link", hint: "Public metadata only; upload the clip to watch it", icon: Link2 },
    { id: "text", label: "Paste a script", short: "Script", hint: "Transcript-only teardown", icon: FileVideo },
  ];

  return (
    <form onSubmit={submit} className="p-5 sm:p-6">
      <div role="tablist" aria-label="Source type" className="flex w-full gap-1 rounded-xl bg-cream p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              onClick={() => {
                setMode(tab.id);
                setError("");
              }}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors sm:gap-2 sm:text-xs ${
                active
                  ? "bg-white text-ink"
                  : "text-muted hover:bg-white/50 hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted">{tabs.find((tab) => tab.id === mode)?.hint}</p>

      <div className="mt-5 space-y-5" id={`panel-${mode}`} role="tabpanel">
        {mode === "upload" ? (
          <div>
            {!file ? (
              <label
                htmlFor="virality-clip"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
                  dragging ? "border-coral bg-coral-soft/50" : "border-line bg-cream/35 hover:bg-cream/60"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-semibold text-ink">
                  Drop a clip, or choose a file
                </span>
                <span className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
                  Vertical is best. Up to 100 MB — roughly the first 90 seconds is plenty for a
                  teardown.
                </span>
                <input
                  ref={fileInput}
                  id="virality-clip"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  className="sr-only"
                  onChange={(event) => void acceptFile(event.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <div
                  className={`relative overflow-hidden rounded-xl bg-ink ${
                    meta.width > meta.height ? "aspect-video" : "aspect-[9/16]"
                  }`}
                >
                  {previewUrl ? (
                    <video
                      src={previewUrl}
                      className="h-full w-full object-contain"
                      controls
                      muted
                      playsInline
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {fileSize(file.size)}
                        {meta.duration ? ` · ${formatTimecode(meta.duration)}` : ""}
                        {meta.width ? ` · ${meta.width}×${meta.height}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink"
                      aria-label="Remove clip"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                      <ImageIcon className="h-3 w-3" />
                      Storyboard · {frames.length} frames
                      {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    </p>
                    {frames.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {frames.map((frame) => (
                          <figure key={frame.time} className="shrink-0">
                            <div
                              className={`overflow-hidden rounded-md bg-cream ${
                                meta.width > meta.height ? "h-[54px] w-24" : "h-24 w-[54px]"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={frame.dataUrl}
                                alt={`Frame at ${formatTimecode(frame.time)}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <figcaption className="mt-1 text-center text-[9px] tabular-nums text-muted">
                              {formatTimecode(frame.time)}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-muted">
                        {extracting
                          ? "Reading frames in the browser…"
                          : "No frames captured. The clip will still be analysed."}
                      </p>
                    )}
                  </div>

                  <label
                    htmlFor="virality-clip"
                    className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:bg-cream/60"
                  >
                    Replace clip
                    <input
                      ref={fileInput}
                      id="virality-clip"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      className="sr-only"
                      onChange={(event) => void acceptFile(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {mode === "link" ? (
          <div className="space-y-3">
            <Field
              label="Public clip link"
              htmlFor="virality-url"
              hint="TikTok, Instagram, YouTube, Facebook, LinkedIn or X. We read the public metadata; we never download the video."
            >
              <div className="flex gap-2">
                <Input
                  id="virality-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.tiktok.com/@creator/video/…"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => void fetchLink()}
                  disabled={fetchingLink || !url.trim()}
                  className="shrink-0"
                >
                  {fetchingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Fetch details
                </Button>
              </div>
            </Field>

            <Notice tone="info">
              A link exposes only public metadata. Instagram and TikTok do not give the lab their
              video file, so the AI cannot watch the motion from a link. Upload the clip for a real
              frame-by-frame teardown; caption and transcript then become optional.
            </Notice>

            {linkError ? <Notice tone="warning">{linkError}</Notice> : null}

            {linkMeta && (linkMeta.title || linkMeta.thumbnail) ? (
              <div className="flex gap-3 rounded-xl border border-line bg-cream/35 p-3">
                {linkMeta.thumbnail ? (
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={linkMeta.thumbnail}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    {linkMeta.provider || linkMeta.platform || "Link"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-ink">
                    {linkMeta.title || "No public title"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {linkMeta.creator || "Creator unknown"}
                    {linkMeta.durationSeconds
                      ? ` · ${formatTimecode(linkMeta.durationSeconds)}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform" htmlFor="virality-platform">
            <Select
              id="virality-platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              {PLATFORM_ORDER.map((value) => (
                <option key={value} value={value}>
                  {PLATFORMS[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Creator or source" htmlFor="virality-creator">
            <Input
              id="virality-creator"
              value={creator}
              onChange={(event) => setCreator(event.target.value)}
              placeholder="@creator or publication"
            />
          </Field>
        </div>

        <Field label="Working title" htmlFor="virality-title" hint="Internal only. The AI will suggest one if you leave it blank.">
          <Input
            id="virality-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. The 7-serum reset"
          />
        </Field>

        {mode !== "text" ? (
          <Field
            label="Caption (optional)"
            htmlFor="virality-caption"
            hint="The caption or description, if you have it. Helps the lab read hashtags and the ask."
          >
            <Textarea
              id="virality-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Paste the post caption or description…"
              className="min-h-20"
            />
          </Field>
        ) : null}

        <Field
          label={
            mode === "text"
              ? "Script or transcript"
              : mode === "link"
                ? "Transcript (recommended)"
                : "Transcript (optional)"
          }
          htmlFor="virality-transcript"
          hint={
            mode === "text"
              ? "The stronger the transcript, the stronger the teardown. Include on-screen text in brackets if you have it."
              : "If you have the spoken words, add them. The lab can still watch the clip without them."
          }
        >
          <Textarea
            id="virality-transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Paste the spoken script, with line breaks where the cuts happen…"
            className="min-h-32"
          />
        </Field>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {warning ? <Notice tone="warning">{warning}</Notice> : null}

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[11px] leading-relaxed text-muted">
            Analyse only clips you have the right to use for internal research. The lab does not
            download or repost third-party video, and it grounds the brief in {brandName}’s approved
            facts.
          </p>
          <Button type="submit" variant="coral" size="md" disabled={submitting || extracting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {submitting ? "Starting…" : "Build the teardown"}
            {!submitting ? <ArrowUpRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        <span className="rounded-full bg-cream px-2 py-1 font-semibold">{niche}</span>
        <span className="rounded-full bg-cream px-2 py-1 font-semibold">
          {approvedFacts} approved facts
        </span>
        {bannedClaims ? (
          <span className="rounded-full bg-coral-soft px-2 py-1 font-semibold text-[#b5381c]">
            Banned claims enforced
          </span>
        ) : null}
      </div>
    </form>
  );
}
