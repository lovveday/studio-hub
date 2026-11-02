"use client";

import { useState } from "react";
import { AlertTriangle, Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { platformMeta } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

type Variant = {
  id: string;
  platform: string;
  caption: string;
  hashtags: string;
  first_comment: string;
};

type Draft = { caption: string; hashtags: string; firstComment: string };

export function PostVariantTabs({
  variants,
  brandName,
  brandHandle,
  brandColor,
}: {
  variants: Variant[];
  brandName: string;
  brandHandle: string;
  brandColor: string;
}) {
  const [active, setActive] = useState(variants[0]?.platform ?? "instagram");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      variants.map((variant) => [
        variant.platform,
        {
          caption: variant.caption,
          hashtags: variant.hashtags,
          firstComment: variant.first_comment,
        },
      ])
    )
  );

  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-cream/30 px-5 py-8 text-center text-xs text-muted">
        No platform variants yet. Generate them below.
      </div>
    );
  }

  const activeVariant = variants.find((variant) => variant.platform === active) ?? variants[0];
  const draft = drafts[activeVariant.platform] ?? {
    caption: activeVariant.caption,
    hashtags: activeVariant.hashtags,
    firstComment: activeVariant.first_comment,
  };
  const meta = platformMeta(activeVariant.platform);
  const combined = [draft.caption, draft.hashtags].filter(Boolean).join("\n\n");
  const count = combined.length;

  function update(platform: string, field: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] ?? { caption: "", hashtags: "", firstComment: "" }),
        [field]: value,
      },
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-cream/50 p-1.5">
        {variants.map((variant) => {
          const platform = platformMeta(variant.platform);
          return (
            <button
              key={variant.platform}
              type="button"
              onClick={() => setActive(variant.platform)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
                active === variant.platform
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:bg-white/60 hover:text-ink"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: platform.color }} />
              {platform.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {variants.map((variant) => {
            const platform = platformMeta(variant.platform);
            const current = drafts[variant.platform] ?? {
              caption: variant.caption,
              hashtags: variant.hashtags,
              firstComment: variant.first_comment,
            };
            const total = [current.caption, current.hashtags].filter(Boolean).join("\n\n").length;
            const over = total > platform.limit;
            return (
              <div key={variant.platform} className={cn("space-y-3", active !== variant.platform && "hidden")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink/70">
                      {platform.label} caption
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{platform.mediaSpec}</p>
                  </div>
                  <CopyButton text={[current.caption, current.hashtags].filter(Boolean).join("\n\n")} label="Copy caption" />
                </div>
                <textarea
                  name={`caption_${variant.platform}`}
                  value={current.caption}
                  onChange={(event) => update(variant.platform, "caption", event.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-coral/15"
                  placeholder="Write the caption…"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    name={`hashtags_${variant.platform}`}
                    value={current.hashtags}
                    onChange={(event) => update(variant.platform, "hashtags", event.target.value)}
                    className="h-9 flex-1 rounded-xl border border-line bg-white px-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                    placeholder="#hashtags"
                  />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold",
                      over ? "bg-red-50 text-red-600" : "bg-cream text-muted"
                    )}
                  >
                    {over ? <AlertTriangle className="h-3 w-3" /> : null}
                    {total}/{platform.limit}
                  </span>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-ink/70" htmlFor={`first_comment_${variant.platform}`}>
                      First comment
                    </label>
                    <CopyButton text={current.firstComment} label="Copy comment" />
                  </div>
                  <textarea
                    id={`first_comment_${variant.platform}`}
                    name={`first_comment_${variant.platform}`}
                    value={current.firstComment}
                    onChange={(event) => update(variant.platform, "firstComment", event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                    placeholder="The comment you post immediately after publishing…"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink/70">Live preview</p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{meta.label}</span>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_20px_50px_-30px_rgba(17,19,24,0.4)]">
            <div className="flex items-center gap-2.5 px-4 py-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {brandName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{brandName}</p>
                <p className="truncate text-[10px] text-muted">{brandHandle}</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold text-muted">• • •</span>
            </div>
            <div
              className="flex aspect-square w-full items-center justify-center px-6 text-center"
              style={{ background: `linear-gradient(135deg, ${brandColor}18, #EFEAE0 60%, ${brandColor}22)` }}
            >
              <div>
                <p className="eyebrow text-ink/40">Visual placeholder</p>
                <p className="display mt-2 text-lg leading-tight text-ink/70">{activeVariant.platform === "youtube" ? "Video thumbnail" : "Your creative goes here"}</p>
                <p className="mt-2 text-[10px] text-muted">{meta.mediaSpec}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 text-ink/75">
              <Heart className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Send className="h-4 w-4" />
              <Bookmark className="ml-auto h-4 w-4" />
            </div>
            <div className="border-t border-line/70 px-4 py-3">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">
                {draft.caption || "Your caption will appear here."}
              </p>
              {draft.hashtags ? (
                <p className="mt-2 text-[12px] font-medium text-[#0A66C2]">{draft.hashtags}</p>
              ) : null}
              <p className="mt-2 text-[10px] text-muted">
                View all {Math.max(3, Math.round(count / 40))} comments
              </p>
            </div>
            {draft.firstComment ? (
              <div className="border-t border-line bg-cream/40 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Pinned first comment</p>
                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-ink/80">
                  {draft.firstComment}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
