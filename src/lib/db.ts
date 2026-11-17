import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { hashPassword } from "./password";

type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
};

const globalForDb = globalThis as unknown as { __studioHubDb?: SqliteDb };

function createDb(): SqliteDb {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, "app.db");
  // Resolve the builtin at runtime so the bundler does not try to rewrite it.
  const getBuiltinModule = (
    process as unknown as { getBuiltinModule?: (id: string) => unknown }
  ).getBuiltinModule;
  if (!getBuiltinModule) {
    throw new Error("This app needs Node.js 22.3+ for the built-in node:sqlite module.");
  }
  const { DatabaseSync } = getBuiltinModule("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDb;
  };
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  seed(db);
  return db;
}

export function getDb(): SqliteDb {
  if (!globalForDb.__studioHubDb) {
    globalForDb.__studioHubDb = createDb();
  }
  return globalForDb.__studioHubDb;
}

export function run(sql: string, params: unknown[] = []) {
  return getDb().prepare(sql).run(...params);
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const rows = getDb().prepare(sql).all(...params) as Array<Record<string, unknown>>;
  // node:sqlite returns null-prototype objects; React Server Components only
  // serialise plain objects to Client Components.
  return rows.map((row) => ({ ...row })) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const row = getDb().prepare(sql).get(...params) as Record<string, unknown> | undefined;
  return row ? ({ ...row } as T) : undefined;
}

function migrate(db: SqliteDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      avatar_color TEXT NOT NULL DEFAULT '#FF5A36',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      niche TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
      color TEXT NOT NULL DEFAULT '#FF5A36',
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      brand_id TEXT PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
      tone TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      pillars TEXT NOT NULL DEFAULT '[]',
      offers TEXT NOT NULL DEFAULT '',
      banned_claims TEXT NOT NULL DEFAULT '',
      hashtags TEXT NOT NULL DEFAULT '',
      ctas TEXT NOT NULL DEFAULT '',
      competitors TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_facts (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      value TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      confidence REAL NOT NULL DEFAULT 0.7,
      source_item_id TEXT,
      valid_from TEXT NOT NULL,
      valid_to TEXT,
      supersedes_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_items (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'needs_review',
      raw_text TEXT NOT NULL DEFAULT '',
      file_path TEXT,
      mime_type TEXT,
      size INTEGER NOT NULL DEFAULT 0,
      transcript TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      facts_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      idea TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      approved_by TEXT,
      approved_at TEXT,
      share_token TEXT UNIQUE,
      prep_lead_hours INTEGER NOT NULL DEFAULT 48,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_variants (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      hashtags TEXT NOT NULL DEFAULT '',
      first_comment TEXT NOT NULL DEFAULT '',
      media_path TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, platform)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      dedupe_key TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
      ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      post_id TEXT,
      platform TEXT NOT NULL,
      author TEXT NOT NULL,
      author_handle TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL,
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      status TEXT NOT NULL DEFAULT 'new',
      reply_draft TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics_daily (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      date TEXT NOT NULL,
      followers INTEGER NOT NULL DEFAULT 0,
      reach INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      engagements INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      UNIQUE(brand_id, platform, date)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      metrics_json TEXT NOT NULL DEFAULT '{}',
      pptx_path TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      brand_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'image',
      width INTEGER,
      height INTEGER,
      duration_seconds REAL,
      alt_text TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      checksum TEXT NOT NULL DEFAULT '',
      storage_provider TEXT NOT NULL DEFAULT 'local',
      upload_status TEXT NOT NULL DEFAULT 'ready',
      upload_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_media (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_handle TEXT NOT NULL DEFAULT '',
      page_id TEXT,
      scopes TEXT NOT NULL DEFAULT '',
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      token_expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'connected',
      capabilities_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(brand_id, platform, external_id)
    );

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      code_verifier TEXT,
      redirect_to TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS publish_attempts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      social_account_id TEXT,
      status TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 1,
      external_id TEXT,
      external_url TEXT,
      error TEXT,
      request_json TEXT NOT NULL DEFAULT '{}',
      response_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deletion_requests (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'meta',
      external_user_id TEXT,
      confirmation_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS virality_analyses (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'processing',
      stage TEXT NOT NULL DEFAULT 'saving-source',
      source_type TEXT NOT NULL DEFAULT 'upload',
      source_url TEXT,
      source_title TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT '',
      creator TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      duration_seconds REAL,
      width INTEGER,
      height INTEGER,
      mime_type TEXT,
      file_path TEXT,
      poster_path TEXT,
      frames_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      teardown_json TEXT,
      adaptation_json TEXT,
      similarity_json TEXT,
      mode TEXT,
      confidence TEXT,
      error TEXT,
      source_deleted_at TEXT,
      test_status TEXT NOT NULL DEFAULT 'planned',
      test_a_value REAL,
      test_b_value REAL,
      test_winner TEXT,
      test_notes TEXT NOT NULL DEFAULT '',
      test_started_at TEXT,
      test_completed_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_profiles (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'uploadpost',
      profile_username TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      connected_platforms_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'connected',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(brand_id, provider),
      UNIQUE(provider, profile_username)
    );

    CREATE TABLE IF NOT EXISTS provider_usage (
      provider TEXT NOT NULL,
      period TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      limit_value INTEGER NOT NULL DEFAULT 10,
      last_reset TEXT,
      exhausted INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(provider, period)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_brand_date ON posts(brand_id, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_knowledge_brand ON knowledge_items(brand_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_brand ON comments(brand_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_metrics_brand_date ON metrics_daily(brand_id, date);
    CREATE INDEX IF NOT EXISTS idx_assets_brand ON assets(brand_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id, position);
    CREATE INDEX IF NOT EXISTS idx_social_accounts_brand ON social_accounts(brand_id, platform);
    CREATE INDEX IF NOT EXISTS idx_publish_attempts_post ON publish_attempts(post_id, platform);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);
    CREATE INDEX IF NOT EXISTS idx_virality_brand ON virality_analyses(brand_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_provider_profiles_brand ON provider_profiles(brand_id, provider);
  `);

  // Non-destructive upgrades for databases created before media uploads existed.
  addColumnIfMissing(db, "assets", "storage_provider", "TEXT NOT NULL DEFAULT 'local'");
  addColumnIfMissing(db, "assets", "upload_status", "TEXT NOT NULL DEFAULT 'ready'");
  addColumnIfMissing(db, "assets", "upload_id", "TEXT");

  // Test log for a Virality Lab brief. A brief can be planned, running or
  // complete; the result feeds the per-brand test-outcome summary.
  addColumnIfMissing(db, "virality_analyses", "test_status", "TEXT NOT NULL DEFAULT 'planned'");
  addColumnIfMissing(db, "virality_analyses", "test_a_value", "REAL");
  addColumnIfMissing(db, "virality_analyses", "test_b_value", "REAL");
  addColumnIfMissing(db, "virality_analyses", "test_winner", "TEXT");
  addColumnIfMissing(db, "virality_analyses", "test_notes", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "virality_analyses", "test_started_at", "TEXT");
  addColumnIfMissing(db, "virality_analyses", "test_completed_at", "TEXT");
}

function addColumnIfMissing(db: SqliteDb, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
  if (!columns.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seed(db: SqliteDb) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number } | undefined;
  if (count && Number(count.c) > 0) return;

  const now = new Date();
  const iso = (date: Date) => date.toISOString();
  const at = (days: number, hour = 9, minute = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const insert = (sql: string, params: unknown[]) => db.prepare(sql).run(...params);

  const ownerId = "user-owner";
  const managerId = "user-manager";
  insert(
    `INSERT INTO users (id, name, email, password_hash, role, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, "Amara Okafor", "owner@studio.local", hashPassword("password123"), "owner", "#FF5A36", iso(now)]
  );
  insert(
    `INSERT INTO users (id, name, email, password_hash, role, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [managerId, "Tunde Bello", "tunde@studio.local", hashPassword("password123"), "manager", "#0FA3A3", iso(now)]
  );

  const brands = [
    {
      id: "brand-lumen",
      name: "Lumen Skin",
      handle: "@lumenskin",
      niche: "Clean barrier skincare",
      timezone: "Africa/Lagos",
      color: "#FF5A36",
    },
    {
      id: "brand-copper",
      name: "Copper & Co",
      handle: "@copperandco",
      niche: "Modern Nigerian jewellery",
      timezone: "Africa/Lagos",
      color: "#C98B3C",
    },
    {
      id: "brand-northstar",
      name: "Northstar Fit",
      handle: "@northstarfit",
      niche: "Strength training for busy people",
      timezone: "Africa/Lagos",
      color: "#0FA3A3",
    },
  ];

  for (const brand of brands) {
    insert(
      `INSERT INTO brands (id, name, handle, niche, timezone, color, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [brand.id, brand.name, brand.handle, brand.niche, brand.timezone, brand.color, iso(now), ownerId]
    );
  }

  const profiles: Array<[string, string, string, string, string, string, string, string, string, string]> = [
    [
      "brand-lumen",
      "Warm, expert, never clinical. Short sentences. Speaks like a knowledgeable friend who happens to be a formulator.",
      "Women 24–38 in Lagos and Abuja with sensitive, reactive skin. Busy professionals who want a simple routine that works.",
      JSON.stringify(["Routine education", "Myth-busting", "Customer stories", "Founder POV", "Product drops"]),
      "Barrier Repair Serum, Gentle Cleanser, Night Cream, Discovery Set",
      "cures eczema, dermatologist-approved, 100% natural, permanent results",
      "#LumenSkin #BarrierCare #SkinMinimalism #LagosSkincare",
      "Save this for tonight. Send this to a friend. Shop the routine.",
      "GlowLab, Aurelia Skin, The Ordinary",
      "Always disclose #ad on paid partnerships. Avoid before/after claims. Never promise medical outcomes.",
    ],
    [
      "brand-copper",
      "Bold, playful, a little nostalgic. Celebrates Nigerian craft without being traditional.",
      "Women 22–40 who buy statement pieces for weddings, work and everything between.",
      JSON.stringify(["New drops", "Styling", "Behind the craft", "Customer features", "Care guides"]),
      "The Ada Hoop, Ile Studs, Lagos Cuff, Bridal edit",
      "solid gold, hypoallergenic, lifetime guarantee",
      "#CopperAndCo #NaijaCraft #StatementEarrings #LagosFashion",
      "Tag your wedding squad. Save for your next event. Send us a DM to style.",
      "Omi Studio, Maki Jewellery",
      "Never claim solid gold unless verified per SKU. Always credit the artisan.",
    ],
    [
      "brand-northstar",
      "Direct, encouraging, no fitness clichés. Practical coaching for people with real schedules.",
      "Professionals 28–45 in Lagos who want to get strong without living in the gym.",
      JSON.stringify(["Training truth", "Form first", "Member wins", "Coach notes", "Programme launches"]),
      "12-week Strength Base, Kettlebell 101, Online coaching",
      "guaranteed 10kg loss, fixes back pain, no injury risk",
      "#NorthstarFit #StrengthForLife #TrainSmart #LagosFitness",
      "Start where you are. Book a free intro. Share this with your gym partner.",
      "Pulse Lab, The Gym Lagos",
      "Avoid body-shaming. Do not promise weight loss. Use inclusive language.",
    ],
  ];

  for (const p of profiles) {
    insert(
      `INSERT INTO brand_profiles
       (brand_id, tone, audience, pillars, offers, banned_claims, hashtags, ctas, competitors, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...p, iso(now)]
    );
  }

  const facts: Array<[string, string, string, string, string, string, string | null, string | null, string]> = [
    ["fact-lumen-price", "brand-lumen", "Retail price", "₦25,000 for the 30ml Barrier Repair Serum", "approved", "0.98", at(-300), null, at(-300)],
    ["fact-lumen-hero", "brand-lumen", "Hero product", "Barrier Repair Serum", "approved", "0.99", at(-300), null, at(-300)],
    ["fact-lumen-audience", "brand-lumen", "Primary audience", "Women 24–38 in Lagos and Abuja with sensitive skin", "approved", "0.95", at(-300), null, at(-300)],
    ["fact-lumen-offer", "brand-lumen", "Current offer", "Black Friday: 20% off the Discovery Set, limited to 200 units", "pending", "0.82", "knowledge-lumen-voice", null, at(-2)],
    ["fact-copper-price", "brand-copper", "Retail price", "₦18,500 for the Ada Hoop", "approved", "0.97", at(-240), null, at(-240)],
    ["fact-copper-hero", "brand-copper", "Hero product", "The Ada Hoop", "approved", "0.99", at(-240), null, at(-240)],
    ["fact-northstar-price", "brand-northstar", "Programme price", "₦85,000 for the 12-week Strength Base programme", "approved", "0.96", at(-180), null, at(-180)],
    ["fact-northstar-hero", "brand-northstar", "Signature programme", "12-week Strength Base", "approved", "0.99", at(-180), null, at(-180)],
  ];

  for (const [id, brandId, subject, value, status, confidence, validFrom, validTo, createdAt] of facts) {
    insert(
      `INSERT INTO brand_facts
       (id, brand_id, subject, value, status, confidence, source_item_id, valid_from, valid_to, supersedes_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [id, brandId, subject, value, status, Number(confidence), null, validFrom, validTo, createdAt]
    );
  }

  const knowledge: Array<{
    id: string;
    brandId: string;
    type: string;
    title: string;
    source: string;
    status: string;
    rawText: string;
    transcript: string;
    summary: string;
    facts: unknown[];
    daysAgo: number;
  }> = [
    {
      id: "knowledge-lumen-guide",
      brandId: "brand-lumen",
      type: "note",
      title: "Brand voice & tone guide",
      source: "NotebookLM export · pasted",
      status: "approved",
      rawText:
        "Lumen Skin sounds like a smart friend who formulates skincare, not a clinic. We use short sentences, warm directness and zero fear-mongering. We explain the why, not just the what. We never promise cures or permanent results. We say 'your barrier' instead of 'your skin problem'. We love a good myth-busting hook. Every paid partnership carries #ad. Customer stories are always told with permission and without before/after claims. The hero product is Barrier Repair Serum. The current retail price is ₦25,000 for 30ml.",
      transcript: "",
      summary:
        "Warm, expert, plain-spoken voice. Avoid medical promises. Hero product is Barrier Repair Serum at ₦25,000. Always disclose paid partnerships.",
      facts: [
        { subject: "Tone", value: "Warm expert friend; short sentences; no fear-mongering", confidence: 0.95 },
        { subject: "Hero product", value: "Barrier Repair Serum", confidence: 0.99 },
      ],
      daysAgo: 12,
    },
    {
      id: "knowledge-lumen-november",
      brandId: "brand-lumen",
      type: "file",
      title: "November campaign brief.pdf",
      source: "Uploaded PDF",
      status: "approved",
      rawText:
        "November theme: 'Less, but better'. Content pillars: routine education, myth-busting, customer stories, founder POV, product drops. Key dates: 8 Nov restock, 15 Nov customer story series, 22 Nov Black Friday teaser, 29 Nov Black Friday. The Black Friday offer is 20% off the Discovery Set, limited to 200 units. Primary CTA: save this for tonight. Secondary CTA: shop the routine. Avoid discount-led creative for the first two weeks; lead with education.",
      transcript: "",
      summary:
        "November is 'Less, but better'. Education-first until 22 Nov, then Black Friday. 20% off the Discovery Set, 200 units.",
      facts: [
        { subject: "November theme", value: "Less, but better", confidence: 0.9 },
        { subject: "Black Friday offer", value: "20% off the Discovery Set, limited to 200 units", confidence: 0.85 },
      ],
      daysAgo: 6,
    },
    {
      id: "knowledge-lumen-voice",
      brandId: "brand-lumen",
      type: "voice",
      title: "WhatsApp voice note · price update",
      source: "WhatsApp voice note · 1:42",
      status: "needs_review",
      rawText: "",
      transcript:
        "Hey, quick update for Lumen. From the first of November the 30ml Barrier Repair Serum is thirty thousand naira, not twenty-five. The Discovery Set stays at forty-five thousand. Also, please stop saying dermatologist-approved because we don't have that certification yet. Use 'formulated with dermatology input' instead. And the Black Friday teaser should go live on the twenty-second, not the twentieth.",
      summary:
        "New price ₦30,000 for the 30ml serum; Discovery Set stays ₦45,000. Stop using 'dermatologist-approved'. Black Friday teaser moves to 22 Nov.",
      facts: [
        { subject: "Retail price", value: "₦30,000 for the 30ml Barrier Repair Serum", confidence: 0.95 },
        { subject: "Discovery Set price", value: "₦45,000", confidence: 0.9 },
        { subject: "Banned claim", value: "Do not use 'dermatologist-approved'; use 'formulated with dermatology input'", confidence: 0.9 },
        { subject: "Black Friday teaser date", value: "22 November", confidence: 0.88 },
      ],
      daysAgo: 2,
    },
    {
      id: "knowledge-copper-launch",
      brandId: "brand-copper",
      type: "url",
      title: "Vogue: statement earrings are back",
      source: "https://example.com/vogue-statement-earrings",
      status: "approved",
      rawText:
        "Statement earrings are having a moment again, with sculptural gold and nostalgic hoops leading the trend. Nigerian designers are reinterpreting traditional craft for modern weddings and workwear. The strongest hooks are 'one earring, three looks' and 'the wedding guest edit'.",
      transcript: "",
      summary: "Sculptural gold hoops and 'one earring, three looks' are trending. Good hook for wedding-season content.",
      facts: [{ subject: "Trend", value: "Sculptural gold hoops for wedding season", confidence: 0.8 }],
      daysAgo: 3,
    },
    {
      id: "knowledge-northstar-notes",
      brandId: "brand-northstar",
      type: "note",
      title: "Coach call notes · November",
      source: "Pasted note",
      status: "approved",
      rawText:
        "Members love form-first content and short coach notes. The 12-week Strength Base programme is the hero offer at ₦85,000. Avoid before/after photos and weight-loss promises. Best performing hooks: 'You don't need more motivation, you need a smaller first step' and 'Three cues for a better deadlift'. The next intake opens 18 November.",
      transcript: "",
      summary: "Form-first content wins. Strength Base is the hero programme at ₦85,000. Next intake 18 Nov. Avoid weight-loss promises.",
      facts: [
        { subject: "Next intake", value: "18 November", confidence: 0.9 },
        { subject: "Hero programme", value: "12-week Strength Base at ₦85,000", confidence: 0.95 },
      ],
      daysAgo: 8,
    },
  ];

  for (const item of knowledge) {
    insert(
      `INSERT INTO knowledge_items
       (id, brand_id, type, title, source, status, raw_text, file_path, mime_type, size, transcript, summary, facts_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.brandId,
        item.type,
        item.title,
        item.source,
        item.status,
        item.rawText,
        item.transcript,
        item.summary,
        JSON.stringify(item.facts),
        ownerId,
        at(-item.daysAgo, 10),
      ]
    );
  }

  const postSeeds: Array<{
    id: string;
    brandId: string;
    title: string;
    idea: string;
    status: string;
    date: string | null;
    variants: Array<{ platform: string; caption: string; hashtags: string; firstComment: string }>;
  }> = [
    {
      id: "post-lumen-night",
      brandId: "brand-lumen",
      title: "The 3-step night routine",
      idea: "Carousel: cleanse, serum, seal. Calm, educational, save-worthy.",
      status: "published",
      date: at(-1, 18, 30),
      variants: [
        {
          platform: "instagram",
          caption:
            "Three steps. That's the whole routine.\n\nCleanse gently. Press in the Barrier Repair Serum. Seal with Night Cream. No ten-step circus, no stinging, no 'purge'.\n\nYour barrier does not need more. It needs less, done consistently.",
          hashtags: "#LumenSkin #BarrierCare #SkinMinimalism #LagosSkincare",
          firstComment: "Which step is hardest for you to keep consistent? Tell us below 👇",
        },
        {
          platform: "facebook",
          caption:
            "A simple night routine for sensitive skin: cleanse, serum, seal. That's it. The Barrier Repair Serum is the step that does the heavy lifting.",
          hashtags: "#LumenSkin #BarrierCare",
          firstComment: "Drop your skin type below and we'll tell you where to start.",
        },
        {
          platform: "tiktok",
          caption:
            "POV: your skin is begging you to stop doing the most. Three steps, every night. #BarrierCare",
          hashtags: "#SkinTok #LumenSkin #BarrierRepair",
          firstComment: "Part two: what to do when your skin stings. Follow so you don't miss it.",
        },
      ],
    },
    {
      id: "post-lumen-myth",
      brandId: "brand-lumen",
      title: "Barrier repair myth-busting",
      idea: "Reel: 3 myths about 'purging' and why stinging is not a sign it's working.",
      status: "scheduled",
      date: at(0, 19, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "If it stings, it is not 'working'. It is your barrier asking you to stop.\n\nThree myths we need to retire:\n1. Purging is normal for every product.\n2. Natural means safe.\n3. More actives means faster results.\n\nYou deserve a routine that feels calm.",
          hashtags: "#BarrierCare #SkinMinimalism #LumenSkin #SkincareMyths",
          firstComment: "Myth 2 is the one that gets people every time. Which myth did you believe?",
        },
        {
          platform: "linkedin",
          caption:
            "The skincare industry sells intensity. Your barrier needs consistency.\n\nThree myths we are retiring this month: purging is normal, natural is always safe, and more actives means faster results. The best routine is the one your skin can tolerate long enough to see results.",
          hashtags: "#Skincare #BarrierHealth #ConsumerEducation",
          firstComment: "What is the most persistent skincare myth you hear from clients?",
        },
      ],
    },
    {
      id: "post-lumen-founder",
      brandId: "brand-lumen",
      title: "Founder story: why we started",
      idea: "Talking-head reel. Amara explains the formulation gap she kept seeing.",
      status: "needs_review",
      date: at(1, 12, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "I started Lumen because I was tired of being sold fear.\n\nEvery aisle promised to fix me. Very few products respected my barrier. So we made one serum, then a routine around it, and we kept the promises small enough to keep.\n\nLess, but better.",
          hashtags: "#LumenSkin #FounderStory #BarrierCare",
          firstComment: "What made you simplify your routine? We read every reply.",
        },
        {
          platform: "tiktok",
          caption:
            "The skincare industry sells fear. We built the opposite. #FounderStory #LumenSkin",
          hashtags: "#SkinTok #FounderStory",
          firstComment: "Ask us anything about the formula. We'll answer in the replies.",
        },
        {
          platform: "youtube",
          caption:
            "Why we started Lumen Skin | A founder note on doing less, better\n\nIn this short video, Amara explains the formulation gap she kept seeing and the three principles behind Lumen's routine.",
          hashtags: "#LumenSkin #BarrierCare",
          firstComment: "If you have a question about the serum, leave it here and we'll pin the answer.",
        },
      ],
    },
    {
      id: "post-lumen-glow",
      brandId: "brand-lumen",
      title: "November glow challenge",
      idea: "Week-long story series with daily prompts and a saveable checklist.",
      status: "approved",
      date: at(3, 9, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "One week. One small habit. A calmer barrier.\n\nJoin the November Glow Challenge: each day, one tiny routine upgrade. No buying anything new. No 5am alarms. Just consistency.\n\nSave this and come back tomorrow for day one.",
          hashtags: "#LumenSkin #GlowChallenge #BarrierCare #SkinMinimalism",
          firstComment: "Tap the bookmark so you don't lose the challenge. Day one drops tomorrow.",
        },
        {
          platform: "facebook",
          caption:
            "Join the November Glow Challenge: one small routine upgrade each day for seven days. No new products required.",
          hashtags: "#LumenSkin #GlowChallenge",
          firstComment: "Comment 'IN' and we'll tag you on day one.",
        },
      ],
    },
    {
      id: "post-lumen-ada",
      brandId: "brand-lumen",
      title: "Customer spotlight: Ada",
      idea: "Customer story with permission. No before/after. Focus on routine consistency.",
      status: "draft",
      date: at(5, 17, 30),
      variants: [
        {
          platform: "instagram",
          caption:
            "Ada had a drawer full of half-used bottles. Now she has three steps and a routine she actually finishes.\n\n'I stopped chasing the next thing and started finishing the thing in front of me.'\n\nShared with permission. No filters, no before/after claims.",
          hashtags: "#LumenSkin #CustomerStory #BarrierCare",
          firstComment: "What is the one product you keep repurchasing?",
        },
      ],
    },
    {
      id: "post-lumen-bf",
      brandId: "brand-lumen",
      title: "Black Friday teaser",
      idea: "Teaser for 20% off the Discovery Set, 200 units. Education-first lead-in.",
      status: "scheduled",
      date: at(8, 10, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "We are not doing a site-wide circus.\n\nOn 29 November, the Discovery Set is 20% off for the first 200 people. That's it. One offer, one weekend, no countdown anxiety.\n\nSet a reminder if you have been waiting to try the routine.",
          hashtags: "#LumenSkin #BlackFriday #DiscoverySet #BarrierCare",
          firstComment: "Want a reminder on the day? Comment 'REMIND ME' and we'll reply.",
        },
        {
          platform: "facebook",
          caption:
            "Black Friday, the quiet version: 20% off the Discovery Set for the first 200 orders on 29 November. No site-wide sale.",
          hashtags: "#LumenSkin #BlackFriday",
          firstComment: "Comment 'REMIND ME' and we'll nudge you on the day.",
        },
      ],
    },
    {
      id: "post-copper-wedding",
      brandId: "brand-copper",
      title: "The wedding guest edit",
      idea: "Carousel: one hoop, three wedding-guest looks.",
      status: "approved",
      date: at(1, 10, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "One earring. Three looks. Zero outfit changes.\n\nThe Ada Hoop, styled for the ceremony, the reception and the after-party. Which one is you?",
          hashtags: "#CopperAndCo #WeddingGuest #StatementEarrings #NaijaCraft",
          firstComment: "Save this for the next wedding on your calendar. Which look is your favourite?",
        },
        {
          platform: "tiktok",
          caption: "One hoop, three wedding guest looks. The after-party one wins. #CopperAndCo",
          hashtags: "#WeddingGuest #StatementEarrings #LagosFashion",
          firstComment: "Tell us which look you'd wear and we'll style the next one.",
        },
      ],
    },
    {
      id: "post-copper-artisan",
      brandId: "brand-copper",
      title: "Behind the craft: the Ile Studs",
      idea: "Mini-doc: artisan process, 45 seconds, no voiceover, captions.",
      status: "draft",
      date: at(4, 15, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "Before it reaches your ears, it passes through three pairs of hands.\n\nA short look at how the Ile Studs are made. Sound on for the workshop.",
          hashtags: "#CopperAndCo #BehindTheCraft #NaijaCraft",
          firstComment: "Tag an artisan you admire. We'll share our favourite studios this week.",
        },
      ],
    },
    {
      id: "post-copper-ada",
      brandId: "brand-copper",
      title: "The Ada Hoop is back",
      idea: "Restock announcement with styling reel.",
      status: "published",
      date: at(-2, 11, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "She's back. The Ada Hoop, in brushed gold and polished silver. The one you kept asking about.\n\nLimited restock. When they're gone, they're gone.",
          hashtags: "#CopperAndCo #AdaHoop #StatementEarrings",
          firstComment: "Which finish are you choosing: brushed gold or polished silver?",
        },
      ],
    },
    {
      id: "post-northstar-deadlift",
      brandId: "brand-northstar",
      title: "Three cues for a better deadlift",
      idea: "Reel: coach demonstrates three cues, on-screen text, no fluff.",
      status: "scheduled",
      date: at(0, 7, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "Three cues. Better deadlift. No motivation required.\n\n1. Push the floor away.\n2. Keep the bar close.\n3. Finish tall, don't lean back.\n\nSave this for your next session.",
          hashtags: "#NorthstarFit #StrengthForLife #TrainSmart #LagosFitness",
          firstComment: "Which cue finally made it click for you? Drop it below.",
        },
        {
          platform: "youtube",
          caption:
            "Three cues for a better deadlift | Northstar Fit\n\nA short coaching breakdown of the three cues we use with every new lifter: push the floor away, keep the bar close, finish tall.",
          hashtags: "#Deadlift #StrengthTraining",
          firstComment: "If you want the full 12-week programme, comment 'BASE' and we'll send the details.",
        },
      ],
    },
    {
      id: "post-northstar-motivation",
      brandId: "brand-northstar",
      title: "You don't need more motivation",
      idea: "Text post with a strong hook and a small first step CTA.",
      status: "needs_review",
      date: at(2, 18, 0),
      variants: [
        {
          platform: "linkedin",
          caption:
            "You don't need more motivation. You need a smaller first step.\n\nMost people quit because the plan is too big for the week they actually have. Shrink the session until it is almost impossible to skip. Consistency compounds.",
          hashtags: "#StrengthTraining #HabitBuilding #Coaching",
          firstComment: "What is the smallest training session you would actually do on a bad day?",
        },
        {
          platform: "x",
          caption:
            "You don't need more motivation. You need a smaller first step. Shrink the session until it's almost impossible to skip.",
          hashtags: "#StrengthTraining",
          firstComment: "What's the smallest session you'd actually do on a bad day?",
        },
      ],
    },
    {
      id: "post-northstar-intake",
      brandId: "brand-northstar",
      title: "November intake opens 18 Nov",
      idea: "Announcement carousel with programme details and FAQ.",
      status: "draft",
      date: at(6, 12, 0),
      variants: [
        {
          platform: "instagram",
          caption:
            "The next Strength Base intake opens on 18 November.\n\n12 weeks. Three sessions a week. A coach who adjusts the plan to your real schedule.\n\nNo before/after. No crash diets. Just strength you can keep.",
          hashtags: "#NorthstarFit #StrengthBase #LagosFitness",
          firstComment: "Questions about the programme? Ask below and Coach Tunde will answer.",
        },
      ],
    },
  ];

  for (const post of postSeeds) {
    insert(
      `INSERT INTO posts
       (id, brand_id, title, idea, status, scheduled_at, approved_by, approved_at, share_token, prep_lead_hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 48, ?, ?)`,
      [
        post.id,
        post.brandId,
        post.title,
        post.idea,
        post.status,
        post.date,
        post.status === "approved" || post.status === "scheduled" || post.status === "published"
          ? ownerId
          : null,
        post.status === "approved" || post.status === "scheduled" || post.status === "published"
          ? at(-2, 9)
          : null,
        at(-4, 9),
        at(-1, 9),
      ]
    );

    for (const variant of post.variants) {
      insert(
        `INSERT INTO post_variants
         (id, post_id, platform, caption, hashtags, first_comment, media_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
        [
          crypto.randomUUID(),
          post.id,
          variant.platform,
          variant.caption,
          variant.hashtags,
          variant.firstComment,
          at(-4, 9),
        ]
      );
    }
  }

  const comments: Array<[string, string, string, string, string, string, string, string, string, string, number]> = [
    ["comment-1", "brand-lumen", "post-lumen-night", "instagram", "Ada N.", "@ada.glows", "This cleared my skin in two weeks 😍", "positive", "new", "", 4],
    ["comment-2", "brand-lumen", "post-lumen-night", "instagram", "Chidera", "@chidera_k", "Do you ship to Abuja?", "question", "new", "", 5],
    ["comment-3", "brand-lumen", "post-lumen-night", "instagram", "Tola", "@tolaaa", "Is it safe for sensitive skin?", "question", "new", "", 6],
    ["comment-4", "brand-lumen", "post-lumen-myth", "instagram", "Nkem", "@nkem.o", "Price please", "question", "new", "", 2],
    ["comment-5", "brand-lumen", "post-lumen-myth", "instagram", "Bisi", "@bisi_b", "I had a reaction, this is misleading", "negative", "escalated", "", 2],
    ["comment-6", "brand-lumen", "post-lumen-myth", "instagram", "Feyi", "@feyi", "🔥🔥🔥", "positive", "new", "", 1],
    ["comment-7", "brand-copper", "post-copper-ada", "instagram", "Mariam", "@mariamstyling", "The brushed gold is everything. Do you restock silver?", "question", "new", "", 3],
    ["comment-8", "brand-northstar", "post-northstar-deadlift", "instagram", "Kunle", "@kunle_lifts", "Cue 2 fixed my back pain instantly", "positive", "new", "", 2],
  ];

  for (const c of comments) {
    insert(
      `INSERT INTO comments
       (id, brand_id, post_id, platform, author, author_handle, text, sentiment, status, reply_draft, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], at(-c[10], 11)]
    );
  }

  const platformSeed = [
    ["instagram", 1400, 1900, 0.065],
    ["facebook", 980, 900, 0.045],
    ["tiktok", 760, 2100, 0.08],
    ["x", 420, 600, 0.035],
    ["linkedin", 310, 480, 0.05],
    ["youtube", 260, 520, 0.055],
  ] as const;
  const brandMultiplier: Record<string, number> = {
    "brand-lumen": 1,
    "brand-copper": 0.72,
    "brand-northstar": 0.55,
  };
  const rand = (i: number, j: number) => {
    const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (const brand of brands) {
    const multiplier = brandMultiplier[brand.id] ?? 0.6;
    for (let p = 0; p < platformSeed.length; p++) {
      const [platform, baseFollowers, baseReach, rate] = platformSeed[p];
      for (let d = 34; d >= 0; d--) {
        const date = day(-d);
        const growth = (34 - d) * (platform === "instagram" ? 9 : 3);
        const noise = rand(p + 1, d + 7);
        const followers = Math.round((baseFollowers + growth) * multiplier * (0.96 + noise * 0.08));
        const reach = Math.round(baseReach * multiplier * (0.75 + noise * 0.7));
        const impressions = Math.round(reach * (1.2 + rand(p + 9, d) * 0.5));
        const engagements = Math.round(reach * rate * (0.8 + rand(p + 3, d + 2) * 0.5));
        const clicks = Math.round(reach * 0.012 * (0.8 + rand(p + 5, d + 4) * 0.6));
        insert(
          `INSERT INTO metrics_daily
           (id, brand_id, platform, date, followers, reach, impressions, engagements, clicks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), brand.id, platform, date, followers, reach, impressions, engagements, clicks]
        );
      }
    }
  }

  const notifications: Array<[string, string, string, string, string, string, string, string, number | null]> = [
    ["notif-1", ownerId, "brand-lumen", "prep", "Founder story needs a visual", "The reel script is ready but there is no cover frame yet. It is due tomorrow at noon.", "/posts/post-lumen-founder", "prep:post-lumen-founder", 0],
    ["notif-2", ownerId, "brand-lumen", "comment", "3 comments are waiting", "Two questions and one negative comment need a human reply.", "/inbox", "comments:brand-lumen", 1],
    ["notif-3", ownerId, "brand-lumen", "channel", "Instagram is in assisted mode", "No API connection yet. Posts will produce a copy-and-open kit instead of auto-publishing.", "/settings", "channel:instagram", 2],
    ["notif-4", ownerId, "brand-copper", "approval", "Wedding guest edit is approved", "It is ready to schedule for tomorrow at 10:00.", "/posts/post-copper-wedding", "approved:post-copper-wedding", 1],
  ];

  for (const n of notifications) {
    insert(
      `INSERT INTO notifications
       (id, user_id, brand_id, type, title, body, link, dedupe_key, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7], at(-(n[8] ?? 0), 8)]
    );
  }

  const activities: Array<[string, string, string, string, string, string, string, number]> = [
    ["activity-1", "brand-lumen", ownerId, "Approved", "post", "post-lumen-glow", "November glow challenge approved", 2],
    ["activity-2", "brand-lumen", managerId, "Added knowledge", "knowledge", "knowledge-lumen-voice", "WhatsApp voice note transcribed", 2],
    ["activity-3", "brand-lumen", ownerId, "Updated", "brand_fact", "fact-lumen-price", "Retail price is pending review", 1],
    ["activity-4", "brand-copper", ownerId, "Scheduled", "post", "post-copper-wedding", "Wedding guest edit scheduled", 1],
  ];

  for (const a of activities) {
    insert(
      `INSERT INTO activity_log (id, brand_id, user_id, action, entity, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [a[0], a[1], a[2], a[3], a[4], a[5], a[6], at(-a[7], 9)]
    );
  }

  insert(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)`,
    ["retention.hot_days", "90"]
  );
  insert(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)`,
    ["retention.voice_audio_days", "7"]
  );
}
