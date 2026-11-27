import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileBarChart,
  Lightbulb,
  MessageCircle,
  Mic,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  getBrandProfile,
  getDashboardData,
  listFacts,
  listKnowledge,
} from "@/lib/data";
import { formatDateTime, relativeTime, truncate } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";
import { uploadPostConfigured } from "@/lib/providers/uploadpost";
import { aiStatus } from "@/lib/ai";
import { BarList, Donut, Sparkline } from "@/components/charts";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardHeader,
  EmptyState,
  MetricCard,
  Notice,
  PageHeader,
  PlatformStack,
  StatusBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function partingForNow(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function prepState(scheduledAt: string | null, status: string) {
  if (status === "published") return { label: "Published", tone: "bg-teal-soft text-[#086b6b]" };
  if (status === "ready") return { label: "Kit ready", tone: "bg-coral-soft text-[#b5381c]" };
  if (!scheduledAt) return { label: "No date", tone: "bg-cream text-muted" };
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff < 0) return { label: "Overdue", tone: "bg-red-50 text-red-600" };
  if (diff < 24 * 60 * 60 * 1000) return { label: "Due today", tone: "bg-gold-soft text-[#7a5116]" };
  if (diff < 48 * 60 * 60 * 1000) return { label: "Prep now", tone: "bg-gold-soft text-[#7a5116]" };
  return { label: "On track", tone: "bg-cream text-muted" };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const data = getDashboardData(brand.id, user.id);
  const profile = getBrandProfile(brand.id);
  const facts = listFacts(brand.id);
  const knowledge = listKnowledge(brand.id, 4);
  const firstName = user.name.split(" ")[0];
  const hour = new Date().getHours();
  const platforms = data.metrics.byPlatform.map((platform) => ({
    label: platform.platform,
    value: platform.reach,
    color: platformMeta(platform.platform).color,
  }));
  const spark = data.metrics.series.map((point) => point.reach);

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · ${data.counts.scheduled} scheduled`}
        title={`${partingForNow(hour)}, ${firstName}.`}
        description="Here is the short version of what needs your attention, what is coming up, and what the numbers are doing."
        actions={
          <>
            <Link href="/knowledge" className={buttonClasses("outline", "md")}>
              <Mic className="h-4 w-4" />
              Add knowledge
            </Link>
            <Link href="/composer" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" />
              New post
            </Link>
          </>
        }
      />

      {!uploadPostConfigured() || !aiStatus().configured ? (
        <Notice tone="info">
          <span className="font-semibold">Finish setup:</span> add your publishing and AI keys in{" "}
          <Link href="/settings" className="font-semibold text-coral hover:underline">
            Settings → API connections
          </Link>
          . No <code>.env.local</code> editing is needed.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Reach · 7 days"
          value={new Intl.NumberFormat("en-GB", { notation: "compact" }).format(data.metrics.reach)}
          detail={`${data.metrics.reach > data.metrics.previous.reach ? "+" : ""}${
            data.metrics.previous.reach
              ? Math.round(((data.metrics.reach - data.metrics.previous.reach) / data.metrics.previous.reach) * 100)
              : 0
          }% vs previous period`}
          tone="coral"
        />
        <MetricCard
          label="Engagement rate"
          value={`${data.metrics.engagementRate.toFixed(1)}%`}
          detail={`${new Intl.NumberFormat("en-GB").format(data.metrics.engagements)} engagements`}
          tone="teal"
        />
        <MetricCard
          label="On the runway"
          value={String(data.counts.scheduled + data.counts.approved)}
          detail={`${data.counts.needsReview} waiting for review · ${data.counts.overdueDrafts} overdue`}
          tone="ink"
        />
        <MetricCard
          label="Comments waiting"
          value={String(data.comments.new)}
          detail={data.comments.escalated ? `${data.comments.escalated} escalated to a human` : "No escalations right now"}
          tone="gold"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Next on the runway"
              description="The next five posts, with the gap between now and the publish time."
              action={
                <Link href="/calendar" className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink">
                  Full calendar <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="divide-y divide-line/70">
              {data.upcoming.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<CalendarDays className="h-5 w-5" />}
                    title="The runway is clear"
                    description="Schedule the next post and it will show up here with its prep countdown."
                    action={
                      <Link href="/composer" className={buttonClasses("coral", "sm")}>
                        Compose a post
                      </Link>
                    }
                  />
                </div>
              ) : (
                data.upcoming.map((post) => {
                  const prep = prepState(post.scheduled_at, post.status);
                  const platforms = (post.platforms ?? "").split(",").filter(Boolean);
                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-cream/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-cream/40">
                        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                          {post.scheduled_at
                            ? new Date(post.scheduled_at).toLocaleDateString("en-GB", { month: "short" })
                            : "—"}
                        </span>
                        <span className="display text-lg leading-none text-ink">
                          {post.scheduled_at ? new Date(post.scheduled_at).getDate() : "?"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink group-hover:text-coral">
                            {post.title}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${prep.tone}`}>
                            {prep.label}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted">
                          {post.idea || "No brief yet."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PlatformStack platforms={platforms} />
                          <span className="text-[10px] text-muted">
                            {post.scheduled_at ? formatDateTime(post.scheduled_at) : "Unscheduled"}
                          </span>
                          <StatusBadge status={post.status} className="scale-90" />
                        </div>
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted/40 transition-colors group-hover:text-coral" />
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Needs attention"
              description="The things that will bite if they are left until the publish day."
              action={<Badge tone="coral">{data.attention.length} open</Badge>}
            />
            <div className="divide-y divide-line/70">
              {data.attention.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">Nothing is on fire. Keep the prep rhythm.</p>
              ) : (
                data.attention.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream/40"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.tone === "coral"
                          ? "bg-coral-soft text-coral"
                          : item.tone === "amber"
                            ? "bg-gold-soft text-gold"
                            : item.tone === "teal"
                              ? "bg-teal-soft text-teal"
                              : "bg-cream text-ink/60"
                      }`}
                    >
                      {item.tone === "coral" ? (
                        <TriangleAlert className="h-4 w-4" />
                      ) : item.tone === "amber" ? (
                        <Clock3 className="h-4 w-4" />
                      ) : item.tone === "teal" ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <Lightbulb className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">{item.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">{item.detail}</p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted/40" />
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Latest knowledge"
              description="New information waiting to become an approved brand fact."
              action={
                <Link href="/knowledge" className="text-[11px] font-semibold text-muted hover:text-ink">
                  Knowledge inbox
                </Link>
              }
            />
            <div className="grid gap-0 sm:grid-cols-2">
              {knowledge.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">No knowledge yet. Paste a note or upload a voice note.</p>
              ) : (
                knowledge.map((item) => (
                  <Link
                    key={item.id}
                    href={`/knowledge/${item.id}`}
                    className="border-b border-line/70 px-5 py-4 transition-colors hover:bg-cream/40 sm:odd:border-r"
                  >
                    <div className="flex items-center gap-2">
                      <Badge tone={item.status === "approved" ? "teal" : "gold"}>
                        {item.status === "approved" ? "Approved" : "Review"}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-[0.08em] text-muted">{item.type}</span>
                      <span className="ml-auto text-[10px] text-muted">{relativeTime(item.created_at)}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                      {truncate(item.summary || item.transcript || item.raw_text, 140)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader
              title="Reach pulse"
              description="Daily reach across every connected channel, last 7 days."
              action={<Badge tone="teal">7 days</Badge>}
            />
            <div className="px-5 pt-4">
              <Sparkline data={spark} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span>{data.metrics.series[0]?.date ?? "—"}</span>
                <span>{data.metrics.series[data.metrics.series.length - 1]?.date ?? "—"}</span>
              </div>
            </div>
            <div className="border-t border-line/70 px-5 py-4">
              <BarList items={platforms} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Engagement quality" description="The ratio that matters for the report." />
            <div className="px-5 py-5">
              <Donut value={data.metrics.engagementRate} label="Engagement rate this period" />
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-4">
                <div>
                  <p className="eyebrow text-muted">Engagements</p>
                  <p className="display mt-1 text-xl text-ink">
                    {new Intl.NumberFormat("en-GB").format(data.metrics.engagements)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow text-muted">Clicks</p>
                  <p className="display mt-1 text-xl text-ink">
                    {new Intl.NumberFormat("en-GB").format(data.metrics.clicks)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Brand facts"
              description="The latest approved truths the writer uses."
              action={
                <Link href="/knowledge?factStatus=approved" className="text-[11px] font-semibold text-muted hover:text-ink">
                  All facts
                </Link>
              }
            />
            <div className="divide-y divide-line/70">
              {facts.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">No approved facts yet.</p>
              ) : (
                facts.slice(0, 4).map((fact) => (
                  <div key={fact.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{fact.subject}</p>
                      <Badge tone={fact.status === "approved" ? "teal" : "gold"}>{fact.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink">{fact.value}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Brand rhythm" description="What this brand sounds like when it is working." />
            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="eyebrow text-muted">Tone</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/80">
                  {profile?.tone || "Add a tone guide in settings so the writer can sound like the brand."}
                </p>
              </div>
              <div>
                <p className="eyebrow text-muted">Pillars</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(() => {
                    try {
                      const pillars = JSON.parse(profile?.pillars ?? "[]") as string[];
                      return pillars.slice(0, 5).map((pillar) => (
                        <span key={pillar} className="rounded-md bg-cream px-2 py-1 text-[10px] font-medium text-ink/70">
                          {pillar}
                        </span>
                      ));
                    } catch {
                      return <span className="text-xs text-muted">No pillars yet.</span>;
                    }
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-cream/60 p-3">
                <Sparkles className="h-4 w-4 shrink-0 text-coral" />
                <p className="text-[11px] leading-relaxed text-muted">
                  Guardrail: <span className="font-medium text-ink/80">{profile?.banned_claims || "add banned claims in settings"}</span>
                </p>
              </div>
              <Link href="/reports" className={buttonClasses("outline", "sm", "w-full")}>
                <FileBarChart className="h-3.5 w-3.5" />
                Generate a performance report
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Mic,
            title: "Capture a voice note",
            detail: "Forward the client’s WhatsApp note and let the hub extract the new facts.",
            href: "/knowledge",
            cta: "Open inbox",
          },
          {
            icon: Sparkles,
            title: "Write the next post",
            detail: "One idea becomes native copy for all six channels, with a first comment.",
            href: "/composer",
            cta: "Open composer",
          },
          {
            icon: FileBarChart,
            title: "Ship the weekly report",
            detail: "PPTX and PDF from the same numbers, branded for the client.",
            href: "/reports",
            cta: "Open reports",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink/20"
          >
            <item.icon className="h-4 w-4 text-coral" />
            <p className="mt-3 text-xs font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.detail}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted group-hover:text-ink">
              {item.cta} <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
