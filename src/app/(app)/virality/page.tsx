import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Frame,
  Loader2,
  Play,
  Sparkles,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getBrandProfile, listFacts } from "@/lib/data";
import { canLoadSample, sampleForBrand } from "@/lib/virality-samples";
import { listAnalyses, parseAnalysis } from "@/lib/virality";
import { loadSampleTeardownAction, createPostFromAnalysisAction } from "@/app/actions/virality";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  buttonClasses,
} from "@/components/ui";
import { BeatRuler } from "@/components/virality/beat-ruler";
import { ViralityCover } from "@/components/virality/cover";
import { formatTimecode } from "@/lib/virality-types";
import type { ViralityAnalysis } from "@/lib/virality-types";
import { platformMeta } from "@/lib/platforms";
import { relativeTime, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function modeLabel(mode: string | null): { label: string; tone: "neutral" | "teal" | "gold" | "coral" } {
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

function PatternRow({
  label,
  count,
  max,
  example,
}: {
  label: string;
  count: number;
  max: number;
  example?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-ink">{label}</p>
        <p className="text-[11px] tabular-nums text-muted">
          {count} {count === 1 ? "clip" : "clips"}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
        <div
          className="h-full rounded-full bg-coral"
          style={{ width: `${Math.max(4, Math.round((count / max) * 100))}%` }}
        />
      </div>
      {example ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">“{example}”</p>
      ) : null}
    </div>
  );
}

function TeardownRow({ analysis }: { analysis: ViralityAnalysis }) {
  const platform = platformMeta(analysis.platform);
  const mode = modeLabel(analysis.mode);
  const duration =
    analysis.duration_seconds ?? analysis.teardown?.duration_seconds ?? 0;
  const hook = analysis.teardown?.hook.text || analysis.caption || analysis.source_title;
  const thumbnail = analysis.poster_path
    ? `/api/virality/${analysis.id}/media/${analysis.poster_path}`
    : analysis.source_type === "url" && typeof analysis.metadata.thumbnail === "string"
      ? analysis.metadata.thumbnail
      : "";

  return (
    <Link
      href={`/virality/${analysis.id}`}
      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream/40"
    >
      {thumbnail ? (
        <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className="flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-paper"
          style={{ backgroundColor: platform.color }}
        >
          <span className="text-[10px] font-black">{platform.short}</span>
          <span className="mt-0.5 text-[8px] tabular-nums opacity-75">
            {formatTimecode(duration)}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-semibold text-ink">
            {analysis.source_title || analysis.teardown?.title || "Untitled teardown"}
          </p>
          {analysis.status === "processing" ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-coral" />
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-muted">“{hook}”</p>
        <p className="mt-0.5 text-[10px] text-muted">
          {analysis.creator || "Source unknown"} · {relativeTime(analysis.created_at)}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {analysis.adaptation && analysis.similarity ? (
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
              {Math.round(analysis.similarity.score * 100)}% overlap
            </Badge>
          )
        ) : null}
        <Badge tone={analysis.status === "failed" ? "red" : mode.tone}>
          {analysis.status === "failed" ? "Failed" : mode.label}
        </Badge>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted/50" />
    </Link>
  );
}

export default async function ViralityPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const rows = listAnalyses(brand.id);
  const analyses = rows.map(parseAnalysis);
  const ready = analyses.filter((analysis) => analysis.status === "ready" && analysis.teardown);
  const latest = ready[0] ?? analyses[0];
  const hook = latest?.teardown?.hook;
  const visualHook = Boolean(hook?.text.startsWith("Visual opening — "));
  const hookText = visualHook
    ? hook?.text.replace(/^Visual opening — /, "")
    : hook?.text;
  const latestAdaptation = latest?.adaptation ?? null;
  const latestSimilarity = latest?.similarity ?? null;

  const hookDevices = new Map<string, { count: number; example: string }>();
  const ctaTypes = new Map<string, { count: number; example: string }>();
  for (const analysis of ready) {
    const device = analysis.teardown?.hook.device || "Unclassified";
    const entry = hookDevices.get(device) ?? { count: 0, example: analysis.teardown?.hook.text ?? "" };
    entry.count += 1;
    entry.example = entry.example || analysis.teardown?.hook.text || "";
    hookDevices.set(device, entry);
    const cta = analysis.teardown?.cta;
    if (cta?.text) {
      const key = cta.type || "ask";
      const ctaEntry = ctaTypes.get(key) ?? { count: 0, example: cta.text };
      ctaEntry.count += 1;
      ctaTypes.set(key, ctaEntry);
    }
  }
  const devices = [...hookDevices.entries()].sort((a, b) => b[1].count - a[1].count);
  const ctas = [...ctaTypes.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxDevice = devices[0]?.[1].count ?? 1;
  const hookDurations = ready
    .map((analysis) => (analysis.teardown ? analysis.teardown.hook.end - analysis.teardown.hook.start : 0))
    .filter((value) => value > 0);
  const durations = ready
    .map((analysis) => analysis.duration_seconds ?? analysis.teardown?.duration_seconds ?? 0)
    .filter((value) => value > 0);
  const beatCounts = ready.map((analysis) => analysis.teardown?.timeline.length ?? 0).filter(Boolean);
  const adapted = ready.filter((analysis) => analysis.adaptation);
  const comparable = adapted.filter((analysis) => analysis.similarity?.comparable !== false);
  const safe = comparable.filter((analysis) => analysis.similarity?.level === "low");
  const profile = getBrandProfile(brand.id);
  const facts = listFacts(brand.id);
  const approvedFacts = facts.filter((fact) => fact.status === "approved" && !fact.valid_to);
  const bannedClaims = (profile?.banned_claims ?? "")
    .split(",")
    .map((claim) => claim.trim())
    .filter(Boolean);
  const sample = sampleForBrand(brand, facts);
  const sampleAvailable = canLoadSample(brand.id);

  const kpis = [
    {
      label: "Teardowns",
      value: String(analyses.length),
      detail: `${ready.length} ready · ${adapted.length} adapted`,
    },
    {
      label: "Median hook",
      value: hookDurations.length ? `${median(hookDurations).toFixed(1)}s` : "—",
      detail: "Opening hook length",
    },
    {
      label: "Most-used hook",
      value: devices[0]?.[0] ?? "—",
      detail: devices[0] ? `${devices[0][1].count} of ${ready.length} clips` : "No teardowns yet",
    },
    {
      label: "Safe to adapt",
      value: comparable.length ? `${safe.length}/${comparable.length}` : "—",
      detail: comparable.length ? "Under 8% wording overlap" : "Wording check runs per brief",
    },
  ];

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · competitor teardowns`}
        title="Virality Lab"
        description="Take apart a clip that worked, then rebuild its structure for this brand — without borrowing its words."
        actions={
          <>
            {sampleAvailable ? (
              <form action={loadSampleTeardownAction}>
                <Button type="submit" variant="outline" size="sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Load sample
                </Button>
              </form>
            ) : null}
            <Link href="/virality/new" className={buttonClasses("coral", "sm")}>
              <Plus className="h-3.5 w-3.5" />
              New teardown
            </Link>
          </>
        }
      />

      {params.deleted ? <Notice tone="success">Teardown deleted, including its captured frames.</Notice> : null}
      {params.error ? <Notice tone="error">{params.error}</Notice> : null}

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white px-4 py-4 sm:px-5">
              <p className="eyebrow text-muted">{kpi.label}</p>
              <p
                className={`display mt-2 truncate leading-none text-ink ${
                  kpi.value.length > 7 ? "text-[18px]" : "text-[24px]"
                }`}
              >
                {kpi.value}
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{kpi.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {latest ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-[190px_minmax(0,1fr)]">
                <div className="h-[250px] bg-ink md:h-auto">
                  <ViralityCover analysis={latest} />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="coral">
                      <Play className="h-2.5 w-2.5" />
                      Latest teardown
                    </Badge>
                    <Badge tone="neutral">{platformMeta(latest.platform).label}</Badge>
                    <span className="text-[10px] tabular-nums text-muted">
                      {formatTimecode(latest.duration_seconds ?? latest.teardown?.duration_seconds ?? 0)}
                    </span>
                    {latest.mode === "sample" ? <Badge tone="gold">Sample</Badge> : null}
                  </div>
                  <h2 className="display mt-3 text-balance text-[26px] leading-[1.08] text-ink sm:text-[30px]">
                    {latest.source_title || latest.teardown?.title || "Processing teardown"}
                  </h2>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {latest.creator || "Source unknown"} · {relativeTime(latest.created_at)}
                  </p>

                  {hook ? (
                    <blockquote className="display mt-4 border-l-2 border-coral pl-3 text-[19px] leading-[1.2] text-ink/85">
                      {visualHook ? hookText : `“${hook.text}”`}
                    </blockquote>
                  ) : (
                    <p className="mt-4 text-xs leading-relaxed text-muted">
                      The teardown is still being written. Open it to watch the stages.
                    </p>
                  )}

                  {latest.teardown ? (
                    <BeatRuler
                      beats={latest.teardown.timeline}
                      duration={latest.teardown.duration_seconds}
                      className="mt-4"
                    />
                  ) : null}

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Hook</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-ink">
                        {hook ? `${formatTimecode(hook.start)}–${formatTimecode(hook.end)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Cuts / min</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-ink">
                        {latest.teardown?.pacing.cuts_per_minute ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">The ask</p>
                      <p className="mt-1 truncate text-xs font-semibold text-ink">
                        {latest.teardown?.cta.type || "None found"}
                      </p>
                    </div>
                  </div>

                  {latest.teardown?.why_it_worked[0] ? (
                    <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-muted">
                      <span className="font-semibold text-ink/75">Why it likely worked: </span>
                      {latest.teardown.why_it_worked[0].claim}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link href={`/virality/${latest.id}`} className={buttonClasses("primary", "sm")}>
                      Open the teardown
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/virality/${latest.id}#brief`}
                      className={buttonClasses("outline", "sm")}
                    >
                      Jump to the brief
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="All teardowns"
                description="Every clip read for this brand, newest first."
                action={<Badge tone="neutral">{analyses.length} total</Badge>}
              />
              {analyses.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<FlaskConical className="h-5 w-5" />}
                    title="No teardowns yet"
                    description="Upload a clip, paste a link, or load the sample to see the full teardown and adaptation brief."
                    action={
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Link href="/virality/new" className={buttonClasses("coral", "sm")}>
                          New teardown
                        </Link>
                        {sampleAvailable ? (
                          <form action={loadSampleTeardownAction}>
                            <Button type="submit" variant="outline" size="sm">
                              Load sample
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/70">
                  {analyses.map((analysis) => (
                    <TeardownRow key={analysis.id} analysis={analysis} />
                  ))}
                </div>
              )}
            </Card>

            {latest && latestAdaptation ? (
              <Card>
                <CardHeader
                  title="Latest brief"
                  description={`Same structure, ${brand.name} words. Ready to turn into a draft.`}
                  action={
                    latestSimilarity ? (
                      latestSimilarity.comparable === false ? (
                        <Badge tone="neutral">Not compared</Badge>
                      ) : (
                        <Badge
                          tone={
                            latestSimilarity.level === "low"
                              ? "teal"
                              : latestSimilarity.level === "watch"
                                ? "gold"
                                : "red"
                          }
                        >
                          {Math.round(latestSimilarity.score * 100)}% overlap
                        </Badge>
                      )
                    ) : undefined
                  }
                />
                <div className="p-5">
                  <p className="display text-[19px] leading-[1.15] text-ink">
                    {latestAdaptation.angle}
                  </p>
                  <p className="mt-3 border-l-2 border-coral pl-3 text-[12px] font-semibold leading-relaxed text-ink/85">
                    “{latestAdaptation.hook}”
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <form action={createPostFromAnalysisAction}>
                      <input type="hidden" name="id" value={latest.id} />
                      <input type="hidden" name="platform" value={latest.platform || "instagram"} />
                      <Button type="submit" variant="coral" size="sm">
                        <Plus className="h-3.5 w-3.5" />
                        Create draft post
                      </Button>
                    </form>
                    <Link
                      href={`/virality/${latest.id}#brief`}
                      className={buttonClasses("outline", "sm")}
                    >
                      Open the full brief
                    </Link>
                    <span className="text-[10px] text-muted">
                      {latestAdaptation.facts_used.length} approved{" "}
                      {latestAdaptation.facts_used.length === 1 ? "fact" : "facts"} attached ·{" "}
                      {latestAdaptation.test_plan.window}
                    </span>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Pattern library"
                description={`What is recurring across ${ready.length} ${ready.length === 1 ? "teardown" : "teardowns"}.`}
                action={<Frame className="h-4 w-4 text-muted" />}
              />
              <div className="space-y-5 p-5">
                {devices.length ? (
                  <div className="space-y-4">
                    <p className="eyebrow text-muted">Hook devices</p>
                    {devices.slice(0, 3).map(([device, entry]) => (
                      <PatternRow
                        key={device}
                        label={device}
                        count={entry.count}
                        max={maxDevice}
                        example={truncate(entry.example, 110)}
                      />
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-ink">No patterns yet</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Read two or three clips and the lab starts grouping the hooks, asks and pacing
                      that keep showing up in this niche.
                    </p>
                  </div>
                )}

                {ctas.length ? (
                  <div className="space-y-2 border-t border-line pt-4">
                    <p className="eyebrow text-muted">The ask</p>
                    {ctas.slice(0, 3).map(([type, entry]) => (
                      <div key={type} className="flex items-baseline justify-between gap-3">
                        <p className="text-[12px] font-semibold capitalize text-ink">{type}</p>
                        <p className="text-[11px] tabular-nums text-muted">{entry.count}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Runtime</p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                      {durations.length ? `${Math.round(median(durations))}s` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Beats</p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                      {beatCounts.length ? Math.round(median(beatCounts)) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Safe</p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                      {comparable.length ? `${safe.length}/${comparable.length}` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-ink text-paper">
              <div className="p-5">
                <p className="eyebrow text-coral">Adaptation guardrails</p>
                <h2 className="display mt-2 text-[22px] leading-[1.1]">
                  Structure can be borrowed. Words and claims cannot.
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed text-paper/55">
                  Every brief is generated against {brand.name}’s approved facts and checked for
                  wording overlap with the source.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="display text-[26px] leading-none text-paper">{approvedFacts.length}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-paper/40">
                      approved facts
                    </p>
                  </div>
                  <div>
                    <p className="display text-[26px] leading-none text-paper">{bannedClaims.length}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-paper/40">
                      banned claims
                    </p>
                  </div>
                </div>
                {bannedClaims.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {bannedClaims.slice(0, 4).map((claim) => (
                      <span
                        key={claim}
                        className="rounded-md bg-white/[0.07] px-1.5 py-1 text-[9px] text-paper/60"
                      >
                        {claim}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link
                  href="/settings"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-coral hover:underline"
                >
                  Edit brand guardrails
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <p className="eyebrow text-muted">How the lab reads a clip</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Hook: the first three seconds, quoted exactly.",
                    "Structure: timed beats, cuts, on-screen text and audio cues.",
                    "Hypotheses: why it likely worked, each with evidence.",
                    "Adaptation: the same shape, grounded in approved brand facts.",
                    "Wording check: the draft is compared with the source before it ships.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="p-6 sm:p-8">
                <Badge tone="coral">
                  <FlaskConical className="h-2.5 w-2.5" />
                  Start here
                </Badge>
                <h2 className="display mt-3 text-balance text-[30px] leading-[1.05] text-ink">
                  Bring a clip you wish you had made.
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                  The lab reads the hook, structure and ask, then rebuilds the shape around{" "}
                  {brand.name}’s own product and approved facts. It is a research tool, not a
                  reposter: the source is deleted after analysis.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link href="/virality/new" className={buttonClasses("coral", "md")}>
                    <Plus className="h-4 w-4" />
                    New teardown
                  </Link>
                  {sampleAvailable ? (
                    <form action={loadSampleTeardownAction}>
                      <Button type="submit" variant="outline" size="md">
                        <Sparkles className="h-4 w-4" />
                        Load sample teardown
                      </Button>
                    </form>
                  ) : null}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Upload or link", "A vertical clip, or a public post URL plus its transcript."],
                    ["Read the shape", "Hook, timed beats, pacing, on-screen text and the ask."],
                    ["Adapt safely", "Same structure, new words, grounded in approved facts."],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-xl bg-cream/55 p-3">
                      <p className="text-[11px] font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden bg-cream/70 p-5 md:block">
                <div className="flex h-full flex-col justify-between">
                  <p className="eyebrow text-muted">Sample output preview</p>
                  <div className="space-y-2">
                    {["Hook", "Turn", "Method", "Proof", "Close"].map((label, index) => (
                      <div
                        key={label}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-semibold ${
                          index === 0
                            ? "bg-coral text-white"
                            : index === 4
                              ? "bg-ink text-paper"
                              : "bg-white text-ink/70"
                        }`}
                      >
                        <span>{label}</span>
                        <span className="tabular-nums opacity-70">{`0:${String(index * 6).padStart(2, "0")}`}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted">
                    The real screen shows the clip&apos;s own frames and exact timecodes.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="bg-ink text-paper">
              <div className="p-5">
                <p className="eyebrow text-coral">Adaptation guardrails</p>
                <h2 className="display mt-2 text-[22px] leading-[1.1]">
                  Grounded in {brand.name}, not in the source.
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed text-paper/55">
                  {approvedFacts.length} approved facts and {bannedClaims.length} banned claims are
                  applied to every brief.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-coral hover:underline"
                >
                  Edit brand guardrails
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <p className="eyebrow text-muted">What you get</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "A timestamped teardown with evidence, not vibes.",
                    "A brand-safe adaptation brief with script and shots.",
                    "A wording-overlap check against the source.",
                    "A two-variant test plan and one-click draft post.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}

      {sample && !latest ? (
        <p className="text-[10px] text-muted">
          The sample is illustrative: {sample.note.toLowerCase()}
        </p>
      ) : null}
    </div>
  );
}
