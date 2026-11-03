# Deployment & callback URLs

## The bug you saw

The settings page was not glitching on its own. The dev server was started with its output piped into `dev.log` **inside the project folder**. Next.js watches the project, saw `dev.log` change on every request, recompiled, wrote another log line, and triggered another reload — an infinite "opening…" loop.

Fix applied: the log files were removed and the dev server was restarted **without** writing a log file inside the repo. If you run it yourself, use:

```bash
npm run dev
```

Do not do `npm run dev > app.log` or `| Tee-Object -FilePath dev.log` inside the repo. If you need a log, write it outside the project (`$env:TEMP\studio-hub-dev.log`) or use the terminal.

Refresh the settings tab once and the loop should be gone.

---

## The callback problem

Every platform needs a public URL that matches exactly:

```
https://<your-domain>/api/oauth/<platform>/callback
```

Localhost is not acceptable to Meta, and TikTok requires HTTPS. You have two ways to get that URL.

## Option A — Cloudflare Tunnel (fastest, free, for testing)

This gives you an HTTPS URL that points at your local app. No deployment, no database migration.

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```

It prints a URL like:

```
https://random-words.trycloudflare.com
```

Set it in `.env.local`:

```env
APP_URL=https://random-words.trycloudflare.com
```

Restart `npm run dev`, then register:

```
https://random-words.trycloudflare.com/api/oauth/meta/callback
```

in the Meta app, and the matching paths for Google, LinkedIn, X and TikTok.

**Caveats**

- The free quick tunnel URL changes each time you restart `cloudflared`.
- Your machine must stay on.
- It is fine for development and for testing OAuth, but **do not submit it for Meta App Review** — reviewers need a stable production URL that stays up.
- For a stable URL, use a named Cloudflare Tunnel with a domain you control.

ngrok works the same way (`ngrok http 3000`) but the free URL also changes.

## Option B — Deploy the hub properly

### Recommendation: a small VPS, not Vercel (for this codebase)

The app currently uses:

- **SQLite** at `data/app.db`
- **Local files** under `storage/`
- A **long-running worker** (`scripts/worker.ts`) for reminders and publishing
- Server-side PPTX/PDF generation

Vercel’s serverless filesystem is ephemeral. Deploying as-is would lose the database and media on every cold start, and the worker would not run. So **Vercel is not a drop-in host for the current build**.

A small always-on VPS is the path with the least rewrite:

- Hetzner CX22 / Contabo / similar: roughly $4–8/month.
- Docker Compose: app + worker + Caddy (HTTPS) with persistent volumes for `data/` and `storage/`.
- A domain pointed at the VPS; Caddy gets the TLS certificate automatically.
- Set `APP_URL=https://hub.yourdomain.com`.
- Register `https://hub.yourdomain.com/api/oauth/<platform>/callback`.
- Keep the worker in its own container; it uses the same volumes.

This keeps SQLite and local storage, which is fine for a small agency. Add nightly backups of `data/` and `storage/`.

### If you specifically want Vercel

You need a migration slice first:

1. **Database:** move from `node:sqlite` to a hosted Postgres (Neon/Supabase) or libSQL/Turso. All queries in `src/lib/` need adapting.
2. **Media:** move `storage/` to S3/R2 with presigned uploads.
3. **Worker:** replace the long-running worker with Vercel Cron or an external queue/worker. Hobby cron is limited — check current Vercel limits; minute-level scheduling and long media jobs are not a good fit for Hobby.
4. **Function duration:** reports, uploads and media work need background processing or longer limits.
5. **Plan:** Vercel Hobby is generally for personal/non-commercial projects. An agency tool serving client accounts should plan for Pro; check the current terms.

This is a real migration, not a deploy button. It is doable, but it should be a deliberate slice after the real adapters work.

## What I recommend

1. **Today:** use a Cloudflare Tunnel and set `APP_URL` to get an HTTPS callback. This lets you finish the Meta OAuth setup and test the connection without deploying.
2. **This week:** deploy to a small VPS with Docker + Caddy, using persistent volumes. This matches the current app and keeps the worker.
3. **For Meta App Review:** use the final production domain, not the tunnel. The reviewer must be able to open the app, log in with the test account, and see the publish flow.
4. **Only then:** decide whether Vercel is worth the Postgres/S3/cron migration.

## Before Meta App Review

You will need public pages and endpoints that do not exist yet:

- `/privacy` — privacy policy URL
- `/terms` — terms of service URL
- `/api/meta/data-deletion` — data deletion callback returning `{ url, confirmation_code }`
- A stable test account for the reviewer
- A 1080p screencast showing connect → compose → approve → publish → first comment

---

## 300 MB uploads: what it actually takes

**Short answer:** yes, 300 MB is doable, but **not by raising the current limit**. The current asset route reads the entire file into memory with `request.formData()` and is capped at 50 MB. Pushing 300 MB through a Next.js route is slow, memory-heavy, and impossible through a Vercel function (Vercel's request body limit is a few MB, not hundreds).

The standard design is **direct-to-object-storage multipart upload**:

1. Browser calls `POST /api/uploads/init` with file name, size, MIME type and checksum.
2. Server creates an S3/R2 multipart upload and returns presigned URLs for the parts.
3. Browser uploads 8–16 MB parts in parallel (3–4 at a time) directly to R2. The app server never touches the bytes.
4. Browser calls `POST /api/uploads/complete` with the part ETags. The server completes the upload, verifies size/checksum, saves the asset row, and queues a thumbnail/proxy job.
5. The worker generates thumbnails/proxies with FFmpeg **after** the upload, not during the request.

Why this is fast:

- The file goes from the user's browser to R2 directly, not through the app server.
- Parallel parts use more of the available connection.
- The server only signs short-lived URLs, so it stays responsive.
- A 300 MB upload is still limited by the user's upload bandwidth — no software can beat the ISP — but this is the fastest compliant path and it is resumable.

Production choices:

- **Cloudflare R2** — S3-compatible, 10 GB free, no egress fees. Good fit.
- Backblaze B2 / AWS S3 — also fine; watch egress/operation costs.
- Local MinIO for development.

Local fallback: a chunked upload route that appends `Content-Range` chunks to disk, so the hub still works without cloud credentials. Slower than R2, but no memory blow-up.

Additional requirements for 300 MB:

- Per-file cap 300 MB (configurable), per-brand storage quota, and R2 lifecycle rules.
- Video is transcoded to platform presets in the worker; keep the original master, delete temporary derivatives.
- Resumable upload state stored in `localStorage` + server (`uploadId`, parts) so a refresh does not restart from zero.
- UI: progress per file, pause/resume, cancel, and a clear error if the file is too large.

This is a **medium-sized slice**, not a one-line limit change. About 1–2 focused days including the local fallback and tests.

## Hybrid frontend/backend: honest assessment

Your proposed split — Vercel frontend + VPS/Render/Railway backend — is a valid industry pattern, but it is **not simpler or free** for this app.

What it still needs:

- A **persistent backend** for OAuth callbacks, scheduled publishing, the worker and media processing.
- A **hosted database** and **object storage** (Vercel functions cannot hold SQLite or local files).
- **CORS, auth, cookie/domain configuration** between the Vercel frontend and backend.
- Either the Next.js backend moves behind an API, or the whole Next app runs on the backend and Vercel only serves a separate static marketing site. The current app uses server components, server actions and direct DB access; extracting an API is a refactor.

Free-tier reality:

| Option | Reality |
|---|---|
| **Render Free** | Web services spin down after inactivity; background workers are not a truly free always-on resource. Bad for a scheduler. |
| **Railway** | Trial credit, then usage-based; reliable but not permanently free. |
| **Oracle Always Free** | Generous if you get accepted; approval/capacity is the catch. |
| **Vercel Hobby** | Great for the frontend; not a backend, and commercial agency use may require Pro. |
| **Small VPS** | ~$4–8/month, always on, predictable. Cheapest in engineering time. |

**Recommendation:** keep the **single Next.js app + worker on one small VPS** for now, with **R2 for media**. Add a domain and Caddy. Use Vercel later only if you split out a separate marketing site or after the Postgres/S3/API migration. The global CDN benefit is not meaningful for an authenticated dashboard used by a small team.

If you specifically want the hybrid, the upload design is the same: browser → R2 direct. Vercel can host the UI; the backend VPS handles OAuth, scheduler, worker and DB. But budget the refactor.


I can build the privacy/terms pages and data-deletion endpoint next, then the Docker/Caddy deployment, then the real Meta/YouTube adapters.
