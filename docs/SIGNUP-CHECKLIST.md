# Signup and handoff checklist

What you need to create, what you need to connect, and what to send for deployment.

## Already done

| Platform | Status | What we have |
|---|---|---|
| **Upload-Post** | Account + API key added | Key in `.env.local`; one `default` profile mapped to Lumen Skin; usage 0/10 |
| **Google AI Studio / Gemini** | API key added | `GEMINI_API_KEY`; AI + transcription working |
| **Studio Hub owner login** | Created | `owner@studio.local` with a changed password; demo login disabled |
| **App encryption key** | Generated | `APP_ENCRYPTION_KEY` in `.env.local` |

## Must create / decide

| Platform | Why | Cost | What I need from you |
|---|---|---|---|
| **Oracle Cloud** (recommended zero-cash) | Always Free ARM VM runs Docker, app, worker and Caddy | $0; card for identity verification; capacity is not guaranteed | Tenancy/region, VM public IP, SSH username, SSH key (or run the commands yourself) |
| **or Hetzner / Contabo** | Same VPS role if Oracle capacity is unavailable | ~$4–8/month | Same: IP, SSH user, SSH key; provider name |
| **DuckDNS** (free) or a domain registrar | Stable HTTPS hostname for Caddy, OAuth callbacks and approval links | DuckDNS $0; domain ~$10–15/year | The subdomain you choose; DNS access or the A record added to the VPS IP |
| **GitHub** (recommended) | Get the code onto the VPS and keep updates easy | Free for private repos | Repo URL and permission to clone, or a deploy zip/bundle |
| **Instagram professional account + Facebook Page** | Instagram/Facebook publishing through Upload-Post | Free | Do **not** send passwords. Connect it yourself through Settings → Manage connections |
| **TikTok account** | TikTok publishing; **not available on Upload-Post Free** | Free account; Upload-Post paid plan for TikTok | Connect it yourself through Upload-Post if you upgrade |
| **Other social accounts** (X, LinkedIn, YouTube) | Optional channels | Free | Connect them yourself through Upload-Post |

## Optional / only if needed

| Platform | Why | Cost | Notes |
|---|---|---|---|
| **Cloudflare** | DNS/proxy/WAF in front of Caddy, and R2 for large media | Free plan; R2 free 10 GB-month, then $0.015/GB-month | Only needed if you want R2 or Cloudflare DNS. R2 may require a billing profile |
| **GitHub** | Private deployment source | Free | Can be skipped if you upload a zip to the VPS |
| **UptimeRobot / healthchecks.io** | External uptime and worker alerts | Free tier | Optional but recommended |
| **Backup destination** | Off-site copies of `data/` and `storage/` | Free if using existing Drive/OneDrive | No signup required if manual |
| **Resend** | Email notifications | Free tier | Not wired into the app yet |

## Do NOT sign up for these

- **Meta for Developers app** — not needed for publishing. Upload-Post carries the Meta approvals. You only need the Instagram professional account and a Facebook Page.
- **TikTok for Developers app** — not needed. Upload-Post handles the TikTok app.
- **X/LinkedIn/Google developer apps** — not needed for Upload-Post publishing.
- **Postiz** — optional and unnecessary; it would add Postgres/Redis/Temporal/Docker for no extra publishing capability here.
- **Vercel** — unsuitable for this build because of SQLite, local media and the long-running worker.

The existing `META_APP_ID`/`META_APP_SECRET` and `TIKTOK_CLIENT_SECRET` entries are for the optional direct-OAuth path, not for Upload-Post. Leave them; do not create more apps for this deployment.

## Minimum handoff to deploy

If you want me to do the deployment, I need:

1. **VPS public IP** and **SSH user**.
2. **SSH private key** (temporary, rotated after) — or you run the commands I provide.
3. **Domain or DuckDNS hostname**; either DNS access or you add one A record to the VPS IP.
4. **GitHub repo URL** (or permission to upload a zip).
5. **Support email** for privacy/terms pages.
6. Confirmation of **which two brands** get the free Upload-Post profiles, and the social handles for each.

I do **not** need:

- Your Instagram/TikTok/Facebook passwords.
- A new Gemini or Upload-Post key — they are already set.
- A new `APP_ENCRYPTION_KEY` — I generate it on the server.
- Your bank/card details.

## Secure handoff rules

- Do not paste API keys, SSH keys or passwords into chat if you can avoid it.
- Put secrets in `.env.local` on the machine that runs the app; it is git-ignored.
- Use Upload-Post's **Manage connections** page for social accounts. It uses the platform's OAuth flow; never send social passwords.
- If you send an SSH key, use a temporary key and remove it from `~/.ssh/authorized_keys` after deployment.
- Rotate the Upload-Post key if it was ever pasted somewhere public.
- Turn on 2FA on Oracle/Hetzner, GitHub, Cloudflare, Instagram, TikTok and Upload-Post.

## Before the first production start

- [ ] Choose Oracle Always Free or a paid VPS.
- [ ] Create the VM (Ubuntu 24.04, 2+ vCPU, 4 GB RAM is comfortable).
- [ ] Open ports 80 and 443 in the provider firewall.
- [ ] Point the domain/DuckDNS at the VM.
- [ ] Decide: keep the current demo data or start with a fresh database.
- [ ] Choose the two brands for Upload-Post Free.
- [ ] Set `SUPPORT_EMAIL`.
- [ ] Run `docker compose up -d --build`, then change the admin password and keep `DISABLE_DEMO_LOGIN=true`.
- [ ] Connect the two Upload-Post profiles.
- [ ] Schedule one test feed post and one Story reminder.

## Monthly running cost

| Path | Cost |
|---|---|
| Oracle Always Free + DuckDNS + Upload-Post Free + local storage | **$0** |
| Paid VPS + DuckDNS + Upload-Post Free | **~$5–8/month** |
| Paid VPS + domain + Upload-Post paid (3 brands/TikTok) | **~$22–32/month** |

Maintenance is 1–3 hours/month: updates, backups, logs, key rotation and platform API changes.
