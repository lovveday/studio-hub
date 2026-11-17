# Deployment checklist

Use this before pointing a domain at the app. The long-form version is [DEPLOYMENT.md](./DEPLOYMENT.md); this is the operator's short list.

## 1. Decide the host

| Option | Cost | Suits this app? |
|---|---|---|
| Oracle Cloud Always Free ARM (4 OCPU / 24 GB) | $0 | Yes, if capacity and card verification are available. Best zero-cash option. |
| Hetzner CX22 / Contabo VPS | ~$4–8/month | Yes. Most predictable. 2 vCPU / 4 GB is comfortable. |
| GitHub Codespaces | free core-hours | **No.** Stops when idle; not an always-on publisher. |
| Vercel / Render free | $0 | **No.** Ephemeral disk and no long-running worker. |
| Your laptop + tunnel | $0 | Fine for a preview; laptop must stay on. |

The worker is the scheduler. If it is not running, scheduled posts do not publish.

## 2. Information to have ready

- [ ] A domain or DuckDNS subdomain (e.g. `hub-yourname.duckdns.org`).
- [ ] VPS public IP and SSH access.
- [ ] `APP_ENCRYPTION_KEY` — 64 random hex characters.
- [ ] `GEMINI_API_KEY` — already present in the current `.env.local`; copy it across.
- [ ] `UPLOADPOST_API_KEY` — already present; copy it across.
- [ ] `APP_URL=https://your-domain` and `DOMAIN=your-domain`.
- [ ] Two Upload-Post profile choices (free plan: two profiles; third brand stays assisted).
- [ ] New owner/manager passwords.
- [ ] `SUPPORT_EMAIL` for privacy/terms/data-deletion pages.
- [ ] Backup destination outside the VPS.

## 3. What is stored where

| Data | Default location | On VPS | R2? |
|---|---|---|---|
| SQLite database | `data/app.db` | `./data` volume on the VPS | No |
| Voice notes, knowledge files | `storage/uploads/` | `./storage` volume | No |
| Generated reports | `storage/reports/` | `./storage` volume | No |
| Virality Lab frames | `storage/virality/` | `./storage` volume | No |
| Assets below 8 MB / local fallback | `storage/assets/` | `./storage` volume | Only if R2 is configured |
| Large assets (direct multipart) | R2 when configured | R2 bucket | Yes |

After deployment, files are on the **VPS**, not your laptop. Copy the current `data/` and `storage/` to the VPS if you want to keep the demo/current records; otherwise it starts fresh.

**R2 is optional.** Local storage works and is simpler. R2 is useful for large media, public URLs and offloading disk. Cloudflare R2 free tier (verify current terms): **10 GB-month storage, 1M Class A ops, 10M Class B ops, free egress**; beyond that **$0.015/GB-month** and operation fees. Cloudflare may require a billing profile even for free usage.

## 4. First deployment

```bash
# on the VPS
curl -fsSL https://get.docker.com | sh
git clone <your-private-repo> /opt/studio-hub
cd /opt/studio-hub
cp .env.example .env.local
nano .env.local
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose logs -f worker
```

Set `DOMAIN`, `APP_URL`, keys, `DISABLE_DEMO_LOGIN=true`, and `SUPPORT_EMAIL` in `.env.local`. Open ports **80** and **443** in the VPS/provider firewall. Point the domain's A record at the VPS; Caddy obtains TLS.

## 5. Lock it down

```bash
docker compose exec app npm run passwd -- owner@studio.local 'a-long-new-password'
docker compose exec app npm run passwd -- tunde@studio.local 'a-long-new-password'
```

- Set `DISABLE_DEMO_LOGIN=true` before sharing the URL.
- The app is **single-workspace**: invited teammates see every brand. Do not invite an unrelated operator.
- Do not paste secrets in chat or commit `.env.local`.
- If the Upload-Post key was ever exposed, rotate it in the Upload-Post dashboard.

## 6. Verify

- [ ] `https://your-domain/api/health` returns 200.
- [ ] Login works; demo button is gone.
- [ ] `docker compose ps` shows app, worker and caddy running/healthy.
- [ ] Upload-Post Settings shows the key and profile; connect two brands.
- [ ] Schedule a post 3 minutes ahead; the worker publishes it (or records a clear assisted reason).
- [ ] Free limit: set `UPLOADPOST_PLAN=free`; one multi-platform post counts as one upload.
- [ ] After 10 uploads, the next post is assisted with the reset date.
- [ ] Create a report; open the PDF/PPTX.
- [ ] Upload a video to Virality Lab; confirm source file is deleted after analysis.
- [ ] Backup `data/` and `storage/`; test a restore once.
- [ ] Monitor disk space, worker logs and the health endpoint.

## 7. Costs to note

| Item | Typical |
|---|---|
| VPS | $0 (Oracle free) or $4–8/month |
| Domain | ~$10–15/year; DuckDNS free |
| Upload-Post | free 10 uploads/2 profiles; ~$16–24/month paid |
| R2 | free up to 10 GB-month; $0.015/GB-month after |
| Gemini | depends on your key; free tier/paid usage |
| Backups | free if self-hosted; off-site storage may cost |

## 8. Operational gotchas

- Scheduled posts are **late** if the worker/server is down; they are not lost, but they are not queued for the exact original time.
- One worker only. Do not scale the worker to multiple replicas or scheduled posts may publish twice.
- SQLite is fine for a small agency, but it is single-writer and tied to one server. A Postgres migration is the scale path.
- The free Upload-Post plan does not include TikTok and allows only two profiles; the third brand remains assisted.
- Upload-Post media needs a public URL if the asset lives in R2. Local assets are streamed from the server and do not need R2.
- Upload-Post's connect link is short-lived; regenerate it from Settings if it expires.
- No email/push delivery yet; notifications are in-app.
- There is no `LICENSE` file in the repo. Add one before distributing source.
