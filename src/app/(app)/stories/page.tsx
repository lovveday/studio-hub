import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  listStoryPlans,
  stickerSummary,
  storyAssetUrl,
  storyPlatformMeta,
  storyStatusLabel,
} from "@/lib/stories";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  buttonClasses,
} from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";
import type { StoryPlanView } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(status: StoryPlanView["status"]): "neutral" | "teal" | "gold" | "coral" {
  if (status === "ready") return "coral";
  if (status === "posted") return "teal";
  if (status === "scheduled") return "gold";
  return "neutral";
}

function StoryRow({ plan }: { plan: StoryPlanView }) {
  const platform = storyPlatformMeta(plan.platform);
  const sticker = plan.stickers[0];
  const asset = plan.asset;
  const url = storyAssetUrl(asset);
  return (
    <Link
      href={`/stories/${plan.id}`}
      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream/40"
    >
      {url ? (
        <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-ink">
          {asset?.kind === "video" ? (
            <video src={url} className="h-full w-full object-cover" muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      ) : (
        <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-semibold text-ink">{plan.title}</p>
          <Badge tone={statusTone(plan.status)}>{storyStatusLabel(plan.status)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {platform.label} · {formatDateTime(plan.scheduled_at)}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted">
          {sticker ? stickerSummary(sticker) : "Plain story — no sticker"}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[10px] text-muted">{relativeTime(plan.scheduled_at)}</p>
        {plan.status === "posted" && plan.posted_at ? (
          <p className="mt-0.5 text-[10px] text-teal">Posted {relativeTime(plan.posted_at)}</p>
        ) : null}
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted/50" />
    </Link>
  );
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const plans = listStoryPlans(brand.id);
  const ready = plans.filter((plan) => plan.status === "ready");
  const scheduled = plans.filter((plan) => plan.status === "scheduled");
  const posted = plans.filter((plan) => plan.status === "posted");
  const stickerCount = plans.filter((plan) => plan.stickers.length > 0).length;

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · story planner`}
        title="Stories"
        description="Schedule the 9:16 creative and the exact sticker script. The app reminds you when it is time to add the poll, question or event natively."
        actions={
          <Link href="/stories/new" className={buttonClasses("coral", "sm")}>
            <Plus className="h-3.5 w-3.5" />
            New story
          </Link>
        }
      />

      {params.deleted ? <Notice tone="success">Story plan deleted.</Notice> : null}

      <Notice tone="info">
        <span className="font-semibold">The platform limit:</span> Instagram and TikTok do not allow
        apps to add interactive Story stickers through their APIs. This planner schedules the
        creative and the sticker script, sends a notification at the scheduled time, and records the
        post. You add the sticker in the app in a few taps.{" "}
        <Link href="/stories/new" className="font-semibold text-coral hover:underline">
          Build a story plan
        </Link>
        .
      </Notice>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {[
            ["Ready now", String(ready.length), "Stickers waiting in the app"],
            ["Scheduled", String(scheduled.length), "Creative + script queued"],
            ["Posted", String(posted.length), "Marked done manually"],
            ["With stickers", String(stickerCount), "Poll, question, event, link"],
          ].map(([label, value, detail]) => (
            <div key={label} className="bg-white px-4 py-4 sm:px-5">
              <p className="eyebrow text-muted">{label}</p>
              <p className="display mt-2 text-[24px] leading-none text-ink">{value}</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.65fr)]">
        <div className="space-y-5">
          {ready.length ? (
            <Card className="overflow-hidden">
              <CardHeader
                title="Ready to post"
                description="The scheduled time has passed. Open the app, add the sticker, then mark it posted."
                action={<Badge tone="coral">{ready.length} due</Badge>}
              />
              <div className="divide-y divide-line/70">
                {ready.map((plan) => (
                  <StoryRow key={plan.id} plan={plan} />
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader
              title="Scheduled stories"
              description="The worker will move these to Ready at the scheduled time."
              action={<Badge tone="gold">{scheduled.length} queued</Badge>}
            />
            {scheduled.length ? (
              <div className="divide-y divide-line/70">
                {scheduled.map((plan) => (
                  <StoryRow key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<Camera className="h-5 w-5" />}
                  title="No stories scheduled"
                  description="Create a 9:16 story plan with a poll, question, event or link. The creative and the sticker script are queued together."
                  action={
                    <Link href="/stories/new" className={buttonClasses("coral", "sm")}>
                      <Plus className="h-3.5 w-3.5" />
                      New story
                    </Link>
                  }
                />
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Posted"
              description="The manual posting record for this brand."
              action={<Badge tone="teal">{posted.length} posted</Badge>}
            />
            {posted.length ? (
              <div className="divide-y divide-line/70">
                {posted.slice(0, 12).map((plan) => (
                  <StoryRow key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-6 text-[11px] text-muted">
                Nothing marked posted yet.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="bg-ink text-paper">
            <div className="p-5">
              <p className="eyebrow text-coral">What can be automated</p>
              <h2 className="display mt-2 text-[22px] leading-[1.1]">
                Schedule the thinking. Keep the sticker native.
              </h2>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-paper/60">
                <li>• The 9:16 creative and production notes.</li>
                <li>• The exact poll, question, quiz, event, countdown or link copy.</li>
                <li>• The scheduled reminder and the posted record.</li>
              </ul>
              <p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-paper/40">
                Instagram Story media can be published by API, but interactive stickers cannot.
                TikTok Stories have no publishing API at all. The app never pretends otherwise.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <p className="eyebrow text-muted">Sticker types</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Poll", "Question", "Quiz", "Countdown", "Event", "Link"].map((type) => (
                  <span key={type} className="rounded-md bg-cream px-2 py-1 text-[10px] font-semibold text-ink/70">
                    {type}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                Choose one primary sticker per story. Put secondary notes, tags or music cues in the
                production notes.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <p className="eyebrow text-muted">The reminder</p>
              <ul className="mt-3 space-y-2">
                {[
                  "The worker checks every 60 seconds.",
                  "At the scheduled time it marks the story Ready.",
                  "You get an in-app notification with the sticker script.",
                  "Post it natively, then mark it posted.",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
                <Clock3 className="h-3 w-3" />
                The worker must be running on an always-on host.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
