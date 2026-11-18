"use client";

import { useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { createStoryAction } from "@/app/actions/stories";

type ExistingAsset = {
  id: string;
  name: string;
  kind: string;
  url: string;
};

function localInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function isoFromLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function stickerSummary(input: {
  type: string;
  question: string;
  prompt: string;
  title: string;
  options: string;
  answer: string;
  location: string;
  url: string;
}): string {
  switch (input.type) {
    case "poll":
      return `Poll · ${input.question || "question"} · ${input.options
        .split("\n")
        .filter(Boolean)
        .join(" / ")}`;
    case "question":
      return `Question · ${input.prompt || "prompt"}`;
    case "quiz":
      return `Quiz · ${input.question || "question"} · answer: ${input.answer || "—"}`;
    case "countdown":
      return `Countdown · ${input.title || "title"}`;
    case "event":
      return `Event · ${input.title || "title"}${input.location ? ` · ${input.location}` : ""}`;
    case "link":
      return `Link · ${input.url || "URL"}`;
    default:
      return "No sticker — a plain story.";
  }
}

export function StoryForm({ assets }: { assets: ExistingAsset[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("instagram");
  const [scheduledLocal, setScheduledLocal] = useState(localInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [assetId, setAssetId] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetKind, setAssetKind] = useState("");
  const [assetName, setAssetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [stickerType, setStickerType] = useState("none");
  const [question, setQuestion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState("");
  const [answer, setAnswer] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [countdownLocal, setCountdownLocal] = useState(localInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [eventLocal, setEventLocal] = useState(localInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [submitting, setSubmitting] = useState(false);

  const scheduledIso = useMemo(() => isoFromLocal(scheduledLocal), [scheduledLocal]);
  const summary = stickerSummary({
    type: stickerType,
    question,
    prompt,
    title,
    options,
    answer,
    location,
    url,
  });

  async function acceptFile(file: File | undefined) {
    setUploadError("");
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setUploadError("Choose a JPG/PNG image or an MP4/MOV/WebM video.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Story media must be under 50 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/stories/upload", { method: "POST", body: form });
      const data = (await response.json()) as {
        error?: string;
        assetId?: string;
        url?: string;
        kind?: string;
      };
      if (!response.ok || !data.assetId) throw new Error(data.error || "Upload failed.");
      setAssetId(data.assetId);
      setAssetUrl(data.url ?? "");
      setAssetKind(data.kind ?? "");
      setAssetName(file.name);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function chooseExisting(id: string) {
    const asset = assets.find((item) => item.id === id);
    setAssetId(id);
    setAssetUrl(asset?.url ?? "");
    setAssetKind(asset?.kind ?? "");
    setAssetName(asset?.name ?? "");
  }

  return (
    <form
      action={createStoryAction}
      onSubmit={() => setSubmitting(true)}
      className="space-y-5 p-5 sm:p-6"
    >
      <Notice tone="warning">
        Instagram and TikTok do not let apps add interactive stickers through their APIs. This
        planner schedules the creative and the exact sticker script, then reminds you at the time.
        You add the poll, question or event in the app — a few taps — and mark it posted here.
      </Notice>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform" htmlFor="story-platform">
          <Select id="story-platform" name="platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="instagram">Instagram Story</option>
            <option value="tiktok">TikTok Story</option>
          </Select>
        </Field>
        <Field label="Publish at" htmlFor="story-schedule">
          <Input
            id="story-schedule"
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            required
          />
        </Field>
      </div>
      <input type="hidden" name="scheduledAt" value={scheduledIso} />

      <Field label="Working title" htmlFor="story-title" hint="Internal only.">
        <Input
          id="story-title"
          name="title"
          placeholder="e.g. Barrier reset poll"
          required
          maxLength={160}
        />
      </Field>

      <div>
        <p className="text-xs font-semibold text-ink/80">9:16 creative</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Image or video, under 50 MB. Keep text inside the safe area — the sticker is added in the
          app, so leave room for it.
        </p>

        {assetUrl ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-ink">
              {assetKind === "video" ? (
                <video src={assetUrl} className="h-full w-full object-cover" controls muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{assetName || "Selected creative"}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted">
                {assetKind || "media"} · 9:16
              </p>
              <button
                type="button"
                onClick={() => {
                  setAssetId("");
                  setAssetUrl("");
                  setAssetKind("");
                  setAssetName("");
                }}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[10px] font-semibold text-muted hover:text-ink"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="story-file"
            className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream/35 px-5 py-8 text-center hover:bg-cream/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </span>
            <span className="mt-3 text-sm font-semibold text-ink">
              {uploading ? "Uploading…" : "Drop a 9:16 image or short video"}
            </span>
            <span className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
              JPG, PNG, MP4, MOV or WebM · up to 50 MB
            </span>
            <input
              ref={fileInput}
              id="story-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              className="sr-only"
              onChange={(event) => void acceptFile(event.target.files?.[0])}
            />
          </label>
        )}

        {assets.length ? (
          <div className="mt-3">
            <Field label="Or reuse an asset" htmlFor="story-existing">
              <Select
                id="story-existing"
                value={assets.some((asset) => asset.id === assetId) ? assetId : ""}
                onChange={(event) => chooseExisting(event.target.value)}
              >
                <option value="">Choose from the library…</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
        {uploadError ? <Notice tone="error" className="mt-3">{uploadError}</Notice> : null}
        <input type="hidden" name="assetId" value={assetId} />
      </div>

      <Field label="Caption / context" htmlFor="story-caption" hint="Optional. Not a Story caption in the API sense.">
        <Textarea
          id="story-caption"
          name="caption"
          placeholder="What is this story about? The screen text or hook…"
          className="min-h-20"
        />
      </Field>

      <div className="rounded-xl border border-line bg-cream/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink">Sticker plan</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              This is the exact sticker you will add in the app.
            </p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-muted">
            <ImageIcon className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-3">
          <Field label="Sticker type" htmlFor="sticker-type">
            <Select
              id="sticker-type"
              name="stickerType"
              value={stickerType}
              onChange={(event) => setStickerType(event.target.value)}
            >
              <option value="none">None — plain story</option>
              <option value="poll">Poll</option>
              <option value="question">Question box</option>
              <option value="quiz">Quiz</option>
              <option value="countdown">Countdown</option>
              <option value="event">Event</option>
              <option value="link">Link</option>
            </Select>
          </Field>
        </div>

        {stickerType === "poll" || stickerType === "quiz" ? (
          <div className="mt-3 space-y-3">
            <Field label={stickerType === "poll" ? "Poll question" : "Quiz question"} htmlFor="sticker-question">
              <Input
                id="sticker-question"
                name="stickerQuestion"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={120}
                placeholder={stickerType === "poll" ? "Which one should we try first?" : "What is the barrier-first rule?"}
              />
            </Field>
            <Field label="Options" htmlFor="sticker-options" hint="One per line, 2–4 options.">
              <Textarea
                id="sticker-options"
                name="stickerOptions"
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                className="min-h-20"
                placeholder={"Gentle cleanser\nBarrier serum\nNight cream"}
              />
            </Field>
            {stickerType === "quiz" ? (
              <Field label="Correct answer" htmlFor="sticker-answer">
                <Input
                  id="sticker-answer"
                  name="stickerAnswer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  maxLength={80}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {stickerType === "question" ? (
          <div className="mt-3">
            <Field label="Question prompt" htmlFor="sticker-prompt">
              <Input
                id="sticker-prompt"
                name="stickerPrompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={160}
                placeholder="Ask me anything about your barrier…"
              />
            </Field>
          </div>
        ) : null}

        {stickerType === "countdown" ? (
          <div className="mt-3 space-y-3">
            <Field label="Countdown title" htmlFor="sticker-title">
              <Input
                id="sticker-title"
                name="stickerTitle"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder="Launch day"
              />
            </Field>
            <Field label="Ends at" htmlFor="sticker-ends">
              <Input
                id="sticker-ends"
                type="datetime-local"
                value={countdownLocal}
                onChange={(event) => setCountdownLocal(event.target.value)}
              />
            </Field>
            <input type="hidden" name="stickerEndsAt" value={isoFromLocal(countdownLocal)} />
          </div>
        ) : null}

        {stickerType === "event" ? (
          <div className="mt-3 space-y-3">
            <Field label="Event title" htmlFor="sticker-event-title">
              <Input
                id="sticker-event-title"
                name="stickerTitle"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder="Lagos pop-up"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts at" htmlFor="sticker-starts">
                <Input
                  id="sticker-starts"
                  type="datetime-local"
                  value={eventLocal}
                  onChange={(event) => setEventLocal(event.target.value)}
                />
              </Field>
              <Field label="Location" htmlFor="sticker-location">
                <Input
                  id="sticker-location"
                  name="stickerLocation"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  maxLength={120}
                  placeholder="Ikoyi, Lagos"
                />
              </Field>
            </div>
            <input type="hidden" name="stickerStartsAt" value={isoFromLocal(eventLocal)} />
          </div>
        ) : null}

        {stickerType === "link" ? (
          <div className="mt-3 space-y-3">
            <Field label="URL" htmlFor="sticker-url">
              <Input
                id="sticker-url"
                name="stickerUrl"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Label" htmlFor="sticker-label">
              <Input
                id="sticker-label"
                name="stickerLabel"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={60}
                placeholder="Shop the reset"
              />
            </Field>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed text-ink/75">
          {summary}
        </div>
      </div>

      <Field label="Production notes" htmlFor="story-notes" hint="Safe area, music, tagging, approval notes.">
        <Textarea
          id="story-notes"
          name="notes"
          placeholder="Keep the poll in the lower third; tag @glowing_sarah; add the link sticker only if available…"
          className="min-h-20"
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[10px] leading-relaxed text-muted">
          At the scheduled time the worker marks this ready and sends a notification. It never tries
          to inject a sticker through the API.
        </p>
        <Button type="submit" variant="coral" size="md" disabled={uploading || submitting || !assetId}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Schedule story plan
        </Button>
      </div>
    </form>
  );
}
