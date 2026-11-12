import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Film,
  FlaskConical,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getAnalysisForBrand, parseAnalysis } from "@/lib/virality";
import {
  createPostFromAnalysisAction,
  deleteViralityAction,
  regenerateBriefAction,
  retryViralityAction,
} from "@/app/actions/virality";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  Select,
  buttonClasses,
} from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { BeatRuler } from "@/components/virality/beat-ruler";
import { SimilarityMeter } from "@/components/virality/similarity-meter";
import { ViralityProcessing } from "@/components/virality/processing";
import { formatTimecode } from "@/lib/virality-types";
import type { Confidence, Teardown } from "@/lib/virality-types";
import { PLATFORMS, PLATFORM_ORDER, platformMeta } from "@/lib/platforms";
import { relativeTime, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function modeLabel(mode: string | null): {
  label: string;
  tone: "neutral" | "teal" | "gold" | "coral";
} {
  switch (mode) {
    case "video":
      return { label: "Video analysis", tone: "teal" };
    case "vision":
      return { label: "Frame analysis", tone: "teal" };
    case "text":
      return { label: "Transcript", tone: "neutral" };
    case "metadata":
      return { label: "Metadata only", tone: "gold" };
    case "demo":
      return { label: "Demo fallback", tone: "gold" };
    case "sample":
      return { label: "Sample", tone: "neutral" };
    default:
      return { label: "Processing", tone: "neutral" };
  }
}

function confidenceTone(confidence: Confidence | null): "teal" | "gold" | "red" | "neutral" {
  if (confidence === "high") return "teal";
  if (confidence === "medium") return "gold";
  if (confidence === "low") return "neutral";
  return "neutral";
}

function beatAt(teardown: Teardown, time: number) {
  return (
    teardown.timeline.find((beat) => time >= beat.start && time < beat.end) ??
    teardown.timeline[teardown.timeline.length - 1]
  );
}

function DeleteForm({ id, label = "Delete" }: { id: string; label?: string }) {
  return (
    <form action={deleteViralityAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted hover:text-red-600">
        <Trash2 className="h-3.5 w-3.5" />
        {label}
      </Button>
    </form>
  );
}

export default async function TeardownPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rewritten?: string; error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const { id } = await params;
  const query = await searchParams;
  const row = getAnalysisForBrand(id, brand.id);
  if (!row) notFound();
  const analysis = parseAnalysis(row);
  const platform = platformMeta(row.platform);
  const mode = modeLabel(row.mode);

  if (row.status !== "ready") {
    return (
      <div className="space-y-6 fade-up">
        <Link
          href="/virality"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the lab
        </Link>
        <PageHeader
          eyebrow={`${brand.name} · teardown`}
          title={row.status === "failed" ? "That teardown stopped" : "Reading the clip"}
          description={`${platform.label}${row.creator ? ` · ${row.creator}` : ""}${
            row.source_title ? ` · ${row.source_title}` : ""
          }`}
          actions={<DeleteForm id={row.id} />}
        />

        {row.status === "failed" ? (
          <Card className="p-5">
            <Notice tone="error">
              <span className="font-semibold">The analysis failed.</span>
              <span className="mt-1 block">{row.error || "No reason was recorded."}</span>
            </Notice>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <form action={retryViralityAction}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" variant="coral" size="sm">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </form>
              <Link href="/virality/new" className={buttonClasses("outline", "sm")}>
                <Plus className="h-3.5 w-3.5" />
                Start a new teardown
              </Link>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              The source was kept so a retry does not need another upload. If the failure repeats,
              try a shorter clip or paste the transcript instead.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <Card>
              <div className="p-5 sm:p-6">
                <ViralityProcessing id={row.id} initialStage={row.stage} />
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <p className="eyebrow text-muted">While it reads</p>
                <h2 className="display mt-2 text-[22px] leading-[1.1] text-ink">
                  What the lab is looking for.
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "The exact words and visual in the first three seconds.",
                    "Where the cuts land, and what each beat is doing.",
                    "The one ask, and whether it is spoken or on-screen.",
                    "Which approved brand fact can carry the same structure.",
                    "How much of the draft still echoes the source.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
                  You can leave this page. The analysis keeps running and the teardown will appear in
                  the lab when it is ready.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  const teardown = analysis.teardown;
  const adaptation = analysis.adaptation;
  if (!teardown || !adaptation) {
    return (
      <div className="space-y-6 fade-up">
        <Link href="/virality" className="text-[11px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
          Back to the lab
        </Link>
        <Notice tone="error">
          This row is marked ready but its teardown is missing. Delete it and run the clip again.
        </Notice>
      </div>
    );
  }

  const briefText = [
    `ADAPTATION BRIEF — ${brand.name}`,
    `Source: ${row.creator || "unknown"} · ${row.source_title || teardown.title}`,
    `Angle: ${adaptation.angle}`,
    `Hook: ${adaptation.hook}`,
    "",
    "SCRIPT",
    ...adaptation.script_outline.map(
      (beat) =>
        `${formatTimecode(beat.start)}–${formatTimecode(beat.end)} · ${beat.beat}\n  ${beat.line}\n  Shot: ${beat.shot}${
          beat.on_screen_text ? `\n  On screen: ${beat.on_screen_text}` : ""
        }`
    ),
    "",
    `CTA: ${adaptation.cta}`,
    "",
    "CAPTION",
    adaptation.caption,
    "",
    `Hashtags: ${adaptation.hashtags}`,
    "",
    "TEST PLAN",
    `A · ${adaptation.test_plan.variant_a.name}: ${adaptation.test_plan.variant_a.change} — ${adaptation.test_plan.variant_a.hypothesis}`,
    `B · ${adaptation.test_plan.variant_b.name}: ${adaptation.test_plan.variant_b.change} — ${adaptation.test_plan.variant_b.hypothesis}`,
    `Metric: ${adaptation.test_plan.metric} · ${adaptation.test_plan.window}`,
    "",
    `Facts used: ${adaptation.facts_used.length ? adaptation.facts_used.join("; ") : "none"}`,
    `Guardrails: ${adaptation.guardrails.join(" ")}`,
  ].join("\n");

  const bannedHit = adaptation.guardrails.some((guardrail) =>
    /^Remove banned claim/i.test(guardrail)
  );
  const checks = [
    {
      ok: analysis.similarity
        ? analysis.similarity.comparable !== false && analysis.similarity.level !== "high"
        : false,
      label: "Wording overlap is under the rewrite line",
      detail:
        analysis.similarity?.comparable === false
          ? "There was no source text to compare; read the draft by hand."
          : analysis.similarity
            ? `${Math.round(analysis.similarity.score * 100)}% of the draft follows the source word for word.`
            : "The wording check did not run.",
    },
    {
      ok: adaptation.facts_used.length > 0,
      label: "At least one approved fact is attached",
      detail: adaptation.facts_used.length
        ? adaptation.facts_used.join("; ")
        : "No approved price, offer or product fact is in the brief.",
    },
    {
      ok: !bannedHit,
      label: "No banned claim was found in the copy",
      detail: bannedHit
        ? "The guardrail list flags wording to remove before publishing."
        : "The brief was checked against this brand's banned claims.",
    },
    {
      ok: adaptation.script_outline.length > 0 && adaptation.shot_list.length > 0,
      label: "Script and shot list are complete",
      detail: `${adaptation.script_outline.length} script beats · ${adaptation.shot_list.length} shots.`,
    },
    {
      ok: row.source_type !== "upload" || Boolean(row.source_deleted_at),
      label: "Source handled",
      detail: row.source_deleted_at
        ? "The uploaded clip was deleted after analysis."
        : row.source_type === "upload"
          ? "The clip is still in storage; delete this teardown once you are done."
          : "No third-party video was downloaded.",
    },
  ];
  const passedChecks = checks.filter((check) => check.ok).length;
  const landscapeFrames = Boolean(row.width && row.height && row.width > row.height);
  const visualHook = teardown.hook.text.startsWith("Visual opening — ");
  const hookText = visualHook
    ? teardown.hook.text.replace(/^Visual opening — /, "")
    : teardown.hook.text;
  const briefFallback = analysis.metadata.brief === "fallback";


  return (
    <div className="space-y-6 fade-up">
      <Link
        href="/virality"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the lab
      </Link>

      <PageHeader
        eyebrow={`Teardown · ${platform.label} · ${formatTimecode(
          row.duration_seconds ?? teardown.duration_seconds
        )}`}
        title={teardown.title}
        description={`${row.creator || "Source unknown"} · analysed ${relativeTime(row.created_at)}${
          row.source_title && row.source_title !== teardown.title ? ` · “${row.source_title}”` : ""
        }`}
        actions={
          <>
            <Link href="/virality/new" className={buttonClasses("outline", "sm")}>
              <Plus className="h-3.5 w-3.5" />
              New teardown
            </Link>
            <DeleteForm id={row.id} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={mode.tone}>{mode.label}</Badge>
        <Badge tone={confidenceTone(teardown.confidence)}>{teardown.confidence} confidence</Badge>
        {analysis.similarity ? (
          analysis.similarity.comparable === false ? (
            <Badge tone="neutral">Not compared</Badge>
          ) : (
            <Badge
              tone={
                analysis.similarity.level === "low"
                  ? "teal"
                  : analysis.similarity.level === "watch"
                    ? "gold"
                    : "red"
              }
            >
              {Math.round(analysis.similarity.score * 100)}% wording overlap
            </Badge>
          )
        ) : null}
        {row.source_deleted_at ? (
          <span className="text-[10px] text-muted">Source deleted after analysis</span>
        ) : null}
        {row.source_type === "url" ? (
          <span className="text-[10px] text-muted">Metadata + transcript only</span>
        ) : null}
      </div>

      {query.rewritten ? (
        <Notice tone="success">Brief rewritten and checked against the source again.</Notice>
      ) : null}
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}
      {row.mode === "sample" ? (
        <Notice tone="info">
          This is an illustrative sample, not a real clip.{" "}
          <Link href="/virality/new" className="font-semibold text-coral hover:underline">
            Run a real teardown
          </Link>{" "}
          to replace it.
        </Notice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,0.82fr)]">
        <div className="order-2 space-y-5 xl:order-1">
          <Card className="overflow-hidden">
            <CardHeader
              title="Storyboard"
              description={
                analysis.frames.length
                  ? `${analysis.frames.length} frames captured in the browser, at the clip’s own timecodes.`
                  : "No frames captured. The beat board below uses the written structure."
              }
              action={<Badge tone="neutral">{analysis.frames.length ? "Frames" : "Beats"}</Badge>}
            />
            {analysis.frames.length ? (
              <div className="flex gap-3 overflow-x-auto p-5 hide-scrollbar">
                {analysis.frames.map((frame) => {
                  const beat = beatAt(teardown, frame.time);
                  return (
                    <figure
                      key={frame.path}
                      className={`shrink-0 ${landscapeFrames ? "w-[180px]" : "w-[116px]"}`}
                    >
                      <div
                        className={`relative overflow-hidden rounded-lg bg-ink ${
                          landscapeFrames ? "aspect-video" : "aspect-[9/16]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/virality/${row.id}/media/${frame.path}`}
                          alt={`Frame at ${formatTimecode(frame.time)}`}
                          className="h-full w-full object-cover"
                          loading="eager"
                        />
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[8px] font-semibold tabular-nums text-white">
                          {formatTimecode(frame.time)}
                        </span>
                      </div>
                      <figcaption className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted">
                        {beat?.label ?? "Frame"}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-2 p-5 sm:grid-cols-2">
                {teardown.timeline.map((beat) => (
                  <div
                    key={`${beat.label}-${beat.start}`}
                    className="rounded-xl bg-cream/55 px-3 py-2.5"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                      {formatTimecode(beat.start)}–{formatTimecode(beat.end)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-ink">{beat.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                      {beat.purpose || beat.visual}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden bg-ink text-paper">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow text-coral">The hook</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-paper/70">
                  {teardown.hook.device}
                </span>
              </div>
              <blockquote className="display mt-3 text-balance text-[27px] leading-[1.1] sm:text-[31px]">
                {visualHook ? hookText : `“${teardown.hook.text}”`}
              </blockquote>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-paper/60">
                {teardown.hook.why}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-3 text-[10px] text-paper/45">
                <span>
                  In <span className="tabular-nums text-paper/85">{formatTimecode(teardown.hook.start)}</span>
                </span>
                <span>
                  Out <span className="tabular-nums text-paper/85">{formatTimecode(teardown.hook.end)}</span>
                </span>
                <span>
                  Pacing{" "}
                  <span className="tabular-nums text-paper/85">
                    {teardown.pacing.cuts_per_minute} cuts/min
                  </span>
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Structure"
              description="Timed beats with the visual, audio and on-screen evidence."
              action={<Badge tone="neutral">{teardown.timeline.length} beats</Badge>}
            />
            <div className="p-5">
              <BeatRuler beats={teardown.timeline} duration={teardown.duration_seconds} />
              <ol className="mt-5 space-y-4">
                {teardown.timeline.map((beat, index) => (
                  <li key={`${beat.label}-${beat.start}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
                    <div className="pt-0.5 text-right">
                      <p className="text-[10px] font-semibold tabular-nums text-ink">
                        {formatTimecode(beat.start)}
                      </p>
                      <p className="text-[9px] tabular-nums text-muted">
                        {formatTimecode(beat.end)}
                      </p>
                    </div>
                    <div className="border-l border-line pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] font-semibold text-ink">{beat.label}</p>
                        <span className="rounded bg-cream px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                          {beat.beat || "beat"}
                        </span>
                      </div>
                      {beat.purpose ? (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{beat.purpose}</p>
                      ) : null}
                      <dl className="mt-1.5 space-y-1 text-[10px] leading-relaxed">
                        {beat.visual ? (
                          <div className="flex gap-1.5">
                            <dt className="shrink-0 font-semibold text-muted">Visual</dt>
                            <dd className="text-ink/70">{beat.visual}</dd>
                          </div>
                        ) : null}
                        {beat.on_screen_text ? (
                          <div className="flex gap-1.5">
                            <dt className="shrink-0 font-semibold text-muted">On screen</dt>
                            <dd className="text-ink/70">“{beat.on_screen_text}”</dd>
                          </div>
                        ) : null}
                        {beat.audio ? (
                          <div className="flex gap-1.5">
                            <dt className="shrink-0 font-semibold text-muted">Audio</dt>
                            <dd className="text-ink/70">{beat.audio}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[10px] leading-relaxed text-muted">{teardown.pacing.notes}</p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Why it likely worked"
              description="Hypotheses tied to a quoted moment. Not performance data."
            />
            <ol className="divide-y divide-line/70">
              {teardown.why_it_worked.map((hypothesis) => (
                <li key={hypothesis.claim} className="flex gap-3 px-5 py-4">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold leading-relaxed text-ink">
                      {hypothesis.claim}
                    </p>
                    {hypothesis.evidence ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        {hypothesis.evidence}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={confidenceTone(hypothesis.confidence)}>
                    {hypothesis.confidence}
                  </Badge>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader
              title="Transcript"
              description={
                teardown.transcript.length
                  ? "The spoken words, with the timings the lab detected."
                  : "No speech was detected or supplied."
              }
              action={
                teardown.transcript.length ? (
                  <CopyButton
                    text={teardown.transcript.map((line) => line.text).join("\n")}
                    label="Copy"
                  />
                ) : undefined
              }
            />
            {teardown.transcript.length ? (
              <div className="max-h-[380px] overflow-y-auto">
                <ol className="divide-y divide-line/60">
                  {teardown.transcript.map((line) => (
                    <li
                      key={`${line.start}-${line.text.slice(0, 12)}`}
                      className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 px-5 py-2.5"
                    >
                      <span className="text-[10px] font-semibold tabular-nums text-muted">
                        {formatTimecode(line.start)}
                      </span>
                      <p className="text-[12px] leading-relaxed text-ink/80">{line.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="px-5 py-6 text-[11px] text-muted">
                Add a transcript when you run the next clip; it makes the teardown stronger.
              </div>
            )}
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader title="Risks to copy" />
              <div className="space-y-3 p-5">
                {teardown.risks.length ? (
                  teardown.risks.map((risk) => (
                    <div key={risk} className="flex gap-2">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                      <p className="text-[11px] leading-relaxed text-ink/75">{risk}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted">No specific risk was flagged.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Limits" />
              <div className="p-5">
                <p className="text-[11px] leading-relaxed text-ink/75">{teardown.limitations}</p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
                  <Film className="h-3 w-3" />
                  {row.mode === "sample"
                    ? "Illustrative sample; no source retained."
                    : row.source_deleted_at
                      ? "Source clip deleted after analysis."
                      : row.source_type === "upload"
                        ? "Source retained for retry."
                        : "No video source downloaded."}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Before this goes live"
              description="Checks from this teardown, not a template."
              action={
                <Badge tone={passedChecks === checks.length ? "teal" : "gold"}>
                  {passedChecks}/{checks.length}
                </Badge>
              }
            />
            <div className="p-5">
              <ul className="space-y-2.5">
                {checks.map((check) => (
                  <li key={check.label} className="flex gap-2.5">
                    {check.ok ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    ) : (
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    )}
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{check.label}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-[10px] leading-relaxed text-muted">
                  The draft action is in the wording check. Nothing publishes from this page.
                </p>
                <Link href="/virality/new" className="shrink-0 text-[10px] font-semibold text-coral hover:underline">
                  Tear down another
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <div className="order-1 space-y-5 xl:order-2">
          <Card id="brief" className="scroll-mt-24">
            <CardHeader
              title="Wording check"
              description="Structure can be borrowed. Phrasing cannot."
              action={
                analysis.similarity ? (
                  analysis.similarity.comparable === false ? (
                    <Badge tone="neutral">Not compared</Badge>
                  ) : (
                    <Badge
                      tone={
                        analysis.similarity.level === "low"
                          ? "teal"
                          : analysis.similarity.level === "watch"
                            ? "gold"
                            : "red"
                      }
                    >
                      {analysis.similarity.level}
                    </Badge>
                  )
                ) : undefined
              }
            />
            <div className="p-5">
              {analysis.similarity ? (
                <SimilarityMeter similarity={analysis.similarity} />
              ) : (
                <Notice tone="warning">The wording check did not run for this teardown.</Notice>
              )}

              <div className="mt-5 space-y-3 border-t border-line pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    Turn this into a post
                  </p>
                  <form action={createPostFromAnalysisAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <Select name="platform" defaultValue={row.platform || "instagram"} className="h-9 text-xs">
                      {PLATFORM_ORDER.map((value) => (
                        <option key={value} value={value}>
                          {PLATFORMS[value].label}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" variant="coral" size="sm" className="shrink-0">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Create draft
                    </Button>
                  </form>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                    Creates a draft post with this caption. Nothing publishes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={regenerateBriefAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Rewrite brief
                    </Button>
                  </form>
                  <CopyButton text={briefText} label="Copy full brief" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="The brief"
              description={`Same shape, ${brand.name}’s words and facts.`}
              action={
                <div className="flex items-center gap-1.5">
                  {briefFallback ? <Badge tone="gold">Template</Badge> : null}
                  <Badge tone="teal">{adaptation.facts_used.length} facts</Badge>
                </div>
              }
            />
            <div className="space-y-5 p-5">
              {briefFallback ? (
                <Notice tone="warning">
                  The AI writer was unavailable, so this brief uses the deterministic template. Rewrite
                  it when the model is back, or tighten it by hand before publishing.
                </Notice>
              ) : null}
              <div>
                <p className="eyebrow text-muted">Angle</p>
                <p className="display mt-1 text-[19px] leading-[1.15] text-ink">{adaptation.angle}</p>
              </div>

              <div className="rounded-xl bg-cream/55 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Opening line</p>
                <p className="display mt-1 text-[18px] leading-[1.15] text-ink">“{adaptation.hook}”</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-muted">Script and shots</p>
                  <span className="text-[9px] tabular-nums text-muted">
                    {adaptation.script_outline.length} beats
                  </span>
                </div>
                <ol className="mt-2 space-y-3">
                  {adaptation.script_outline.map((beat) => (
                    <li key={`${beat.start}-${beat.beat}`} className="grid grid-cols-[42px_minmax(0,1fr)] gap-2">
                      <span className="pt-0.5 text-[9px] font-semibold tabular-nums text-muted">
                        {formatTimecode(beat.start)}
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                          {beat.beat}
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-ink">
                          {beat.line}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{beat.shot}</p>
                        {beat.on_screen_text ? (
                          <p className="mt-1 inline-block rounded bg-white px-1.5 py-0.5 text-[9px] text-ink/70">
                            Text: “{beat.on_screen_text}”
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="eyebrow text-muted">Call to action</p>
                <p className="mt-1 text-[12px] font-semibold leading-relaxed text-ink">
                  {adaptation.cta}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-muted">Caption</p>
                  <CopyButton text={adaptation.caption} label="Copy" />
                </div>
                <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-line bg-white p-3 text-[11px] leading-relaxed text-ink/80">
                  {adaptation.caption}
                </p>
                <p className="mt-1.5 text-[10px] text-muted">{adaptation.hashtags}</p>
              </div>

              <div>
                <p className="eyebrow text-muted">Grounded in</p>
                {adaptation.facts_used.length ? (
                  <ul className="mt-1.5 space-y-1.5">
                    {adaptation.facts_used.map((fact) => (
                      <li key={fact} className="flex gap-1.5 text-[10px] leading-relaxed text-ink/75">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-teal" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                    No approved fact was used. Add a current price, offer or product fact before this
                    goes to a client.
                  </p>
                )}
              </div>

              <div>
                <p className="eyebrow text-muted">Guardrails</p>
                <ul className="mt-1.5 space-y-1.5">
                  {adaptation.guardrails.map((guardrail) => (
                    <li
                      key={guardrail}
                      className="flex gap-1.5 text-[10px] leading-relaxed text-ink/75"
                    >
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                      {guardrail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Two-variant test"
              description="One variable each, same structure."
              action={<ImageIcon className="h-4 w-4 text-muted" />}
            />
            <div className="p-5">
              <div className="space-y-3">
                {[
                  ["A", adaptation.test_plan.variant_a],
                  ["B", adaptation.test_plan.variant_b],
                ].map(([letter, variant]) => {
                  const item = variant as typeof adaptation.test_plan.variant_a;
                  return (
                    <div key={letter as string} className="rounded-xl border border-line p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-paper">
                          {letter as string}
                        </span>
                        <p className="text-[11px] font-semibold text-ink">{item.name}</p>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-ink/70">{item.change}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">
                        Hypothesis: {item.hypothesis}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Metric</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/75">
                    {adaptation.test_plan.metric}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Window</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/75">
                    {adaptation.test_plan.window}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-cream/50">
            <div className="flex items-center gap-2 p-4">
              <FlaskConical className="h-4 w-4 text-coral" />
              <p className="text-[10px] leading-relaxed text-muted">
                Read the source for structure, not authority. This teardown has no access to the
                creator’s analytics, so “why it worked” stays a hypothesis.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
