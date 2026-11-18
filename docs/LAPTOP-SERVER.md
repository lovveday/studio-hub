# Laptop as the temporary server

This is the zero-cost test deployment. The laptop is the server; Tailscale Funnel gives it a stable public HTTPS URL without opening router ports or buying a domain.

## What is running

- Next.js app on `http://127.0.0.1:3000`
- Worker (`scripts/worker.ts`) for scheduled posts and story reminders
- Tailscale Funnel:
  - `https://desktop-df0qq1m.tail2f0492.ts.net`
  - proxies to `http://127.0.0.1:3000`

Tailscale runs as a Windows service. The app and worker are started by:

`scripts/run-laptop-server.ps1`

At logon, Windows runs:

`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\StudioHub.vbs`

## Keep it alive

- Keep the laptop plugged in.
- AC sleep and hibernate are disabled; closing the lid on AC does nothing.
- Stay logged in after a reboot. The Startup launcher runs at logon, not at the lock screen.
- Do not shut the laptop down; a reboot requires you to log in once.
- Pause Windows Update restarts during an important test window.
- Keep Tailscale connected. If the laptop changes networks, Tailscale reconnects automatically.

## Logs

```text
%LOCALAPPDATA%\StudioHub\logs\app.out.log
%LOCALAPPDATA%\StudioHub\logs\app.err.log
%LOCALAPPDATA%\StudioHub\logs\worker.out.log
%LOCALAPPDATA%\StudioHub\logs\worker.err.log
```

## Manual start

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\Users\23481\Documents\coding\social-media-hub\scripts\run-laptop-server.ps1"
```

The script is idempotent: it checks port 3000 and for an existing worker before starting anything.

## Stop

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*next*start*' -or $_.CommandLine -like '*worker.ts*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

To stop only the public URL:

```powershell
& "$env:ProgramFiles\Tailscale\tailscale.exe" funnel --https=443 off
```

The app remains available on the Tailscale network but not on the public internet.

## Limits

- Laptop power, internet and Windows updates are single points of failure.
- No automatic login: after a reboot, the server starts only after you log in.
- Tailscale Funnel is for testing, not an SLA-backed production host.
- The database and media are on the laptop. Copy `data/` and `storage/` to an external drive or cloud folder regularly.
- Before using real client data, move to a VPS or at least enable File History/OneDrive backup for those two folders.
- The public URL is protected by the app login. Change the owner password after testing if it has been shared.

## Moving to a VPS later

1. Create the VPS and point `my-social-hub.duckdns.org` at it.
2. Copy `data/` and `storage/` from the laptop.
3. Set `APP_URL=https://my-social-hub.duckdns.org` and `DOMAIN=my-social-hub.duckdns.org`.
4. Run Docker Compose.
5. Disable the laptop Funnel and Startup launcher.
