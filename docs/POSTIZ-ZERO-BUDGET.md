# Postiz zero-budget decision

Status: **Phase 0 spike is prepared for GitHub Codespaces — Docker is not installed locally.**

## Selected runtime

GitHub Codespaces (4-core, Docker-in-Docker). The spike folder now includes:

- `.devcontainer/devcontainer.json`
- `docker-compose.codespaces.yaml`
- `scripts/codespaces-env.sh` (writes `.env` with the forwarded 4007 URL)
- `CODESPACES.md`

Push the folder to a private GitHub repo and open a Codespace; no local Docker install is needed.

## Decision

Use **Postiz as the scheduler/publishing base** and keep **Studio Hub as the companion** for brand knowledge, voice notes, Virality Lab and reports.

- Postiz handles channels, calendar, scheduling, publishing, media, preview approvals, analytics, API and webhooks.
- Studio Hub calls the Postiz public API to create drafts/scheduled posts and receives Postiz webhooks to sync status.
- Do not fork Postiz yet. Forking a NestJS/Prisma/Temporal monorepo and complying with AGPL is the expensive path.
- If virality must live inside Postiz later, revisit the fork after the companion feature works.

## Corrections to the supplied document

| Claim | Reality |
|---|---|
| Postiz caps uploads under 50 MB; raise bodyParser to 300 MB | Postiz supports **1 GB video**, 10 MB images. The 50 MB limit is JSON body only. 300 MB already works. |
| Root repo has `docker-compose.yml` | The official stack is **`gitroomhq/postiz-docker-compose`**; it includes Postgres, Redis and **Temporal**. |
| `pnpm prisma:migrate:dev` | Use `pnpm prisma-generate` and `pnpm prisma-db-push`. Temporal is required. |
| Make.com bypasses app approvals natively | Postiz's Make app is **Make → Postiz**. A Postiz → Make publisher needs a custom bridge. X still has no free write tier. |
| Zero budget means zero infra | Postiz needs **2 GB min / 4 GB recommended**. Oracle Always Free ARM or an always-on PC is the zero-cash path; otherwise a $4–8 VPS. |
| Fork Postiz freely | Postiz is **AGPL-3.0**; modified network deployments must offer source to users. |

## Zero-budget stack

- Compute: Oracle Always Free ARM (4 OCPU/24 GB) or always-on PC; GitHub Codespaces for the spike.
- Database/cache/workflow: bundled Postgres, Redis, Temporal from the official Compose.
- Storage: Cloudflare R2 (10 GB free, no egress); local storage only for the spike.
- TLS/domain: DuckDNS + Caddy, or a named Cloudflare Tunnel.
- AI: Gemini free tier in Studio Hub; Postiz AI is OpenAI-first.
- Social: direct free apps for Meta/YouTube/LinkedIn; assisted for X/TikTok; Make only as a conditional bridge.

## Deployment kit

The sibling folder `C:\Users\23481\Documents\coding\postiz-spike` contains:

- the official Compose clone;
- `docker-compose.override.yaml` (Caddy + `.env` wiring);
- `Caddyfile`;
- `.env.zero.example`;
- `preflight.ps1` (checks Docker, RAM, disk, ports);
- `README-ZERO-BUDGET.md`;
- `CODESPACES.md` and `.devcontainer/devcontainer.json`.

## Blocker

`preflight.ps1` reports:

```
[FAIL] Docker  not installed
[OK]   RAM 15.9 GB, free 5.8 GB
[OK]   Disk 641 GB free
[OK]   Ports 80/443/4007 free
```

Docker Desktop cannot be installed silently here; it needs admin/reboot and WSL2. Choose one:

1. **GitHub Codespaces** — push the spike folder to a private repo and open a 4-core Codespace; the devcontainer installs Docker-in-Docker.
2. **Install Docker Desktop** locally (requires admin/reboot).
3. **Oracle Always Free** — provision the ARM instance and use the README.

After the spike, validate: 300 MB upload, draft, preview link, one channel, scheduled publish, R2 object, registration disabled.

## Next action

The moment a runtime is available:

1. Run `docker compose up` in `postiz-spike`.
2. Create the admin, upload 300 MB, check the preview link.
3. Connect one free channel.
4. Only then wire Studio Hub's Postiz API client and build the Virality Lab.
