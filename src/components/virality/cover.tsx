import { platformMeta } from "@/lib/platforms";
import { formatTimecode } from "@/lib/virality-types";
import type { ViralityAnalysis } from "@/lib/virality-types";

function thumbnailFor(analysis: ViralityAnalysis): string {
  if (analysis.poster_path) {
    return `/api/virality/${analysis.id}/media/${analysis.poster_path}`;
  }
  const remote = analysis.metadata.thumbnail;
  if (analysis.source_type === "url" && typeof remote === "string" && remote.startsWith("http")) {
    return remote;
  }
  return "";
}

export function ViralityCover({
  analysis,
  tone = "ink",
  className = "",
}: {
  analysis: ViralityAnalysis;
  tone?: "ink" | "paper";
  className?: string;
}) {
  const thumbnail = thumbnailFor(analysis);
  const landscape = Boolean(
    analysis.width && analysis.height && analysis.width > analysis.height
  );
  if (thumbnail) {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-ink ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={`Frame from ${analysis.source_title || "the source clip"}`}
          referrerPolicy="no-referrer"
          className={`h-full w-full ${landscape ? "object-contain" : "object-cover"}`}
        />
        {analysis.mode === "sample" ? (
          <span className="absolute left-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-ink">
            Sample
          </span>
        ) : null}
      </div>
    );
  }

  const dark = tone === "ink";
  const rawHook =
    analysis.teardown?.hook.text ||
    analysis.caption ||
    analysis.source_title ||
    "No hook captured yet.";
  const visualOpening = rawHook.startsWith("Visual opening — ");
  const hook = visualOpening ? rawHook.replace(/^Visual opening — /, "") : rawHook;
  const platform = platformMeta(analysis.platform);

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-4 ${
        dark ? "bg-ink text-paper" : "bg-cream text-ink"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[8px] font-bold uppercase tracking-[0.16em] ${
            dark ? "text-paper/45" : "text-muted"
          }`}
        >
          Teardown
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${
            dark ? "bg-white/10 text-paper/70" : "bg-white text-muted"
          }`}
        >
          {formatTimecode(analysis.duration_seconds ?? analysis.teardown?.duration_seconds ?? 0)}
        </span>
      </div>

      <p className="display text-[21px] leading-[1.08] tracking-[-0.02em]">
        {visualOpening ? hook : `“${hook.length > 110 ? `${hook.slice(0, 109).trimEnd()}…` : hook}”`}
      </p>

      <div className="flex items-end justify-between gap-2">
        <span className="h-[3px] w-7 bg-coral" aria-hidden />
        <span
          className={`text-[8px] font-bold uppercase tracking-[0.14em] ${
            dark ? "text-paper/45" : "text-muted"
          }`}
        >
          {platform.short} · {analysis.mode === "sample" ? "Sample" : analysis.creator || "Source"}
        </span>
      </div>
    </div>
  );
}
