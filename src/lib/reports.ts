import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { all, get } from "./db";
import { getBrand, getMetricSummary, logActivity } from "./data";
import { generateText } from "./ai";
import { formatDate } from "./utils";

type ReportData = {
  brandName: string;
  niche: string;
  periodStart: string;
  periodEnd: string;
  days: number;
  metrics: ReturnType<typeof getMetricSummary>;
  topPosts: Array<{ title: string; comments: number; platforms: string }>;
  commentTotal: number;
  insights: string[];
};

function dateOffset(offsetDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function n(value: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(value));
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export async function buildReportData(brandId: string, days: number): Promise<ReportData> {
  const brand = getBrand(brandId);
  if (!brand) throw new Error("Brand not found.");
  const metrics = getMetricSummary(brandId, days);
  const periodStart = dateOffset(-(days - 1)).toISOString().slice(0, 10);
  const periodEnd = dateOffset(0).toISOString().slice(0, 10);

  const topPosts = all<{ title: string; comments: number; platforms: string }>(
    `SELECT p.title, count(c.id) AS comments, coalesce(group_concat(DISTINCT v.platform), '') AS platforms
     FROM posts p
     LEFT JOIN comments c ON c.post_id = p.id
     LEFT JOIN post_variants v ON v.post_id = p.id
     WHERE p.brand_id = ? AND p.status IN ('published','ready')
     GROUP BY p.id
     ORDER BY comments DESC, p.updated_at DESC
     LIMIT 4`,
    [brandId]
  );

  const commentTotalRow = get<{ c: number }>(
    "SELECT count(*) AS c FROM comments WHERE brand_id = ?",
    [brandId]
  );

  const bestPlatform = metrics.byPlatform[0];
  const fallbackInsights = [
    `Reach for the period was ${n(metrics.reach)} across ${metrics.byPlatform.length} channels, with an engagement rate of ${pct(metrics.engagementRate)}.`,
    bestPlatform
      ? `${bestPlatform.platform} led reach (${n(bestPlatform.reach)}) at a ${pct(bestPlatform.engagementRate)} engagement rate.`
      : "Connect a channel or import metrics to unlock platform-level insight.",
    commentTotalRow?.c
      ? `${n(Number(commentTotalRow.c))} comments were captured. The fastest wins came from direct answers to questions and one negative comment that needed a human reply.`
      : "Add the inbox connection to turn comments into a measurable engagement signal.",
    "Next period: keep the education-first cadence, test one founder-led video, and review the prep lead time for video posts.",
  ];

  let insights = fallbackInsights;
  const ai = await generateText(
    `Write 3 concise, specific insights for a weekly social media report. Use only these numbers. Do not invent metrics.
Brand: ${brand.name} (${brand.niche})
Period: ${periodStart} to ${periodEnd}
Reach: ${n(metrics.reach)}
Impressions: ${n(metrics.impressions)}
Engagements: ${n(metrics.engagements)}
Engagement rate: ${pct(metrics.engagementRate)}
Clicks: ${n(metrics.clicks)}
Follower growth: ${n(metrics.followerGrowth)}
Platforms: ${metrics.byPlatform.map((p) => `${p.platform} reach ${n(p.reach)} ER ${pct(p.engagementRate)}`).join("; ")}
Return one insight per line, no bullets, no markdown.`,
    0.4
  );
  if (ai.trim()) {
    const lines = ai
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (lines.length >= 2) insights = [...lines, fallbackInsights[3]];
  }

  return {
    brandName: brand.name,
    niche: brand.niche,
    periodStart,
    periodEnd,
    days,
    metrics,
    topPosts: topPosts.map((post) => ({
      title: post.title,
      comments: Number(post.comments),
      platforms: post.platforms,
    })),
    commentTotal: Number(commentTotalRow?.c ?? 0),
    insights,
  };
}

function reportDir() {
  const dir = path.join(process.cwd(), "storage", "reports");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function addKpiBox(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  label: string,
  value: string,
  accent: string
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: 2.85,
    h: 1.35,
    fill: { color: "FFFFFF" },
    line: { color: "E7E2D8", pt: 1 },
    rectRadius: 0.08,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 0.08,
    h: 1.35,
    fill: { color: accent },
    line: { color: accent },
  });
  slide.addText(label.toUpperCase(), {
    x: x + 0.25,
    y: y + 0.16,
    w: 2.4,
    h: 0.3,
    fontSize: 9,
    bold: true,
    color: "6B665C",
    charSpacing: 1.2,
  });
  slide.addText(value, {
    x: x + 0.25,
    y: y + 0.46,
    w: 2.4,
    h: 0.6,
    fontSize: 25,
    bold: true,
    color: "111318",
    fontFace: "Georgia",
  });
}

export async function generateReport(brandId: string, days: number) {
  const data = await buildReportData(brandId, days);
  const dir = reportDir();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const base = `${brandId}-${days}d-${stamp}`;
  const pptxPath = path.join("storage", "reports", `${base}.pptx`);
  const pdfPath = path.join("storage", "reports", `${base}.pdf`);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Studio Hub";
  pptx.company = "Studio Hub";
  pptx.subject = `${data.brandName} performance report`;
  pptx.title = `${data.brandName} · ${data.periodStart} to ${data.periodEnd}`;

  const cover = pptx.addSlide();
  cover.background = { color: "111318" };
  cover.addText("STUDIO HUB / PERFORMANCE", {
    x: 0.7,
    y: 0.6,
    w: 8,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: "FF5A36",
    charSpacing: 2,
  });
  cover.addText(data.brandName, {
    x: 0.7,
    y: 2.1,
    w: 10.5,
    h: 1.2,
    fontSize: 44,
    bold: true,
    color: "FFFFFF",
    fontFace: "Georgia",
  });
  cover.addText(`${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}`, {
    x: 0.7,
    y: 3.35,
    w: 8,
    h: 0.4,
    fontSize: 15,
    color: "C9C4B8",
  });
  cover.addText(data.niche, {
    x: 0.7,
    y: 4.2,
    w: 9,
    h: 0.4,
    fontSize: 12,
    color: "8F8A80",
  });
  cover.addShape(pptx.ShapeType.rect, {
    x: 0.7,
    y: 5.05,
    w: 2.4,
    h: 0.06,
    fill: { color: "FF5A36" },
    line: { color: "FF5A36" },
  });
  cover.addText(`${data.days}-day performance snapshot`, {
    x: 0.7,
    y: 5.25,
    w: 8,
    h: 0.4,
    fontSize: 12,
    color: "C9C4B8",
  });

  const kpiSlide = pptx.addSlide();
  kpiSlide.background = { color: "F7F5F0" };
  kpiSlide.addText("The numbers", {
    x: 0.6,
    y: 0.45,
    w: 8,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: "111318",
    fontFace: "Georgia",
  });
  kpiSlide.addText(`${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}`, {
    x: 0.6,
    y: 1.02,
    w: 8,
    h: 0.3,
    fontSize: 11,
    color: "6B665C",
  });
  const kpis = [
    ["Reach", n(data.metrics.reach), "FF5A36"],
    ["Engagements", n(data.metrics.engagements), "0FA3A3"],
    ["Engagement rate", pct(data.metrics.engagementRate), "C98B3C"],
    ["Follower growth", `+${n(data.metrics.followerGrowth)}`, "111318"],
  ] as const;
  kpis.forEach((kpi, index) => {
    addKpiBox(pptx, kpiSlide, 0.6 + index * 3.05, 1.65, kpi[0], kpi[1], kpi[2]);
  });
  kpiSlide.addText(
    `Impressions ${n(data.metrics.impressions)} · Clicks ${n(data.metrics.clicks)} · Comments captured ${n(data.commentTotal)}`,
    {
      x: 0.6,
      y: 3.45,
      w: 12,
      h: 0.4,
      fontSize: 12,
      color: "4A463E",
    }
  );

  const platformSlide = pptx.addSlide();
  platformSlide.background = { color: "FFFFFF" };
  platformSlide.addText("Channel performance", {
    x: 0.6,
    y: 0.45,
    w: 9,
    h: 0.6,
    fontSize: 26,
    bold: true,
    color: "111318",
    fontFace: "Georgia",
  });
  const tableRows = [
    [
      { text: "Channel", options: { bold: true } },
      { text: "Followers", options: { bold: true } },
      { text: "Reach", options: { bold: true } },
      { text: "Engagements", options: { bold: true } },
      { text: "ER", options: { bold: true } },
      { text: "Clicks", options: { bold: true } },
    ],
    ...data.metrics.byPlatform.map((platform) => [
      platform.platform,
      n(platform.followers),
      n(platform.reach),
      n(platform.engagements),
      pct(platform.engagementRate),
      n(platform.clicks),
    ]),
  ];
  platformSlide.addTable(tableRows as never, {
    x: 0.6,
    y: 1.35,
    w: 12,
    border: { pt: 1, color: "E7E2D8" },
    fill: { color: "FFFFFF" },
    color: "111318",
    fontSize: 11,
    rowH: 0.38,
    margin: 0.08,
  });

  const postSlide = pptx.addSlide();
  postSlide.background = { color: "F7F5F0" };
  postSlide.addText("What moved", {
    x: 0.6,
    y: 0.45,
    w: 8,
    h: 0.6,
    fontSize: 26,
    bold: true,
    color: "111318",
    fontFace: "Georgia",
  });
  postSlide.addText("Top posts by conversation", {
    x: 0.6,
    y: 1.0,
    w: 8,
    h: 0.3,
    fontSize: 11,
    color: "6B665C",
  });
  const postRows = [
    [
      { text: "Post", options: { bold: true } },
      { text: "Platforms", options: { bold: true } },
      { text: "Comments", options: { bold: true } },
    ],
    ...(data.topPosts.length
      ? data.topPosts.map((post) => [post.title, post.platforms || "—", n(post.comments)])
      : [["No published posts in this period yet", "—", "0"]]),
  ];
  postSlide.addTable(postRows as never, {
    x: 0.6,
    y: 1.45,
    w: 12,
    border: { pt: 1, color: "E7E2D8" },
    fill: { color: "FFFFFF" },
    color: "111318",
    fontSize: 11,
    rowH: 0.45,
    margin: 0.08,
  });

  const insightSlide = pptx.addSlide();
  insightSlide.background = { color: "111318" };
  insightSlide.addText("What we learned", {
    x: 0.7,
    y: 0.55,
    w: 9,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: "FFFFFF",
    fontFace: "Georgia",
  });
  insightSlide.addText(
    data.insights.map((insight) => `• ${insight}`).join("\n\n"),
    {
      x: 0.7,
      y: 1.55,
      w: 11.5,
      h: 3.5,
      fontSize: 15,
      color: "E8E4DA",
      lineSpacingMultiple: 1.3,
      valign: "top",
    }
  );
  insightSlide.addText("Next period", {
    x: 0.7,
    y: 5.25,
    w: 4,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: "FF5A36",
    charSpacing: 1.5,
  });
  insightSlide.addText(
    "Keep the education-first cadence. Test one founder-led video. Review prep lead time for video posts.",
    {
      x: 0.7,
      y: 5.55,
      w: 11.5,
      h: 0.5,
      fontSize: 12,
      color: "C9C4B8",
    }
  );

  await pptx.writeFile({ fileName: path.join(process.cwd(), pptxPath) });

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const stream = fs.createWriteStream(path.join(process.cwd(), pdfPath));
    doc.pipe(stream);
    const width = doc.page.width;
    const margin = 48;

    doc.rect(0, 0, width, 842).fill("#F7F5F0");
    doc.rect(0, 0, width, 190).fill("#111318");
    doc.fillColor("#FF5A36").font("Helvetica-Bold").fontSize(9).text("STUDIO HUB / PERFORMANCE", margin, 42, { characterSpacing: 2 });
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(30).text(data.brandName, margin, 72, { width: width - margin * 2 });
    doc.fillColor("#C9C4B8").font("Helvetica").fontSize(11).text(`${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)} · ${data.niche}`, margin, 122, { width: width - margin * 2 });

    doc.fillColor("#111318").font("Helvetica-Bold").fontSize(16).text("The numbers", margin, 220);
    const kpis = [
      ["Reach", n(data.metrics.reach)],
      ["Engagements", n(data.metrics.engagements)],
      ["Engagement rate", pct(data.metrics.engagementRate)],
      ["Follower growth", `+${n(data.metrics.followerGrowth)}`],
    ];
    kpis.forEach((kpi, index) => {
      const x = margin + (index % 2) * 255;
      const y = 255 + Math.floor(index / 2) * 82;
      doc.roundedRect(x, y, 235, 64, 6).fill("#FFFFFF").stroke("#E7E2D8");
      doc.fillColor("#6B665C").font("Helvetica-Bold").fontSize(8).text(kpi[0].toUpperCase(), x + 14, y + 13, { characterSpacing: 0.8 });
      doc.fillColor("#111318").font("Helvetica-Bold").fontSize(20).text(kpi[1], x + 14, y + 30);
    });

    let y = 450;
    doc.fillColor("#111318").font("Helvetica-Bold").fontSize(16).text("Channel performance", margin, y);
    y += 28;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6B665C");
    doc.text("CHANNEL", margin, y);
    doc.text("REACH", margin + 140, y);
    doc.text("ENGAGEMENTS", margin + 220, y);
    doc.text("ER", margin + 340, y);
    y += 16;
    for (const platform of data.metrics.byPlatform) {
      doc.font("Helvetica").fontSize(10).fillColor("#111318");
      doc.text(platform.platform, margin, y);
      doc.text(n(platform.reach), margin + 140, y);
      doc.text(n(platform.engagements), margin + 220, y);
      doc.text(pct(platform.engagementRate), margin + 340, y);
      doc.moveTo(margin, y + 15).lineTo(width - margin, y + 15).strokeColor("#E7E2D8").stroke();
      y += 22;
    }

    y += 18;
    doc.fillColor("#111318").font("Helvetica-Bold").fontSize(16).text("What we learned", margin, y);
    y += 26;
    doc.font("Helvetica").fontSize(10).fillColor("#3D392F");
    for (const insight of data.insights) {
      doc.text(`• ${insight}`, margin, y, { width: width - margin * 2, lineGap: 3 });
      y += doc.heightOfString(`• ${insight}`, { width: width - margin * 2 }) + 8;
    }

    doc.fillColor("#6B665C").fontSize(8).text("Generated by Studio Hub. Numbers are pulled from the approved analytics snapshot for this period.", margin, 800, { width: width - margin * 2 });
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const metricsJson = JSON.stringify({
    reach: data.metrics.reach,
    engagements: data.metrics.engagements,
    engagementRate: data.metrics.engagementRate,
    followers: data.metrics.followers,
    clicks: data.metrics.clicks,
    byPlatform: data.metrics.byPlatform,
  });

  const id = crypto.randomUUID();
  const { run } = await import("./db");
  run(
    `INSERT INTO reports (id, brand_id, title, period_start, period_end, metrics_json, pptx_path, pdf_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      brandId,
      `${data.brandName} · ${data.days}-day report`,
      data.periodStart,
      data.periodEnd,
      metricsJson,
      pptxPath,
      pdfPath,
      new Date().toISOString(),
    ]
  );

  logActivity({
    brandId,
    action: "Generated report",
    entity: "report",
    entityId: id,
    detail: `${data.brandName} · ${data.days} days`,
  });

  return { id, pptxPath, pdfPath, data };
}
