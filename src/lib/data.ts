import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { all, get, run } from "./db";
import type {
  ActivityRow,
  Brand,
  BrandFact,
  BrandProfile,
  CommentRow,
  KnowledgeItem,
  MetricRow,
  NotificationRow,
  Post,
  PostVariant,
  ReportRow,
  User,
} from "./types";

export type BrandWithProfile = Brand & { profile: BrandProfile | null };

export function listBrands(): Brand[] {
  return all<Brand>("SELECT * FROM brands ORDER BY created_at ASC");
}

export function getBrand(id: string): Brand | undefined {
  return get<Brand>("SELECT * FROM brands WHERE id = ?", [id]);
}

export function getBrandProfile(brandId: string): BrandProfile | undefined {
  return get<BrandProfile>("SELECT * FROM brand_profiles WHERE brand_id = ?", [brandId]);
}

export function getBrandWithProfile(brandId: string): BrandWithProfile | undefined {
  const brand = getBrand(brandId);
  if (!brand) return undefined;
  return { ...brand, profile: getBrandProfile(brandId) ?? null };
}

export function resolveActiveBrand(brandIdFromCookie?: string): Brand | undefined {
  const brands = listBrands();
  if (brandIdFromCookie) {
    const found = brands.find((brand) => brand.id === brandIdFromCookie);
    if (found) return found;
  }
  return brands[0];
}

export function listUsers(): User[] {
  return all<User>("SELECT * FROM users ORDER BY created_at ASC");
}

export type PostWithPlatforms = Post & { platforms: string | null; variant_count: number };

export function listPosts(brandId: string, limit = 100): PostWithPlatforms[] {
  return all<PostWithPlatforms>(
    `SELECT p.*, group_concat(v.platform) AS platforms, count(v.id) AS variant_count
     FROM posts p
     LEFT JOIN post_variants v ON v.post_id = p.id
     WHERE p.brand_id = ?
     GROUP BY p.id
     ORDER BY coalesce(p.scheduled_at, p.created_at) DESC
     LIMIT ?`,
    [brandId, limit]
  );
}

export function listUpcomingPosts(brandId: string, limit = 8): PostWithPlatforms[] {
  return all<PostWithPlatforms>(
    `SELECT p.*, group_concat(v.platform) AS platforms, count(v.id) AS variant_count
     FROM posts p
     LEFT JOIN post_variants v ON v.post_id = p.id
     WHERE p.brand_id = ? AND p.scheduled_at IS NOT NULL AND p.scheduled_at >= ?
     GROUP BY p.id
     ORDER BY p.scheduled_at ASC
     LIMIT ?`,
    [brandId, new Date().toISOString(), limit]
  );
}

export function listPostsBetween(brandId: string, fromIso: string, toIso: string): PostWithPlatforms[] {
  return all<PostWithPlatforms>(
    `SELECT p.*, group_concat(v.platform) AS platforms, count(v.id) AS variant_count
     FROM posts p
     LEFT JOIN post_variants v ON v.post_id = p.id
     WHERE p.brand_id = ? AND p.scheduled_at IS NOT NULL
       AND p.scheduled_at >= ? AND p.scheduled_at <= ?
     GROUP BY p.id
     ORDER BY p.scheduled_at ASC`,
    [brandId, fromIso, toIso]
  );
}

export function getPost(id: string): Post | undefined {
  return get<Post>("SELECT * FROM posts WHERE id = ?", [id]);
}

export function getPostVariants(postId: string): PostVariant[] {
  return all<PostVariant>(
    "SELECT * FROM post_variants WHERE post_id = ? ORDER BY platform ASC",
    [postId]
  );
}

export function getPostWithVariants(id: string): { post: Post; variants: PostVariant[] } | undefined {
  const post = getPost(id);
  if (!post) return undefined;
  return { post, variants: getPostVariants(id) };
}

export type PostCounts = {
  total: number;
  scheduled: number;
  needsReview: number;
  approved: number;
  published: number;
  overdueDrafts: number;
  ready: number;
};

export function getPostCounts(brandId: string): PostCounts {
  const now = new Date().toISOString();
  const rows = all<{ status: string; c: number }>(
    "SELECT status, count(*) AS c FROM posts WHERE brand_id = ? GROUP BY status",
    [brandId]
  );
  const map = Object.fromEntries(rows.map((row) => [row.status, Number(row.c)]));
  const overdue = get<{ c: number }>(
    `SELECT count(*) AS c FROM posts
     WHERE brand_id = ? AND scheduled_at IS NOT NULL AND scheduled_at < ?
       AND status IN ('draft','needs_review','approved')`,
    [brandId, now]
  );
  return {
    total: Object.values(map).reduce((sum, value) => sum + value, 0),
    scheduled: map.scheduled ?? 0,
    needsReview: map.needs_review ?? 0,
    approved: map.approved ?? 0,
    published: map.published ?? 0,
    overdueDrafts: Number(overdue?.c ?? 0),
    ready: map.ready ?? 0,
  };
}

export function listKnowledge(brandId: string, limit = 100): KnowledgeItem[] {
  return all<KnowledgeItem>(
    "SELECT * FROM knowledge_items WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?",
    [brandId, limit]
  );
}

export function getKnowledge(id: string): KnowledgeItem | undefined {
  return get<KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?", [id]);
}

export function countKnowledge(brandId: string): number {
  const row = get<{ c: number }>(
    "SELECT count(*) AS c FROM knowledge_items WHERE brand_id = ?",
    [brandId]
  );
  return Number(row?.c ?? 0);
}

export function listFacts(brandId: string, includeHistory = false): BrandFact[] {
  if (includeHistory) {
    return all<BrandFact>(
      "SELECT * FROM brand_facts WHERE brand_id = ? ORDER BY created_at DESC",
      [brandId]
    );
  }
  return all<BrandFact>(
    `SELECT * FROM brand_facts
     WHERE brand_id = ? AND status IN ('approved','pending') AND valid_to IS NULL
     ORDER BY status ASC, created_at DESC`,
    [brandId]
  );
}

export function getFact(id: string): BrandFact | undefined {
  return get<BrandFact>("SELECT * FROM brand_facts WHERE id = ?", [id]);
}

export function pendingFactCount(brandId: string): number {
  const row = get<{ c: number }>(
    "SELECT count(*) AS c FROM brand_facts WHERE brand_id = ? AND status = 'pending'",
    [brandId]
  );
  return Number(row?.c ?? 0);
}

export function listComments(brandId: string, limit = 100): CommentRow[] {
  return all<CommentRow>(
    "SELECT * FROM comments WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?",
    [brandId, limit]
  );
}

export function commentCounts(brandId: string): { new: number; escalated: number; total: number } {
  const rows = all<{ status: string; c: number }>(
    "SELECT status, count(*) AS c FROM comments WHERE brand_id = ? GROUP BY status",
    [brandId]
  );
  const map = Object.fromEntries(rows.map((row) => [row.status, Number(row.c)]));
  return {
    new: (map.new ?? 0) + (map.escalated ?? 0),
    escalated: map.escalated ?? 0,
    total: Object.values(map).reduce((sum, value) => sum + value, 0),
  };
}

export function listReports(brandId: string): ReportRow[] {
  return all<ReportRow>(
    "SELECT * FROM reports WHERE brand_id = ? ORDER BY created_at DESC",
    [brandId]
  );
}

export function getReport(id: string): ReportRow | undefined {
  return get<ReportRow>("SELECT * FROM reports WHERE id = ?", [id]);
}

export function listNotifications(userId: string, limit = 12): NotificationRow[] {
  return all<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
}

export function unreadNotificationCount(userId: string): number {
  const row = get<{ c: number }>(
    "SELECT count(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId]
  );
  return Number(row?.c ?? 0);
}

export function listActivity(brandId: string, limit = 12): ActivityRow[] {
  return all<ActivityRow>(
    "SELECT * FROM activity_log WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?",
    [brandId, limit]
  );
}

export type MetricSummary = {
  followers: number;
  reach: number;
  impressions: number;
  engagements: number;
  clicks: number;
  engagementRate: number;
  followerGrowth: number;
  previous: {
    reach: number;
    engagements: number;
    clicks: number;
    engagementRate: number;
  };
  series: Array<{ date: string; reach: number; engagements: number; followers: number }>;
  byPlatform: Array<{
    platform: string;
    followers: number;
    reach: number;
    engagements: number;
    clicks: number;
    engagementRate: number;
  }>;
};

function dateKey(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function getMetricSummary(brandId: string, days = 7): MetricSummary {
  const currentStart = dateKey(-(days - 1));
  const previousStart = dateKey(-(days * 2 - 1));
  const previousEnd = dateKey(-days);
  const currentEnd = dateKey(0);

  const current = all<MetricRow>(
    "SELECT * FROM metrics_daily WHERE brand_id = ? AND date >= ? AND date <= ?",
    [brandId, currentStart, currentEnd]
  );
  const previous = all<MetricRow>(
    "SELECT * FROM metrics_daily WHERE brand_id = ? AND date >= ? AND date <= ?",
    [brandId, previousStart, previousEnd]
  );

  const sum = (rows: MetricRow[], key: keyof MetricRow) =>
    rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

  const currentReach = sum(current, "reach");
  const currentEngagements = sum(current, "engagements");
  const previousReach = sum(previous, "reach");
  const previousEngagements = sum(previous, "engagements");

  const seriesMap = new Map<string, { date: string; reach: number; engagements: number; followers: number }>();
  for (const row of current) {
    const entry = seriesMap.get(row.date) ?? {
      date: row.date,
      reach: 0,
      engagements: 0,
      followers: 0,
    };
    entry.reach += Number(row.reach);
    entry.engagements += Number(row.engagements);
    entry.followers += Number(row.followers);
    seriesMap.set(row.date, entry);
  }

  const platformMap = new Map<
    string,
    { platform: string; followers: number; reach: number; engagements: number; clicks: number }
  >();
  const earliestFollowersByPlatform = new Map<string, number>();
  for (const row of current) {
    const entry = platformMap.get(row.platform) ?? {
      platform: row.platform,
      followers: 0,
      reach: 0,
      engagements: 0,
      clicks: 0,
    };
    entry.followers = Math.max(entry.followers, Number(row.followers));
    entry.reach += Number(row.reach);
    entry.engagements += Number(row.engagements);
    entry.clicks += Number(row.clicks);
    platformMap.set(row.platform, entry);
    const earliest = earliestFollowersByPlatform.get(row.platform);
    if (earliest === undefined || Number(row.followers) < earliest) {
      earliestFollowersByPlatform.set(row.platform, Number(row.followers));
    }
  }

  const latestFollowers = Array.from(platformMap.values()).reduce(
    (total, entry) => total + entry.followers,
    0
  );
  const earliestFollowers = Array.from(earliestFollowersByPlatform.values()).reduce(
    (total, value) => total + value,
    0
  );

  return {
    followers: latestFollowers,
    reach: currentReach,
    impressions: sum(current, "impressions"),
    engagements: currentEngagements,
    clicks: sum(current, "clicks"),
    engagementRate: currentReach ? (currentEngagements / currentReach) * 100 : 0,
    followerGrowth: latestFollowers - earliestFollowers,
    previous: {
      reach: previousReach,
      engagements: previousEngagements,
      clicks: sum(previous, "clicks"),
      engagementRate: previousReach ? (previousEngagements / previousReach) * 100 : 0,
    },
    series: Array.from(seriesMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    byPlatform: Array.from(platformMap.values())
      .map((entry) => ({
        ...entry,
        engagementRate: entry.reach ? (entry.engagements / entry.reach) * 100 : 0,
      }))
      .sort((a, b) => b.reach - a.reach),
  };
}

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "coral" | "amber" | "teal" | "ink";
  label: string;
};

export function getAttentionItems(brandId: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const prep = all<Post>(
    `SELECT * FROM posts
     WHERE brand_id = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?
       AND status IN ('draft','needs_review')
     ORDER BY scheduled_at ASC LIMIT 3`,
    [brandId, soon]
  );
  for (const post of prep) {
    items.push({
      id: `prep-${post.id}`,
      title: post.title,
      detail: "Needs copy or approval before it can go out.",
      href: `/posts/${post.id}`,
      tone: "amber",
      label: "Prep due",
    });
  }

  const overdue = all<Post>(
    `SELECT * FROM posts
     WHERE brand_id = ? AND scheduled_at IS NOT NULL AND scheduled_at < ?
       AND status IN ('draft','needs_review','approved')
     ORDER BY scheduled_at ASC LIMIT 2`,
    [brandId, now.toISOString()]
  );
  for (const post of overdue) {
    items.push({
      id: `overdue-${post.id}`,
      title: post.title,
      detail: "The scheduled time has passed and the post is not out.",
      href: `/posts/${post.id}`,
      tone: "coral",
      label: "Overdue",
    });
  }

  const waiting = all<CommentRow>(
    "SELECT * FROM comments WHERE brand_id = ? AND status IN ('new','escalated') ORDER BY created_at DESC LIMIT 2",
    [brandId]
  );
  if (waiting.length > 0) {
    items.push({
      id: "comments-waiting",
      title: `${waiting.length} comment${waiting.length === 1 ? "" : "s"} waiting`,
      detail: waiting.some((comment) => comment.sentiment === "negative")
        ? "One negative comment is escalated. Reply personally."
        : "Questions and praise are waiting for a reply.",
      href: "/inbox",
      tone: "teal",
      label: "Engagement",
    });
  }

  const pendingFacts = pendingFactCount(brandId);
  if (pendingFacts > 0) {
    items.push({
      id: "facts-pending",
      title: `${pendingFacts} fact${pendingFacts === 1 ? "" : "s"} to review`,
      detail: "New information is waiting to be approved into the Brand Brain.",
      href: "/knowledge?factStatus=pending",
      tone: "ink",
      label: "Knowledge",
    });
  }

  return items;
}

export function getDashboardData(brandId: string, userId: string) {
  const metrics = getMetricSummary(brandId, 7);
  return {
    metrics,
    counts: getPostCounts(brandId),
    knowledgeCount: countKnowledge(brandId),
    comments: commentCounts(brandId),
    upcoming: listUpcomingPosts(brandId, 5),
    attention: getAttentionItems(brandId),
    notifications: listNotifications(userId, 6),
    activity: listActivity(brandId, 5),
    facts: listFacts(brandId).slice(0, 4),
  };
}

export type RetentionStats = {
  dbSize: number;
  rows: Array<{ table: string; count: number }>;
  prunable: Array<{ key: string; label: string; count: number; note: string }>;
};

export function getRetentionStats(): RetentionStats {
  const tables = [
    "users",
    "brands",
    "knowledge_items",
    "brand_facts",
    "posts",
    "post_variants",
    "comments",
    "notifications",
    "metrics_daily",
    "reports",
    "activity_log",
    "sessions",
  ];
  const rows = tables.map((table) => {
    const row = get<{ c: number }>(`SELECT count(*) AS c FROM ${table}`);
    return { table, count: Number(row?.c ?? 0) };
  });

  const now = new Date();
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff13m = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const prunable = [
    {
      key: "notifications",
      label: "Notifications older than 90 days",
      count: Number(
        get<{ c: number }>("SELECT count(*) AS c FROM notifications WHERE created_at < ?", [cutoff90])?.c ?? 0
      ),
      note: "Safe to delete. Delivery history is not business-critical.",
    },
    {
      key: "sessions",
      label: "Expired sessions",
      count: Number(
        get<{ c: number }>("SELECT count(*) AS c FROM sessions WHERE expires_at < ?", [now.toISOString()])?.c ?? 0
      ),
      note: "Safe to delete. Users simply sign in again.",
    },
    {
      key: "comments",
      label: "Comments older than 12 months",
      count: Number(
        get<{ c: number }>("SELECT count(*) AS c FROM comments WHERE created_at < ?", [cutoff365])?.c ?? 0
      ),
      note: "Archive first if the client needs a full engagement history.",
    },
    {
      key: "metrics",
      label: "Raw daily metrics older than 13 months",
      count: Number(
        get<{ c: number }>("SELECT count(*) AS c FROM metrics_daily WHERE date < ?", [cutoff13m])?.c ?? 0
      ),
      note: "Monthly aggregates should be kept before pruning raw rows.",
    },
  ];

  let dbSize = 0;
  try {
    dbSize = fs.statSync(path.join(process.cwd(), "data", "app.db")).size;
  } catch {
    dbSize = 0;
  }

  return { dbSize, rows, prunable };
}

export function getSetting(key: string, fallback = ""): string {
  const row = get<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  run(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

export function logActivity(input: {
  brandId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string;
}) {
  run(
    `INSERT INTO activity_log (id, brand_id, user_id, action, entity, entity_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.brandId ?? null,
      input.userId ?? null,
      input.action,
      input.entity,
      input.entityId ?? null,
      input.detail ?? "",
      new Date().toISOString(),
    ]
  );
}
