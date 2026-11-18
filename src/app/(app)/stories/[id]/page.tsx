import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Plus,
  Smartphone,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  stickerSummary,
  storyAssetUrl,
  storyPlatformMeta,
  storyStatusLabel,
} from "@/lib/stories";
import { getStoryPlan } from "@/lib/stories";
import {
  deleteStoryAction,
  markStoryPostedAction,
} from "@/app/actions/stories";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  buttonClasses,
} from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { formatDateTime, relativeTime } from "@/lib/utils";
import type { StorySticker } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(status: string): "neutral" | "teal" | "gold" | "coral" {
  if (status === "ready") return "coral";
  if (status === "posted") return "teal";
  if (status === "scheduled") return "gold";
  return "neutral";
}

function stickerDetail(sticker: StorySticker): Array<[string, string]> {
  switch (sticker.type) {
    case "poll":
      return [
        ["Question", sticker.question],
        ["Options", sticker.options.join(" · ")],
      ];
    case "question":
      return [["Prompt", sticker.prompt]];
    case "quiz":
      return [
        ["Question", sticker.question],
        ["Options", sticker.options.join(" · ")],
        ["Answer", sticker.answer],
      ];
    case "countdown":
      return [
        ["Title", sticker.title],
        ["Ends", formatDateTime(sticker.endsAt)],
      ];
    case "event":
      return [
        ["Title", sticker.title],
        ["Starts", formatDateTime(sticker.startsAt)],
        ["Location", sticker.location || "—"],
      ];
    case "link":
      return [
        ["Label", sticker.label || sticker.url],
        ["URL", sticker.url],
      ];
    default:
      return [];
  }
}

export default async function StoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; posted?: string; error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const { id } = await params;
  const query = await searchParams;
  const plan = getStoryPlan(id, brand.id);
  if (!plan) notFound();

  const platform = storyPlatformMeta(plan.platform);
  const asset = plan.asset;
  const creativeUrl = storyAssetUrl(asset);
  const sticker = plan.stickers[0];
  const details = sticker ? stickerDetail(sticker) : [];
  const planText = [
    `STORY PLAN — ${brand.name}`,
    `Platform: ${platform.label}`,
    `Title: ${plan.title}`,
    `Scheduled: ${formatDateTime(plan.scheduled_at)}`,
    `Status: ${storyStatusLabel(plan.status)}`,
    `Creative: ${asset?.name ?? "none"}`,
    `Sticker: ${sticker ? stickerSummary(sticker) : "none"}`,
    ...details.map(([label, value]) => `${label}: ${value}`),
    `Notes: ${plan.notes || "—"}`,
  ].join("\n");

  return (
    <div className="space-y-6 fade-up">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to stories
      </Link>

      <PageHeader
        eyebrow={`Story plan · ${platform.label} · ${formatDateTime(plan.scheduled_at)}`}
        title={plan.title}
        description={`${storyStatusLabel(plan.status)} · ${relativeTime(plan.scheduled_at)}${
          plan.posted_at ? ` · posted ${relativeTime(plan.posted_at)}` : ""
        }`}
        actions={
          <>
            <Link href="/stories/new" className={buttonClasses("outline", "sm")}>
              <Plus className="h-3.5 w-3.5" />
              New story
            </Link>
            <form action={deleteStoryAction}>
              <input type="hidden" name="id" value={plan.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </form>
          </>
        }
      />

      {query.created ? <Notice tone="success">Story plan scheduled.</Notice> : null}
      {query.posted ? <Notice tone="success">Marked as posted. The record is saved.</Notice> : null}
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(plan.status)}>{storyStatusLabel(plan.status)}</Badge>
        <Badge tone="neutral">{platform.label}</Badge>
        {sticker ? <Badge tone="gold">{sticker.type}</Badge> : <Badge tone="neutral">Plain story</Badge>}
        <span className="text-[10px] text-muted">Stickers are added in the app.</span>
      </div>

      {plan.status === "ready" ? (
        <Card className="overflow-hidden bg-ink text-paper">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="eyebrow text-coral">Due now</p>
              <h2 className="display mt-2 text-[25px] leading-[1.1]">
                Post this story, then mark it done.
              </h2>
              <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-paper/55">
                Open {platform.label}, save the creative, add the sticker below, publish, then mark
                it posted here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={platform.deepLink}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses("coral", "sm")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {platform.appLabel}
              </a>
              <form action={markStoryPostedAction}>
                <input type="hidden" name="id" value={plan.id} />
                <Button type="submit" variant="outline" size="sm" className="border-white/20 bg-white/10 text-paper hover:bg-white/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark posted
                </Button>
              </form>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader
            title="Creative"
            description={asset ? `${asset.name} · ${asset.kind}` : "No creative attached."}
            action={<Badge tone="neutral">9:16</Badge>}
          />
          <div className="p-5">
            {creativeUrl ? (
              <div className="mx-auto max-w-[280px] overflow-hidden rounded-xl bg-ink">
                <div className="aspect-[9/16]">
                  {asset?.kind === "video" ? (
                    <video src={creativeUrl} className="h-full w-full object-cover" controls playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creativeUrl} alt={plan.title} className="h-full w-full object-cover" />
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[11px] text-muted">
                No creative attached.
              </div>
            )}
            {creativeUrl ? (
              <a
                href={creativeUrl}
                download
                className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-[11px] font-semibold text-ink hover:bg-cream/60"
              >
                <Download className="h-3.5 w-3.5" />
                Download creative
              </a>
            ) : null}
            {plan.caption ? (
              <p className="mt-4 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                {plan.caption}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Sticker script"
              description={
                sticker
                  ? "Add this exactly in the app. The API cannot place it for you."
                  : "This story has no sticker. Post the creative only."
              }
              action={<CopyButton text={planText} label="Copy plan" />}
            />
            <div className="p-5">
              {sticker ? (
                <div className="rounded-xl bg-cream/55 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                    {sticker.type}
                  </p>
                  <dl className="mt-2 space-y-2">
                    {details.map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                          {label}
                        </dt>
                        <dd className="mt-0.5 text-[13px] font-semibold leading-relaxed text-ink">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted">
                  No interactive sticker. The creative is the whole story.
                </p>
              )}

              <div className="mt-4 space-y-2.5 border-t border-line pt-4">
                {[
                  `Open ${platform.label} and choose Story.`,
                  "Select the downloaded creative.",
                  sticker
                    ? `Add the ${sticker.type} sticker with the copy above.`
                    : "Publish without a sticker.",
                  "Publish, then come back and mark it posted.",
                ].map((step, index) => (
                  <div key={step} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-paper">
                      {index + 1}
                    </span>
                    <p className="text-[11px] leading-relaxed text-ink/75">{step}</p>
                  </div>
                ))}
              </div>

              {sticker?.type === "link" ? (
                <a
                  href={sticker.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-coral hover:underline"
                >
                  Open link destination
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Schedule and notes" description="The worker reminds you at this time." />
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                <div>
                  <p className="text-[11px] font-semibold text-ink">
                    {formatDateTime(plan.scheduled_at)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">{relativeTime(plan.scheduled_at)}</p>
                </div>
              </div>
              {plan.notes ? (
                <p className="whitespace-pre-wrap rounded-xl bg-cream/50 p-3 text-[11px] leading-relaxed text-ink/75">
                  {plan.notes}
                </p>
              ) : (
                <p className="text-[11px] text-muted">No production notes.</p>
              )}
              <p className="flex gap-1.5 text-[10px] leading-relaxed text-gold">
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                {platform.note}
              </p>
            </div>
          </Card>

          {plan.status !== "ready" && plan.status !== "posted" ? (
            <Card className="bg-cream/50">
              <div className="flex items-center gap-2 p-4">
                <Smartphone className="h-4 w-4 text-coral" />
                <p className="text-[10px] leading-relaxed text-muted">
                  This plan becomes Ready when the worker reaches the scheduled time. Keep the worker
                  running on an always-on host.
                </p>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
