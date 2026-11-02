# Studio Hub

A local-first social media command center for a small agency team managing several client brands. It covers the loop the plan called for: **capture knowledge → plan → create → approve → schedule → assist publishing → engage → report** — with a Knowledge Inbox that turns notes, files, links and WhatsApp voice notes into versioned brand facts.

> This is the Phase 0 + Phase 1 slice. Platform APIs are not connected yet, so publishing runs in **assisted mode**: every post produces a per-platform copy-and-open kit. AI runs on **demo templates** until `GEMINI_API_KEY` is set.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

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

### Composer + post detail
- One brief → per-platform variants for Facebook, Instagram, TikTok, X, LinkedIn and YouTube.
- Character limits, hashtag suggestions, first comment per platform, live previews.
- Safety check: over-limit captions, missing first comments, banned claims from the brand profile.
- Regenerate variants, edit every variant in place, save.
- Approve, schedule, build an assisted post kit, mark posted, create a client approval link.
- Assisted kit: copy caption, copy first comment, open the platform composer deep link.

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

Copy `.env.example` to `.env.local`. Only `GEMINI_API_KEY` changes the writing/transcription behaviour; everything else is optional for this slice.

## Known limits / next slice

- No live OAuth or platform publishing. The next slice is Meta (Facebook Page + Instagram) first, then YouTube, LinkedIn, X, TikTok, with token refresh, idempotent retries and reconciliation.
- Auto-like/auto-reply is modelled in the UI and data model but not executed against platforms. Instagram and LinkedIn support comment likes; YouTube does not expose a comment-like API; TikTok is partner-gated.
- Binary doc parsing (PDF/DOCX/HTML) works server-side; image OCR needs a Gemini key. Scanned PDFs without a text layer need OCR later.
- No S3 yet: media and reports are stored under `storage/` locally.
- No email/push delivery yet; reminders are in-app notifications from the worker.
- No embeddings/pgvector yet: retrieval is keyword overlap over approved sources. This is deliberate for the SQLite slice; the interface is ready for a vector store.
- The NotebookLM export is optional and not present in the repo. Upload it into the Knowledge Inbox when convenient.

See [docs/SKILLS.md](docs/SKILLS.md) for the agent skills to install before the next build slice.
