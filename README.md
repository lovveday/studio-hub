# Studio Hub

A local-first social media command center for a small agency team managing several client brands. It covers the loop the plan called for: **capture knowledge → plan → create → approve → schedule → assist publishing → engage → report** — with a Knowledge Inbox that turns notes, files, links and WhatsApp voice notes into versioned brand facts.

> Publishing is **assisted by default**. Real OAuth connections and a mock publisher are built; real Meta/YouTube/LinkedIn/X/TikTok adapters are the next slice. AI uses Gemini when a key is present, otherwise clearly labelled demo templates.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

Do **not** pipe `next dev` output into a file inside this folder. Next watches the project and will reload in a loop when that log file changes. Use the terminal, or write logs to `$env:TEMP`.

Deployment/callback guidance: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Demo accounts (seeded):

- `owner@studio.local` / `password123`
- `tunde@studio.local` / `password123`

The database is SQLite at `data/app.db` and is created automatically on first request. Reset it by deleting `data/` (it will re-seed).

Optional worker for offline reminders:

```bash
npm run worker
```

The worker checks every 60 seconds. It moves due scheduled posts to **Ready to post**, and creates prep / overdue notifications. In a real deployment this process runs on an always-on VPS — a sleeping laptop cannot publish or remind.

## What is implemented

### Command center
- Brand switcher, sidebar, notification menu, responsive layout.
- KPI cards: 7-day reach, engagement rate, runway count, comments waiting.
- Next five posts with prep state, attention queue, reach pulse, platform mix, engagement donut, approved brand facts, recent knowledge.

### Knowledge Inbox (the important correction)
- Add a text note, upload a file (PDF, DOCX, MD, TXT, HTML, CSV, image, audio), fetch a URL, or record a voice note in the browser.
- WhatsApp voice notes: accepts `.opus`, `.ogg`, `.oga`, `.m4a`, `.mp3`, `.wav`, `.aac`, `.amr`, `.webm`. Audio is saved, sent to Gemini for transcription when a key exists, and a transcript can be edited manually if not.
- Every source goes through `needs_review → approved / rejected`. Approving a source creates **pending** fact candidates.
- Facts are versioned. Approving a fact that conflicts with an existing approved fact supersedes the old one (`valid_to`, `supersedes_id`) and keeps history.
- The composer and writer only use approved, current facts.
- Seed data includes a demo WhatsApp voice note that changes a price and bans a claim — use it to test the replace flow.

### Connections, assets and the publisher
- `social_accounts` table with encrypted access/refresh tokens (`APP_ENCRYPTION_KEY`, AES-256-GCM).
- OAuth start/callback routes for `meta`, `google`, `linkedin`, `x`, `tiktok` and a `mock` provider.
- Settings shows real connections, reconnect/disconnect, and a **Connect demo accounts** button that creates a demo Facebook Page + Instagram account.
- Asset library: upload images/video/audio up to **300 MB**, with direct-to-R2 multipart when configured and an 8 MB local chunk fallback in development. Preview, download, remove, alt text. See [docs/UPLOADS.md](docs/UPLOADS.md).
- Mock publisher: `Run publisher` on a post creates per-platform publish attempts. Demo accounts publish immediately; channels without an account remain assisted tasks. The worker calls the same publisher for due posts.
- Real adapters are deliberately gated: non-mock accounts currently create an `assisted_required` attempt with a clear message instead of pretending to publish.
- Meta requires an HTTPS callback; set `APP_URL` to a tunnel or deployed URL. The Settings channel card shows the current callback base and warns when it is still localhost.
- Public `/privacy`, `/terms`, `/data-deletion` and the Meta data-deletion/deauthorize callbacks are in place for app review.
- Docker + Caddy deployment files are included: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Composer + post detail
- One brief → per-platform variants for Facebook, Instagram, TikTok, X, LinkedIn and YouTube.
- Character limits, hashtag suggestions, first comment per platform, live previews.
- Safety check: over-limit captions, missing first comments, banned claims from the brand profile.
- Regenerate variants, edit every variant in place, save.
- Approve, schedule, build an assisted post kit, run the publisher, mark posted, create a client approval link.
- Assisted kit: copy caption, copy first comment, open the platform composer deep link.
- Creative card: upload/attach media, preview, download, remove; the publish log shows every target attempt.
- Dictation button on the brief: browser speech recognition appends to the textarea (Chrome/Edge), with a voice-note fallback in Knowledge.
- Text generation falls back to DeepSeek (OpenAI-compatible) when a Gemini key is absent; transcription and image reading still need Gemini.

### Virality Lab
- `/virality` is a teardown library; `/virality/new` takes a clip, a public link or a transcript; `/virality/[id]` is the full read and adaptation brief.
- **Inputs:** upload an MP4/MOV/WebM up to 100 MB (the browser captures up to 8 frames before upload), paste a TikTok/Instagram/YouTube/Facebook/LinkedIn/X link plus its transcript, or paste a script. Links are read for public metadata only — the lab never downloads third-party video.
- **Pipeline:** Gemini watches the clip through the File API (or reads the captured frames if video is unavailable), then writes a timestamped teardown and an adaptation brief grounded in the brand's approved facts. Deterministic fallbacks keep the page usable when Gemini is busy or unset.
- **Output:** hook and device; timed structure with visual, audio and on-screen evidence; pacing; CTA; why-it-likely-worked hypotheses with evidence; risks and limits; adaptation angle; script; shots; caption; CTA; approved facts used; guardrails; a two-variant test plan.
- **Wording check:** compares 4-word sequences in the draft with the source, reports the share of copied words, and lists the phrases. Safe is under 8%, watch is 8–20%, rewrite is over 20%; when there is no source text it says "Not compared" instead of claiming 0%.
- **Source handling:** an uploaded clip is deleted from this app's storage as soon as the teardown is saved; frames and the written record remain. Gemini files are deleted immediately after the read.
- **Turn it into a post:** "Create draft post" writes a real draft with the caption and first comment; nothing publishes.
- **Samples:** each seeded brand has an illustrative sample teardown. It is labelled, fictional, and its price is re-grounded against the brand's current approved price when loaded.
- Full method, limits and test steps: [docs/VIRALITY-LAB.md](docs/VIRALITY-LAB.md).

### Calendar
- Month grid with Mon–Sun weeks, previous/next/today navigation.
- Status-coloured post chips with platform dots and publish time.
- “Needs preparation” (next 7 days, not approved) and “Unscheduled drafts” panels.
- Prep deadline is computed from the post’s `prep_lead_hours` (default 48h).

### Approvals
- Tokenised, read-only client page at `/approvals/[token]` with no login.
- Client can approve or request changes with a note. Both actions are logged.
- The link is stored on the post and can be refreshed.

### Inbox
- Seeded comments across the demo brands with sentiment, status and reply drafts.
- Draft a reply with AI (or demo templates), record a reply, like, or escalate.
- The automation rule model is represented in the UI; live auto-reply/like waits for platform API access.

### Reports
- Generate a 7-day or 30-day report.
- PPTX via `pptxgenjs`, PDF via `pdfkit`, both from the same metric snapshot.
- Cover, KPI scorecard, channel table, top posts by conversation, grounded insights.
- Download endpoints stream the generated files. Reports are stored in `storage/reports/`.

### Settings & data lifecycle
- Brand basics, brand voice, guardrails, hashtags, CTA style, competitors.
- Six channel rows, all clearly marked **Assisted / No API** until approvals land.
- Team list and invite form (owner only).
- AI status and `.env.local` key list.
- Storage dashboard: DB size, row counts, retention settings.
- **Dry-run** and **prune transient** actions. No monthly database wipe. Business records are never cleared by the prune action.
- Create another brand.

### Voice notes — format note
WhatsApp voice notes are Opus audio in an OGG container (`.opus` / `.ogg`), typically mono around 16 kHz. Forwards can arrive as `.m4a`, `.mp3`, `.amr` or `.wav`; all are accepted. The browser recorder produces `audio/webm`. Audio is kept in `storage/uploads/` and the UI states the 7-day retention rule.

## Tech

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- SQLite via Node’s built-in `node:sqlite` (no native dependency, no Docker/Postgres required for this slice). The data layer is isolated in `src/lib/db.ts` / `src/lib/data.ts` for a later Postgres move.
- Server Actions for mutations; REST route handlers for uploads, downloads and health.
- `pptxgenjs` + `pdfkit` for reports.
- Optional Gemini REST calls (no SDK dependency); deterministic demo fallbacks.
- No platform SDKs yet; the assisted kit and `platforms.ts` capacity map are the seam for adapters.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run worker` | Reminder/publish-due worker |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:init` | Create/seed the SQLite DB and print counts |

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local` or paste real keys into `.env.example`.

- `GEMINI_API_KEY` enables real writing/transcription; without it the hub uses demo templates.
- `APP_URL` is the base for OAuth callbacks and approval links. Meta requires HTTPS, so use a tunnel or deployed URL; Google accepts localhost.
- `APP_ENCRYPTION_KEY` is required before storing real OAuth tokens. Generate a long random value.
- Platform app IDs/secrets are optional until you connect a real account.
- `META_LOGIN_CONFIG_ID` is optional; when set, Meta uses the Facebook Login for Business configuration instead of a raw scope list.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` enable 300 MB direct multipart uploads. Without them, the local chunk fallback is used.
- `DOMAIN` is used by Caddy in Docker; `SUPPORT_EMAIL` is shown on the privacy/terms/data-deletion pages.

## Known limits / next slice

- OAuth foundation and the mock publisher are built. Real Meta/YouTube/LinkedIn/X/TikTok adapters are not enabled yet; non-mock accounts produce assisted attempts. The next slice is the Meta (Facebook + Instagram) and YouTube adapters, then LinkedIn/X/TikTok.
- Meta rejects a localhost callback. Use a tunnel (ngrok/cloudflared) or deploy first; the Settings page shows the exact callback base it will send.
- Auto-like/auto-reply is modelled in the UI and data model but not executed against platforms. Instagram and LinkedIn support comment likes; YouTube does not expose a comment-like API; TikTok is partner-gated and its audit may reject an internal agency tool.
- Binary doc parsing (PDF/DOCX/HTML) works server-side; image OCR needs a Gemini key. Scanned PDFs without a text layer need OCR later.
- Files and media use R2 when configured; otherwise the local chunk fallback stores them under `storage/`. Thumbnails/proxy generation is a worker job still to add.
- Privacy/terms/data-deletion pages are present, but `SUPPORT_EMAIL` and the real domain must be set before Meta App Review.
- No email/push delivery yet; reminders are in-app notifications from the worker.
- Browser dictation depends on the Web Speech API (best in Chrome/Edge); the server-side whisper pipeline and voice commands are the next voice slice.
- No embeddings/pgvector yet: retrieval is keyword overlap over approved sources. This is deliberate for the SQLite slice; the interface is ready for a vector store.
- The NotebookLM export is optional and not present in the repo. Upload it into the Knowledge Inbox when convenient.

Platform setup: [docs/API-KEYS.md](docs/API-KEYS.md). Free alternatives: [docs/FREE-ALTERNATIVES.md](docs/FREE-ALTERNATIVES.md). Next-build queue: [docs/NEXT-BUILD.md](docs/NEXT-BUILD.md).
