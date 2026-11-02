import Link from "next/link";
import {
  BarChart3,
  Download,
  FileBarChart,
  FileText,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getMetricSummary, listReports } from "@/lib/data";
import { formatDate, formatDateTime, relativeTime } from "@/lib/utils";
import { deleteReportAction, generateReportAction } from "@/app/actions/reports";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const reports = listReports(brand.id);
  const week = getMetricSummary(brand.id, 7);
  const month = getMetricSummary(brand.id, 30);

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · weekly and monthly reporting`}
        title="Client reports"
        description="One set of numbers, two formats. Generate a branded PPTX and PDF for the weekly update or the monthly review."
        actions={
          <>
            <form action={generateReportAction}>
              <input type="hidden" name="days" value="7" />
              <Button type="submit" variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Weekly report
              </Button>
            </form>
            <form action={generateReportAction}>
              <input type="hidden" name="days" value="30" />
              <Button type="submit" variant="coral" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Monthly report
              </Button>
            </form>
          </>
        }
      />

      {params.generated ? (
        <Notice tone="success">Report generated. Both files are ready to download below.</Notice>
      ) : null}
      {params.error ? <Notice tone="error">{params.error}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["7-day reach", new Intl.NumberFormat("en-GB").format(week.reach), "FF5A36"],
          ["7-day engagement rate", `${week.engagementRate.toFixed(1)}%`, "0FA3A3"],
          ["30-day reach", new Intl.NumberFormat("en-GB").format(month.reach), "C98B3C"],
          ["30-day follower growth", `+${new Intl.NumberFormat("en-GB").format(month.followerGrowth)}`, "111318"],
        ].map(([label, value, color]) => (
          <Card key={label} className="relative overflow-hidden p-4">
            <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: `#${color}` }} />
            <p className="eyebrow text-muted">{label}</p>
            <p className="display mt-2 text-[26px] leading-none text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader
            title="Generated reports"
            description="Stored locally, ready to email or drop in the client portal."
            action={<Badge tone="neutral">{reports.length} files</Badge>}
          />
          <div className="divide-y divide-line/70">
            {reports.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<FileBarChart className="h-5 w-5" />}
                  title="No reports yet"
                  description="Generate the first weekly report. It will use the latest 7 days of metrics."
                  action={
                    <form action={generateReportAction}>
                      <input type="hidden" name="days" value="7" />
                      <Button type="submit" variant="coral" size="sm">
                        Generate weekly report
                      </Button>
                    </form>
                  }
                />
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-coral">
                    <Presentation className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{report.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.06em] text-muted">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)} ·{" "}
                      {relativeTime(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/api/reports/${report.id}/pptx`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[10px] font-bold text-ink hover:bg-cream/60"
                    >
                      <Download className="h-3 w-3" />
                      PPTX
                    </a>
                    <a
                      href={`/api/reports/${report.id}/pdf`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[10px] font-bold text-ink hover:bg-cream/60"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </a>
                    <form action={deleteReportAction}>
                      <input type="hidden" name="id" value={report.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:bg-red-50 hover:text-red-600"
                        title="Delete report"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="bg-ink text-paper">
            <div className="p-5">
              <Sparkles className="h-4 w-4 text-coral" />
              <p className="display mt-3 text-xl leading-tight">The report writes itself. You edit the story.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-paper/50">
                KPI scorecard, channel table, top posts by conversation, and three grounded insights.
                Numbers come from the metrics snapshot; no invented stats.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Cover", "KPI scorecard", "Channel table", "Top posts", "Insights"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] text-paper/60">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="This period" description="What the report will use." />
            <div className="space-y-3 p-5">
              {[
                ["Reach", new Intl.NumberFormat("en-GB").format(week.reach)],
                ["Engagements", new Intl.NumberFormat("en-GB").format(week.engagements)],
                ["Clicks", new Intl.NumberFormat("en-GB").format(week.clicks)],
                ["Channels", String(week.byPlatform.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">{label}</span>
                  <span className="text-[11px] font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="How to use it" />
            <ol className="space-y-3 p-5">
              {[
                "Generate the weekly report every Monday.",
                "Skim the three insights; edit if the AI missed context.",
                "Download the PPTX for the deck or the PDF for email.",
                "Add the client’s logo in Settings → brand kit (next slice).",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream text-[9px] font-bold text-ink">
                    {index + 1}
                  </span>
                  <p className="text-[11px] leading-relaxed text-muted">{step}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-2xl border border-dashed border-line bg-cream/30 px-4 py-3 text-[11px] font-semibold text-muted hover:text-ink"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Adjust report cadence and retention
          </Link>
        </div>
      </div>
    </div>
  );
}
