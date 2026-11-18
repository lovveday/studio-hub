import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Camera, Clock3, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  getPostCounts,
  listPosts,
  listPostsBetween,
  type PostWithPlatforms,
} from "@/lib/data";
import { listStoryPlans, storyPlatformMeta } from "@/lib/stories";
import type { StoryPlanView } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";
import {
  Badge,
  buttonClasses,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PlatformStack,
  StatusBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  draft: "bg-cream text-ink/60",
  needs_review: "bg-gold-soft text-[#7a5116]",
  approved: "bg-teal-soft text-[#086b6b]",
  scheduled: "bg-ink text-paper",
  ready: "bg-coral text-white",
  published: "bg-teal text-white",
  failed: "bg-red-100 text-red-700",
};

function parseMonth(value?: string): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}-01T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function monthHref(date: Date) {
  return `/calendar?month=${format(date, "yyyy-MM")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const month = parseMonth(params.month);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const posts = listPostsBetween(brand.id, gridStart.toISOString(), gridEnd.toISOString());
  const storyPlans = listStoryPlans(brand.id, 200).filter(
    (plan) =>
      plan.status !== "draft" &&
      new Date(plan.scheduled_at) >= gridStart &&
      new Date(plan.scheduled_at) <= gridEnd
  );
  const allPosts = listPosts(brand.id, 200);
  const counts = getPostCounts(brand.id);
  const unscheduled = allPosts.filter((post) => !post.scheduled_at).slice(0, 4);
  const needsPrep = allPosts
    .filter((post) => ["draft", "needs_review", "approved"].includes(post.status))
    .filter((post) => post.scheduled_at && new Date(post.scheduled_at).getTime() < Date.now() + 7 * 86400000)
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  const byDay = new Map<string, PostWithPlatforms[]>();
  for (const post of posts) {
    if (!post.scheduled_at) continue;
    const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    list.push(post);
    byDay.set(key, list);
  }

  const storiesByDay = new Map<string, StoryPlanView[]>();
  for (const plan of storyPlans) {
    const key = format(new Date(plan.scheduled_at), "yyyy-MM-dd");
    const list = storiesByDay.get(key) ?? [];
    list.push(plan);
    storiesByDay.set(key, list);
  }

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · ${counts.scheduled} scheduled · ${storyPlans.length} stories · ${counts.needsReview} in review`}
        title="The calendar"
        description="Plan the month, see what needs preparing, and catch anything that is about to slip."
        actions={
          <>
            <Link href={monthHref(addMonths(month, -1))} className={buttonClasses("outline", "sm")}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Link>
            <Link href="/calendar" className={buttonClasses("outline", "sm")}>
              Today
            </Link>
            <Link href={monthHref(addMonths(month, 1))} className={buttonClasses("outline", "sm")}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/composer" className={buttonClasses("primary", "sm")}>
              <Plus className="h-3.5 w-3.5" />
              New post
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="display text-2xl text-ink">{format(month, "MMMM yyyy")}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {posts.length} posts placed · {counts.published} published this brand lifetime
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["Scheduled", counts.scheduled, "bg-ink"],
                ["In review", counts.needsReview, "bg-gold"],
                ["Approved", counts.approved, "bg-teal"],
              ].map(([label, value, color]) => (
                <span key={String(label)} className="inline-flex items-center gap-1.5 rounded-full bg-cream/70 px-2.5 py-1 text-[10px] font-semibold text-ink/60">
                  <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                  {label} {value}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-line bg-cream/30">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = byDay.get(key) ?? [];
              const dayStories = storiesByDay.get(key) ?? [];
              const dayTotal = dayPosts.length + dayStories.length;
              const shownPosts = dayPosts.slice(0, dayStories.length ? 2 : 3);
              const shownStories = dayStories.slice(0, 2);
              const shownTotal = shownPosts.length + shownStories.length;
              const inMonth = isSameMonth(day, month);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[112px] border-b border-r border-line/70 p-1.5 last:border-r-0",
                    !inMonth && "bg-cream/20",
                    isSameDay(day, new Date()) && "bg-coral/[0.04]"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        isToday(day) ? "bg-coral text-white" : inMonth ? "text-ink/60" : "text-muted/40"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayTotal > 0 ? (
                      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-muted/60">
                        {dayTotal}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {shownPosts.map((post) => {
                      const platforms = (post.platforms ?? "").split(",").filter(Boolean);
                      return (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          className={cn(
                            "block rounded-md px-1.5 py-1 text-[9px] font-semibold leading-tight transition-opacity hover:opacity-80",
                            statusColor[post.status] ?? "bg-cream text-ink/60"
                          )}
                        >
                          <span className="line-clamp-2">{post.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 opacity-70">
                            {platforms.slice(0, 3).map((platform) => (
                              <span
                                key={platform}
                                className="h-1 w-1 rounded-full"
                                style={{ backgroundColor: platformMeta(platform).color }}
                              />
                            ))}
                            <span className="ml-auto">
                              {post.scheduled_at ? format(new Date(post.scheduled_at), "HH:mm") : ""}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                    {shownStories.map((plan) => {
                      const platform = storyPlatformMeta(plan.platform);
                      return (
                        <Link
                          key={plan.id}
                          href={`/stories/${plan.id}`}
                          className="block rounded-md border border-coral/25 bg-coral/[0.06] px-1.5 py-1 text-[9px] font-semibold leading-tight text-coral transition-opacity hover:opacity-80"
                        >
                          <span className="flex items-center gap-1">
                            <Camera className="h-2.5 w-2.5" />
                            {platform.label} story
                            <span className="ml-auto font-normal opacity-80">
                              {format(new Date(plan.scheduled_at), "HH:mm")}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-ink/70">{plan.title}</span>
                        </Link>
                      );
                    })}
                    {dayTotal > shownTotal ? (
                      <p className="px-1 text-[8px] font-semibold text-muted">
                        +{dayTotal - shownTotal} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Needs preparation"
              description="Scheduled in the next 7 days but not approved yet."
              action={<Badge tone="gold">{needsPrep.length}</Badge>}
            />
            <div className="divide-y divide-line/70">
              {needsPrep.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">Everything in the next 7 days is approved.</p>
              ) : (
                needsPrep.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block px-5 py-3 transition-colors hover:bg-cream/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-xs font-semibold text-ink">{post.title}</p>
                      <StatusBadge status={post.status} className="scale-90" />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                      <Clock3 className="h-3 w-3" />
                      {post.scheduled_at ? formatDateTime(post.scheduled_at) : "No date"}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Unscheduled drafts"
              description="Ideas without a date. Give them a slot before they go cold."
              action={<Badge>{unscheduled.length}</Badge>}
            />
            <div className="divide-y divide-line/70">
              {unscheduled.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">No unscheduled drafts.</p>
              ) : (
                unscheduled.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block px-5 py-3 transition-colors hover:bg-cream/40"
                  >
                    <p className="line-clamp-1 text-xs font-semibold text-ink">{post.title}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-muted">{post.idea}</p>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="bg-ink text-paper">
            <div className="p-5">
              <p className="eyebrow text-coral">Prep rhythm</p>
              <p className="display mt-2 text-xl leading-tight">Video needs 3 days. Carousels need 2. Text needs 1.</p>
              <p className="mt-3 text-[11px] leading-relaxed text-paper/50">
                The hub will nudge you before the publish date, not on it. You can change the lead time per post.
              </p>
            </div>
          </Card>

          {posts.length === 0 ? (
            <EmptyState
              title="Nothing in this month"
              description="Switch month or compose the next post."
              action={
                <Link href="/composer" className={buttonClasses("coral", "sm")}>
                  Compose a post
                </Link>
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
