# API keys & developer apps — setup guide (November 2026)

Practical guide for Studio Hub (`C:\Users\23481\Documents\coding\social-media-hub`): a Next.js 16 / React 19 internal agency tool that manages **multiple client brands**. You already have a Meta app; this covers what to select in it and how to create the other four.

Only official developer documentation is used. Where a dashboard label could not be confirmed, the text says **"look for X; the dashboard may label it Y"**. No scraping or unofficial APIs are assumed anywhere.

- Local dev URL: `http://localhost:3000`
- Production: replace `https://hub.example.com` with your real HTTPS domain
- Env file: `.env.local` (already gitignored). Variable names match `.env.example`.

---

## 1. Credentials and where they go

| Variable | Platform | What it is |
|---|---|---|
| `META_APP_ID` / `META_APP_SECRET` | Meta | App ID + App Secret (App settings → Basic) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud | OAuth 2.0 **Web application** client |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn | "Client ID" / "Primary Client Secret" on the Auth tab |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X | OAuth 2.0 Client ID + Client Secret (Web App / confidential client) |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok | "Client key" / "Client secret" under App details → Credentials |

Also set: `APP_URL` (used to build callbacks), `APP_ENCRYPTION_KEY` (long random value, encrypts stored OAuth tokens), and a webhook `WHATSAPP_VERIFY_TOKEN`-style value per platform if you add verification tokens.

## 2. Redirect URIs to register (all platforms)

These are the paths the app should implement. Register **both** the localhost and the production value for every platform — except X and TikTok, which are stricter (see their sections).

| Platform | Local | Production |
|---|---|---|
| Meta | `http://localhost:3000/api/oauth/meta/callback` | `https://hub.example.com/api/oauth/meta/callback` |
| Google/YouTube | `http://localhost:3000/api/oauth/google/callback` | `https://hub.example.com/api/oauth/google/callback` |
| LinkedIn | `http://localhost:3000/api/oauth/linkedin/callback` | `https://hub.example.com/api/oauth/linkedin/callback` |
| X | `http://127.0.0.1:3000/api/oauth/x/callback` | `https://hub.example.com/api/oauth/x/callback` |
| TikTok | `https://<tunnel-host>/api/oauth/tiktok/callback` | `https://hub.example.com/api/oauth/tiktok/callback` |

Rules that bite in practice: exact string match (scheme, host, port, trailing slash), no query string, no `#` fragment, no wildcards. Google is the only one that accepts `http://localhost` cleanly; X requires `127.0.0.1`, and TikTok documents HTTPS only.

---

## 3. Meta (Facebook Pages + Instagram)

### 3.1 Where to create / open the app

- Create: **https://developers.facebook.com/apps/creation/** (register as a developer first)
- Manage: **https://developers.facebook.com/apps/**
- Same entry point for an existing app: select it in the app switcher at the top of the dashboard.

### 3.2 Which app type and use cases (the "Meta customisation" answer)

Meta reduced app types to two: **Consumer** and **Business**. **Business** is the only correct choice for an agency managing client Pages, Instagram and ads.

> "The **Business** app type is for apps that help businesses, creators, and organizations manage their presence and advertise on Meta's Social Technologies apps." — [App Types](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/app-types)

Important 2025–2026 behaviour, from [Create an App](https://developers.facebook.com/docs/development/create-an-app/) and [App dashboard](https://developers.facebook.com/docs/development/create-an-app/app-dashboard):

1. **App type cannot be changed.** If you need products the type lacks, create a new app.
2. New apps are created by picking **use cases**, not by picking an app type directly. Selecting **Other** and then **Business** is the documented escape hatch when no use case fits.
3. **Use cases cannot be removed** once the app exists; you can only add compatible ones (incompatible ones are greyed out).
4. `Facebook Login for Business` and `Webhooks` "might automatically be added to your app."
5. Apps created through use cases **do not have a Development/Live mode toggle**. They have a **Go live** checklist and use **Standard vs Advanced access** instead. Older "app type" apps still show the mode toggle; Business apps never show it.

**Recommended selection for this project:**

| Step | Pick | Why |
|---|---|---|
| Use case 1 | **Manage everything on your Page** | Documented Page-management use case. It adds `business_management`, `pages_show_list`, `public_profile` (required, cannot be removed) and `pages_manage_engagement` (added by default, removable). Add optional `pages_read_engagement`. |
| Use case 2 | An Instagram use case, if offered | The dashboard may label it **"Instagram"**, **"Manage messaging and content on Instagram"** or similar. Meta's docs could not be read as a rendered list (the table is client-side), so confirm the exact wording in the wizard. If no Instagram use case is offered for your app, add Instagram through the product instead (next row). |
| Product | **Instagram → API setup with Facebook login** | Documented "Products Required" for the Page-linked Instagram API. Adds the `instagram_*` permissions to the app. |
| Product | **Facebook Login for Business** | Auto-added for supported use cases; if missing, add it explicitly. |
| Product | **Webhooks** | Auto-added for some use cases; add it if absent. |

Do **not** also pick "Authenticate and request data from users with Facebook Login" — it is documented as **incompatible** with the Page-management use case.

### 3.3 Instagram: which of the three setups?

Meta now documents **three** Instagram API setups and recommends a new one:

| Setup | Login | Facebook Page | Token | Notes |
|---|---|---|---|---|
| **Instagram API with Unified Login** | Instagram **or** Facebook | Not required | Business Integration System User token | **Recommended for new integrations. New Instagram features ship only here.** Requires a business portfolio. |
| Instagram API with Instagram Login | Instagram | Not required | Instagram User token | `graph.instagram.com` |
| Instagram API with Facebook Login | Facebook | **Required** | Facebook User / Page token | Matches the "IG linked to a Page" model; still fully supported. |

For an agency that already manages client Pages, **Facebook Login** is the lower-friction start; **Unified Login** is the future-proof choice and is the documented recommendation for new builds. Both support publishing, comment moderation, insights, mentions and webhooks. Unified Login is configured on the **Instagram → API setup with Unified login** tab, including its own **Configure webhooks** callback.

### 3.4 Facebook Login for Business configuration (replaces raw `scope`)

Documented flow ([Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business)):

1. Left menu → **Facebook Login for Business** → **Configurations**.
2. **+ Create configuration** (or **Create from template**).
3. Name it (e.g. `Studio Hub – client Pages`).
4. Token type: **User access token** for this app (the user is present and clicks Publish). *System-user token* only if you later need unattended server-to-server access with no re-auth.
5. Select assets: the client's Page(s) and linked Instagram account(s).
6. Select only these permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_manage_metadata`, `read_insights`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `business_management`. Add `publish_video` if you publish Page video/Reels. Add `instagram_manage_messages` only if you handle DMs.
7. Save and copy the **Configuration ID**. At runtime pass `config_id=<ID>` instead of `scope`. Meta's docs recommend not mixing `config_id` with `scope`.
8. Redirect URI goes in **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** (older UIs label the block **Client OAuth Settings**).

Note: `email` and `public_profile` cannot be requested alone — each login must include at least one other supported permission. Advanced access to `public_profile` is required before a Facebook Login for Business app can go live for non-role users.

### 3.5 Get the App ID and App Secret

1. Dashboard → **App settings → Basic** (the App ID is also shown in the top toolbar of every dashboard page).
2. **App ID**: copy as `META_APP_ID`.
3. **App Secret**: click **Show**, re-enter your Facebook password, copy as `META_APP_SECRET`.
4. The secret can be **reset** here (no programmatic rotation). Resetting invalidates all existing tokens — do it only during a rotation window.

While on that page, fill in everything required to go live: **Privacy Policy URL**, **Terms of Service URL**, **User Data Deletion** URL, **App Icon** (1024×1024), **Category**, **App Purpose**, **Contact Email**, and (if applicable) **Data Protection Officer** contact.

### 3.6 Permissions, and what needs review

| Permission | Used for | Access needed |
|---|---|---|
| `pages_show_list` | List client Pages | Advanced for non-owned pages |
| `pages_read_engagement` | Read posts/comments | Advanced |
| `pages_manage_posts` | Publish/schedule Page posts | Advanced |
| `pages_manage_engagement` | Reply to / hide / delete comments | Advanced |
| `pages_manage_metadata` | Subscribe Page to webhooks | Advanced |
| `read_insights` | Page/post insights | Advanced |
| `publish_video` | Page video/Reels | Advanced |
| `instagram_basic` | IG profile + media | Advanced |
| `instagram_content_publish` | IG publish | Advanced |
| `instagram_manage_comments` | IG comments, mentions, webhooks | Advanced |
| `instagram_manage_insights` | IG insights | Advanced |
| `business_management` | Business portfolio access | Advanced |
| `instagram_manage_messages` | IG DMs (optional) | Advanced |

**Standard access** works only for people with a role on the app (or on the connected business portfolio) — enough to build and test with your own Pages/IG. **Advanced access** is required to serve client assets; it needs **App Review + Business Verification**, and each permission needs at least **one successful API call in the previous 30 days** before the "Request advanced access" button unlocks.

**App Review requirements** ([submission walkthrough](https://developers.facebook.com/docs/app-review/submission-guide)):

- App publicly reachable, or written test instructions; reviewers use their own accounts — never send your credentials.
- 1024×1024 app icon, privacy policy URL, accurate category, app purpose set to **Clients** (not "Yourself or your own business").
- One **screen recording per permission** (1080p+, English UI, mouse-visible, no audio needed) showing the user granting it and the app using it. A missing recording means that permission is not approved.
- Business Verification (legal name, address, website, phone; may need documents).
- Data handling questions in the submission form.

### 3.7 Webhooks, deauthorize and data deletion (public HTTPS required)

- Callback endpoint must be **HTTPS with a valid CA certificate; self-signed is not supported**. `localhost` cannot be used directly — expose dev with a tunnel (Cloudflare Tunnel / ngrok) and register the tunnel URL.
- Verification: Meta sends `GET` with `hub.mode`, `hub.challenge`, `hub.verify_token`; echo `hub.challenge` when the token matches.
- Payloads are signed: validate `X-Hub-Signature-256` = HMAC-SHA256 of the raw body with the **App Secret**. Respond `200` fast; Meta retries for up to 36 hours, so dedupe.
- App-level subscription is not enough: each Page/IG account must also be subscribed via `POST /<PAGE_ID>/subscribed_apps` or `POST /<IG_ACCOUNT_ID>/subscribed_apps` with the right fields.
- Instagram `comments`/`live_comments` notifications require **Advanced access**, a **Live** app, and a **public** Instagram account. The app cannot pick fields per account — every connected account gets every field selected at app level.
- **Data Deletion Request URL** (App settings → Basic): HTTPS `POST` with `signed_request`; verify the HMAC with the App Secret; respond `{"url": "...", "confirmation_code": "..."}`. A instructions-only URL is also accepted, but a real callback is what reviewers expect for a publishing tool. The separate **Deauthorize Callback URL** fires when someone removes the app.

### 3.8 Meta gotchas

1. **Instagram must be a professional (Business/Creator) account.** Consumer accounts are not supported. For the Facebook Login setup it must be **linked to a Facebook Page**, and the logged-in user needs Page tasks `CREATE_CONTENT` + `MODERATE` (and `ANALYZE` for insights).
2. **Publishing pulls media from a public URL.** Instagram cURLs `image_url`/`video_url` at publish time — a `localhost` or signed-expiring URL will fail. Use a public bucket/CDN in production.
3. **Page Publishing Authorization (PPA).** If a client Page requires PPA and it is not completed, Instagram publishing fails with no clear API signal. Tell clients to complete PPA up front.
4. **Rate limits.** Instagram: 100 API-published posts per rolling 24h, carousels count as one; carousel children up to 20. Don't fight this — the app should enforce it too.
5. **Comment likes on Instagram are not in the official docs.** Comment moderation covers read, reply, hide/unhide, delete, enable/disable — no like endpoint. Treat "like an IG comment" as **unsupported/assisted**; verify in the current reference before building it. Facebook Page comment likes exist via the comment `likes` edge (`POST /{comment-id}/likes` with a Page token) — confirm in the Comment reference before shipping.
6. **Business Verification gates everything client-facing.** It is required for Advanced Access and for production Instagram webhooks. Start it early: it is the slowest step (days to weeks).
7. **Test users don't help with Pages.** Meta test users are for consumer login. To test Page/IG flows, use real Pages/IG accounts where you are admin and add colleagues as app **Testers** (App roles).
8. **Graph API version.** Docs currently use `v26.0`. Pin the version in code; upgrade deliberately.

---

## 4. Google / YouTube

### 4.1 Where to create

1. **https://console.cloud.google.com/** → create/select a project (one project per product, per Google's policies).
2. **APIs & Services → Library** → enable **YouTube Data API v3**. Enable **YouTube Analytics API** only if you need analytics beyond Data API metrics.
3. **APIs & Services → OAuth consent screen** — in the current console this is the **Google Auth Platform** with tabs **Overview / Branding / Audience / Clients / Data Access**. "Look for OAuth consent screen; the dashboard may label it Google Auth Platform."

### 4.2 Branding + Audience

- **Branding**: app name, support email, logo, authorised domains, developer contact.
- **Audience**: **User type = External** (clients are outside your Workspace). Publishing status starts at **Testing**; add test users (hard cap **100**). Testing works for building, with the limits below.
- **Data Access / scopes**: add `https://www.googleapis.com/auth/youtube.upload`, `.../youtube.readonly` and `.../youtube.force-ssl` (comments + replies).

### 4.3 OAuth client and redirect URI

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins**: `http://localhost:3000`, `https://hub.example.com`.
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/oauth/google/callback`
   - `https://hub.example.com/api/oauth/google/callback`
5. Create → copy **Client ID** and **Client secret** (also downloadable as `client_secret.json`). The secret is shown at creation; Google documents that it cannot be re-viewed afterwards — download/store it then, or create a new client.

### 4.4 Scopes and approvals

| Scope | Use | Class |
|---|---|---|
| `.../auth/youtube.upload` | Upload videos/Shorts | Sensitive |
| `.../auth/youtube.readonly` | Read channel, videos, comments | Sensitive |
| `.../auth/youtube.force-ssl` | Insert/reply/delete comments, ratings | Sensitive |

Sensitive/restricted scopes for external users require **OAuth verification** (brand + scope justification, demo video, privacy policy on a verified domain). Unverified published apps show the "unverified app" warning and are capped at **100 users**. Testing status is fine for development.

**Testing-mode trap:** while the consent screen is in **Testing**, refresh tokens **expire after 7 days** — users must re-consent weekly. Google's own comparison table lists the "7-day refresh token expiration limit for apps in Testing status" (a Workspace admin marking the app **Trusted** can override it for that org). Plan for re-auth or move to Published before relying on scheduled publishing.

### 4.5 Quota (changed recently)

Current docs: default allocation is **100 `videos.insert` calls/day**, **100 `search.list` calls/day**, and **10,000 units/day** for everything else. This replaces the old single 10,000-unit pool where an upload cost 1,600 units (≈6 uploads/day). More requires the **YouTube API Services – Audit and Quota Extension Form**. Quota is per project per day, resets at midnight Pacific.

### 4.6 YouTube gotchas

1. **No official comment-like API.** First comment and replies are supported (`commentThreads.insert`, `comments.insert`); liking a comment is not. Keep it assisted.
2. **First comment** must be posted after upload completes, against the returned video ID — schedule it, don't race the upload.
3. **Uploads from unaudited projects are widely reported to be locked to `private`.** I could not confirm this on the pages read in November 2026 (the audit doc only mentions quota), so treat it as: **test with one upload and check the resulting privacy status** before promising public publishing. Budget for the compliance audit either way.
4. **`youtube.upload` alone cannot read the video back.** Add `youtube.readonly` (or `force-ssl`) if you verify status.
5. **Shorts are just vertical videos** ≤ 3 minutes; there is no separate Shorts endpoint.
6. **Inactive projects** (90 days) can lose access — periodic use matters.

---

## 5. LinkedIn

### 5.1 Where to create

1. Create/confirm a **LinkedIn Company Page** for the agency (required for verification).
2. **https://www.linkedin.com/developers/apps/new** — "Create app": name, LinkedIn Page (must be one you administer), logo, legal agreement.
3. Open the app at **https://www.linkedin.com/developers/apps** → tabs **Settings / Auth / Products / Analytics**.

### 5.2 Products to add

| Product | Gives | Notes |
|---|---|---|
| **Share on LinkedIn** | `w_member_social` | Self-serve, immediate |
| **Sign In with LinkedIn using OpenID Connect** | `openid`, `profile`, `email` | Self-serve, immediate |
| **Community Management API** | `r_organization_social`, `w_organization_social`, `r_organization_social_feed`, `w_organization_social_feed`, `rw_organization_admin`, `r_organization_admin`, `r_organization_followers` | **Vetted.** Apply on the Products tab → Development tier, then Standard tier |

Community Management is the only legitimate route to Page publishing, comments, reactions and Page analytics for client Pages. It is for **registered legal organizations, commercial use only**, needs a **business email** (personal addresses fail vetting), and the Company Page must be associated with the app and verified by a Page super admin.

### 5.3 Credentials and redirect URL

- **Auth tab** → **Client ID** and **Primary Client Secret** → `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
- **Redirect URLs**: must be absolute **HTTPS**, no query parameters, no `#`.
  - `https://hub.example.com/api/oauth/linkedin/callback`
  - `http://localhost:3000/api/oauth/linkedin/callback` — LinkedIn documents HTTPS only. Many developers successfully register `http://localhost` URLs, but do not rely on it: if the dashboard rejects the URL, use an HTTPS tunnel for local OAuth. **Uncertain — verify in the dashboard.**

### 5.4 Scopes, tokens, approval

- Request: `openid profile email w_member_social r_organization_social w_organization_social r_organization_social_feed w_organization_social_feed rw_organization_admin r_organization_followers`.
- All are **member (3-legged)** permissions: every user must consent to **all** requested scopes — LinkedIn does not allow partial grants, so don't over-request.
- Access tokens: **60 days**. Refresh = repeat the authorization flow while the user is still logged in; **programmatic refresh tokens are partner-only**. `r_member_social` is a **closed** permission.
- Every REST call needs a **`LinkedIn-Version: YYYYMM`** header. **Marketing version `202511` sunsets 16 November 2026** — build on `202601`+ (current docs use `li-lms-2026-10`).

### 5.5 Tier ladder (this is the real gate)

| Tier | Limits | How |
|---|---|---|
| Development | 500 calls/app/24h, 100 calls/member/24h, batch-get disabled, social-action webhook push disabled, must integrate within 12 months | Access-request form |
| Standard | No restrictions, production use | Second form + **screen recording** + **test credentials** |

The Standard-tier screencast must show: full OAuth consent for the Page, publishing a Page post, a member's comment displayed in your app, which commenter profile fields you display, and any other member personal data used. Rejection means starting over with a **new app**.

### 5.6 LinkedIn gotchas

1. **Page association is checked at review.** The app must be verified by a Page super admin from the same organisation, with a matching verified domain/website.
2. **Roles matter at runtime.** Page writes need `ADMINISTRATOR` (or `DIRECT_SPONSORED_CONTENT_POSTER` / `RECRUITING_POSTER` depending on action). Page access cannot be granted via API.
3. **Comments and reactions are separate APIs**: `POST /rest/socialActions/{urn}/comments` (nested via `parentComment`), `POST /rest/reactions?actor=...` with `root` = post **or comment** URN. So comment likes are supported for Pages.
4. **No general webhooks for comments at Development tier** — plan polling with `Last-Modified`/ETag and stay inside 500 calls/day or the integration will look broken.
5. **URN plumbing.** Everything is `urn:li:organization:...`, `urn:li:share:...`, `urn:li:comment:(...)`. Encode URNs in query strings; `Restli` errors usually mean encoding, not permissions.
6. **Community Management is not self-serve.** If LinkedIn declines, there is no workaround — fall back to assisted mode for LinkedIn.

---

## 6. X

### 6.1 Where to create

1. **https://console.x.com** (the Developer Console) — sign in, accept the Developer Agreement, complete the profile.
2. **Create App** → name, description, use case.
3. In the app's **User authentication settings**, enable **OAuth 2.0**, choose app type **Web App** (confidential client → you get a Client Secret), and add the callback URLs.

### 6.2 Credentials and callback

- **Keys and tokens** → **Client ID** and **Client Secret** → `X_CLIENT_ID` / `X_CLIENT_SECRET`. Shown **once**; regenerating invalidates the old pair.
- **Callback URLs** (max 10, exact match):
  - `http://127.0.0.1:3000/api/oauth/x/callback`
  - `https://hub.example.com/api/oauth/x/callback`
- **X explicitly requires `127.0.0.1`, not `localhost`, for local development**; `https://` in production.

### 6.3 Scopes

Request: `tweet.read tweet.write users.read offline.access like.write media.write tweet.moderate.write`.

- `offline.access` is mandatory for a refresh token — without it the access token dies after **2 hours**.
- `tweet.moderate.write` hides/unhides replies (useful for the moderation queue).
- Auth code is valid **30 seconds**; exchange immediately. PKCE is required, so generate `code_verifier` / `code_challenge` (S256).

### 6.4 Pricing and limits (changed in 2026)

X no longer sells subscription tiers for self-serve access. It is **pay-per-use credits**, purchased in the console:

| Action | Cost |
|---|---|
| Post create | **$0.015** / request |
| Post create **containing a URL** | **$0.20** / request |
| Post read | $0.005 / resource |
| User read | $0.010 / resource |
| Like create / user interaction | $0.015 / request |
| Owned reads (your own account data) | $0.001 / resource |

- No free write allowance. New paying accounts can earn **$20** on first credit purchase and up to **$50** matched on first auto-recharge ($70 total, expiring in 3 months, granted since 13 Oct 2026 only after a first purchase).
- Reads are deduplicated within a 24h UTC window; pay-per-use is capped at 3M post reads/month.
- **Set a spending limit** in the console before the first client campaign. A thread with links is not cheap: 5 posts × $0.20 = $1 per thread.
- Webhooks (Activity API) are billed **per event** and need HTTPS + CRC validation.

### 6.5 X gotchas

1. **"Free tier" is gone.** If the plan needs a fixed monthly budget, model cost per post — especially the URL surcharge.
2. **Replies and first comments are just posts** with `reply.in_reply_to_tweet_id`. Post the root, then self-reply for the "first comment".
3. **Comment likes** = `like.write` on the reply's post ID — supported.
4. **Media upload** needs `media.write`; large video is chunked and slow — do it before scheduling.
5. **No comment listings without reads.** Fetching replies costs read credits; cache aggressively and rely on webhooks where possible.
6. **Protected accounts** never deliver Activity API events.

---

## 7. TikTok

### 7.1 Where to create

1. **https://developers.tiktok.com/signup** — create a developer account, then create/join an **Organization** (strongly recommended for real apps).
2. **https://developers.tiktok.com/apps** → **Connect an app** → choose the owning organization.
3. On the app page: **App details** (icon 1024×1024, category, description), **Platforms** (Web/Desktop need your website URL), **Products** (Add products → **Login Kit**, **Content Posting API**, optionally **Display API**), **Scopes** (Add Scopes).

### 7.2 Credentials and redirect URI

- **App details → Credentials**: **Client key** + **Client secret** → `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`.
- **Login Kit → Redirect URI** rules (from TikTok's docs): max 10, < 512 chars, **absolute**, **must begin with `https`**, static (no parameters), no `#`.
  - Production: `https://hub.example.com/api/oauth/tiktok/callback`
  - Local: TikTok documents no localhost exception → use an **HTTPS tunnel** and register `https://<tunnel-host>/api/oauth/tiktok/callback`. **Uncertain whether the dashboard accepts `http://localhost` — try it, but assume it will not.**
- Before submitting for review you must **verify URL ownership** for the Terms of Service URL, Privacy Policy URL and Web/Desktop URL (URL properties → Verify properties, by domain or URL prefix).

### 7.3 Scopes

| Scope | Use | Gate |
|---|---|---|
| `user.info.basic` | Default with Login Kit; open ID, avatar, display name | Auto |
| `user.info.profile` | Bio, profile link, verified status | Review |
| `user.info.stats` | Followers/likes/video counts | Review |
| `video.list` | List the account's public videos | Review |
| `video.upload` | Upload as **draft** for the creator to finish in-app | Review |
| `video.publish` | **Direct Post** to the profile | Review + Content Posting API audit |

### 7.4 The audit (read this before promising TikTok)

TikTok's Content Sharing Guidelines are explicit about unaudited clients:

- Content is forced to **`SELF_ONLY`** (private) viewing; the account must be set to private while posting.
- **Max 5 users posting per 24h** across the client.
- After audit: still a creator cap based on your stated estimates, and roughly **15 posts/day per creator**, shared across all clients.

And the intended-use rule, quoted:

> "API Clients must not be limited to test applications and should be intended for a wide audience, not limited to internal groups/private use. Not acceptable: A utility tool to help upload contents to the account(s) you or your team manages."

That is a direct hit on an **internal agency tool**. Expect the `video.publish` audit to be **rejected** for a private, internal-only app. Plan accordingly:

- Treat TikTok as **assisted mode** (post kit + deep link + "mark posted"), or
- Ship `video.upload` **draft** flow (creator finishes in the app — still needs scope approval), or
- Build a genuinely public, multi-tenant product story before applying.

Other TikTok rules that shape the UI: you must show the creator's nickname, fetch `creator_info` before every post, let the user pick privacy **with no default**, require explicit consent for commercial content disclosure, preview the content, and never add watermarks/promotional text.

### 7.5 TikTok gotchas

1. **No comment API, no organic analytics API.** Comment replies, likes and analytics are **assisted only** — nothing official exists.
2. **Sandbox ≠ Content Posting API.** Sandbox mode "does not offer access to Content Posting API for public videos"; it allows up to 10 target users.
3. **Review needs a demo video** (up to 5 videos, ≤50 MB each) showing the end-to-end flow, plus a written explanation per product/scope.
4. **Statuses**: Draft → In review → Live / Not approved. Approved changes require a new revision and re-review.
5. **Media must be pulled from a verified domain** (`PULL_FROM_URL`) — verify the domain/prefix in URL properties, or use `FILE_UPLOAD` for local files. Public photos require `PULL_FROM_URL`.

---

## 8. What works immediately vs what must wait

| Platform | Works today (no approval) | Needs approval / verification |
|---|---|---|
| Meta | App creation, App ID/secret, Login for Business config, testing with Pages/IG where you have a role, webhook endpoint testing, data-deletion callback | Advanced access (App Review) + Business Verification for client assets; IG `comments` webhooks in production |
| Google/YouTube | OAuth client, upload + comments with **your own** channel, Testing status with ≤100 test users (7-day refresh tokens) | Verification for external users at scale; quota extension audit; no comment-like API ever |
| LinkedIn | App + Client ID/secret, member posting, OAuth flow, manual token generator | Community Management Development tier (form), then Standard tier (form + screencast + credentials) for Page publishing/comments |
| X | Everything that the credits pay for: post, reply, like, media, read — no review step | Only spend: buy credits, set a spending limit; Activity API webhooks per-event billing |
| TikTok | Sandbox configuration, Login Kit with test users, `SELF_ONLY` posting for up to 5 users | Content Posting audit for public posting — high rejection risk for internal tools |

---

## 9. Do this today (ordered)

1. **Meta**: App settings → Basic → copy App ID/secret into `.env.local`. Fill privacy policy, terms, data-deletion URL, 1024 icon, category, purpose = **Clients**.
2. **Meta**: add the **Manage everything on your Page** use case (+ Instagram product) and remove optional permissions you don't need.
3. **Meta**: create the **Facebook Login for Business** configuration with the permission list in §3.4; save the Config ID.
4. **Meta**: add both redirect URIs; connect your business portfolio and **start Business Verification** (slowest step — start now).
5. **Google**: create project → enable YouTube Data API v3 → External consent screen in Testing with 3–4 test users → Web OAuth client with both redirect URIs → copy IDs.
6. **LinkedIn**: create app, attach the agency Company Page, add **Share on LinkedIn** + **Sign In with OpenID Connect**, add redirect URLs, copy Client ID/secret. Then **apply for Community Management Development tier** (business email, legal name, address, privacy policy).
7. **X**: create app in console.x.com, enable OAuth 2.0 Web App, add `127.0.0.1` + production callbacks, copy Client ID/secret, **buy $10–20 of credits and set a spending limit**.
8. **TikTok**: create app under an organization, add Login Kit + Content Posting API, add scopes, verify ToS/Privacy/website URLs, register the HTTPS tunnel callback, then submit a demo video for review (expect pushback — keep assisted mode as the fallback).
9. **All**: stand up one HTTPS webhook endpoint (Meta + Instagram at minimum) behind a tunnel, with signature validation and dedupe.
10. **Verify**: log in once per platform with a real client test asset, confirm the returned scopes match the table, and store the encrypted token.

---

## 10. Security rules (non-negotiable)

1. **Never commit secrets.** `.env.local` is already in `.gitignore`; keep it that way. No secrets in `NEXT_PUBLIC_*`, client components, `next.config.ts`, logs, screenshots, or support tickets.
2. **One env file per environment.** Separate apps per platform environment where the provider allows it (X explicitly recommends dev/staging/prod apps).
3. **Encrypt tokens at rest** with `APP_ENCRYPTION_KEY`; store the refresh token and expiry, never the user's password.
4. **Rotate on exposure, and on a schedule.** Meta: reset App Secret (invalidates all tokens). Google: create a new client secret and delete the old. LinkedIn: regenerate Primary Client Secret (keep a secondary during rotation). X: regenerate keys (old ones die). TikTok: regenerate client secret.
5. **Least privilege.** Request only the permissions in the tables above; drop `instagram_manage_messages`, ads scopes and `publish_video` until a feature needs them. LinkedIn grants are all-or-nothing, so trim the list before asking users.
6. **OAuth hygiene**: random `state` bound to the session, PKCE for X, exact redirect match, short-lived auth codes, server-side code exchange only.
7. **Webhook hygiene**: verify `X-Hub-Signature-256` (Meta) / request signatures, respond 200 fast, dedupe by event ID, keep an append-only event log.
8. **Data minimisation and deletion**: honour Meta's data-deletion callback, delete revoked-token data promptly, and never use client data to train anything.

---

## 11. Recent changes worth knowing (2025 → Nov 2026)

| Platform | Change | Impact |
|---|---|---|
| Meta | App types reduced to **Consumer / Business**; new apps built from **use cases** | Can't switch type; use cases can't be removed — choose carefully once |
| Meta | Use-case apps have **no Development/Live toggle**; they use Standard/Advanced access + a **Go live** checklist | "Switch to Live mode" advice in older tutorials is wrong for new apps |
| Meta | **Instagram API with Unified Login** is now the recommended setup for new integrations; new IG features ship only there | Decide now; migrating later is real work |
| Meta | Advanced Access **requires Business Verification** | Budget days–weeks; blocks client-facing launch |
| LinkedIn | **Marketing 202511 sunsets 16 Nov 2026**; versioned APIs with `LinkedIn-Version` header | Pin `202601`+ immediately; unversioned calls fail |
| LinkedIn | Community Management split into **Development** then **Standard** tier, both vetted | Plan for two reviews + screencast |
| X | Subscriptions replaced by **pay-per-use credits** | No free write tier; URL posts cost **$0.20** each |
| X | Local callbacks must use **`127.0.0.1`**, not `localhost` | Common `redirect_uri` mismatch |
| Google | OAuth consent screen is now the **Google Auth Platform** (Branding/Audience/Clients) | Menu names differ from older guides |
| Google | YouTube default quota restructured to **100 uploads/day + 10,000 units/day** | Better than the old ~6 uploads/day; still needs an audit for scale |
| TikTok | Photo posting, URL-ownership verification, Sandbox | More setup steps before review |

---

## 12. Open questions / uncertain labels (verify in the dashboards)

1. **Exact Instagram use-case wording** in Meta's app-creation wizard. Meta's "Available use cases" table is rendered client-side and could not be read; the guide uses **"Manage everything on your Page"** (documented verbatim) and says "look for an Instagram use case, possibly labelled *Instagram* or *Manage messaging and content on Instagram*".
2. **Whether Meta accepts `http://localhost` redirect URIs** for this app. Documented requirement is HTTPS; localhost is commonly accepted in development. If it's rejected, use an HTTPS tunnel and update `META_REDIRECT_URI`.
3. **Whether LinkedIn and TikTok accept `http://localhost` redirect URLs.** Both document HTTPS only. Treat the tunnel as the reliable path; this is the single most likely blocker for local OAuth on those two.
4. **YouTube private-lock for unaudited uploads.** Widely reported, not confirmed on the pages read in Nov 2026. Test one upload and check its privacy status before promising public publishing.
5. **Instagram comment likes.** No endpoint in the official comment-moderation docs; treated as unsupported.
6. **TikTok audit outcome for an internal agency tool.** TikTok's intended-use rules explicitly exclude "a utility tool to help upload contents to the account(s) you or your team manages" — assume rejection and keep assisted mode.

---

## 13. Sources

**Meta**
- Create an App (use cases, app creation steps, business portfolio): https://developers.facebook.com/docs/development/create-an-app/
- App Types (Consumer/Business, access levels, no modes for Business): https://developers.facebook.com/docs/development/create-an-app/app-dashboard/app-types
- App dashboard (use-case vs app-type dashboards, Go live, products): https://developers.facebook.com/docs/development/create-an-app/app-dashboard
- App categories: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/app-categories
- Basic settings (App ID, App Secret, go-live fields): https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings
- Facebook Login for Business (config_id, supported permissions, token types): https://developers.facebook.com/docs/facebook-login/facebook-login-for-business
- Manual login flow (OAuth dialog, code exchange, deauth): https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
- Access levels (Standard vs Advanced, Business Verification): https://developers.facebook.com/docs/graph-api/overview/access-levels
- App Review overview: https://developers.facebook.com/docs/app-review
- App Review submission walkthrough (icon, screencasts, app purpose): https://developers.facebook.com/docs/app-review/submission-guide
- Data Deletion Request Callback (HTTPS, signed_request, response shape): https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
- Instagram Platform overview (three setups, access levels, Page tasks): https://developers.facebook.com/docs/instagram-platform/overview
- Instagram API with Unified Login (recommended for new integrations): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-unified-login
- Instagram API with Facebook Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
- Instagram content publishing (containers, 100 posts/24h, carousels): https://developers.facebook.com/docs/instagram-platform/content-publishing
- Instagram comment moderation (reply/hide/delete; no like endpoint): https://developers.facebook.com/docs/instagram-platform/comment-moderation
- Instagram webhooks setup (HTTPS, TLS, subscribed_apps, mTLS): https://developers.facebook.com/docs/instagram-platform/webhooks/setup
- Instagram webhook fields and permissions: https://developers.facebook.com/docs/instagram-platform/webhooks/fields
- Pages API (permissions, posts, comments, webhooks): https://developers.facebook.com/docs/pages-api
- Pages posts guide (feed/photos, scheduling window): https://developers.facebook.com/docs/pages-api/posts

**Google / YouTube**
- OAuth 2.0 for web server apps (client creation, scopes, redirect rules): https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
- OAuth app state overview (Testing/Published, 100-user cap, 7-day refresh tokens): https://developers.google.com/identity/protocols/oauth2/production-readiness/overview
- Using OAuth 2.0 to access Google APIs (refresh token expiry/limits): https://developers.google.com/identity/protocols/oauth2
- Upload a video: https://developers.google.com/youtube/v3/guides/uploading_a_video
- Quota and compliance audits (100 uploads/day, 10,000 units/day, audit form): https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- YouTube API Services – Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- OAuth verification (sensitive/restricted scopes): https://support.google.com/cloud/answer/13463073

**LinkedIn**
- Marketing Quick Start (app creation, Products, tiers, tools): https://learn.microsoft.com/en-us/linkedin/marketing/quick-start
- Increasing Access (permission list, Development/Standard tier limits): https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- Community Management overview: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
- Community Management App Review (vetting, screencast requirements): https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- 3-legged OAuth (redirect URL rules, 60-day tokens): https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- Key concepts / Page roles: https://learn.microsoft.com/en-us/linkedin/marketing/getting-started
- Comments API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api
- Reactions API (reactions on comments): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/reactions-api

**X**
- Developer apps (credentials, app types, callback rules incl. 127.0.0.1): https://docs.x.com/fundamentals/developer-apps
- Getting access (console.x.com, credential types): https://docs.x.com/x-api/getting-started/getting-access
- Pay-per-use pricing (per-endpoint costs, URL surcharge, spending limits): https://docs.x.com/x-api/getting-started/pricing
- Free credit incentives (Oct 2026 rules): https://docs.x.com/x-api/getting-started/free-credits
- OAuth 2.0 authorization code with PKCE (scopes, 30s code, 2h token): https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- OAuth 2.0 overview (confidential vs public clients): https://docs.x.com/fundamentals/authentication/oauth-2-0/overview
- Activity API (webhooks, event types, billing): https://docs.x.com/x-api/activity/introduction

**TikTok**
- Register your app (credentials, products, URL verification, review): https://developers.tiktok.com/doc/getting-started-create-an-app
- Login Kit for Web (redirect URI restrictions, `https` required): https://developers.tiktok.com/doc/login-kit-web
- Scopes overview / reference (`video.publish`, `video.upload`, `user.info.*`): https://developers.tiktok.com/doc/scopes-overview · https://developers.tiktok.com/doc/tiktok-api-scopes
- Content Posting API – Direct Post (unaudited = private): https://developers.tiktok.com/doc/content-posting-api-get-started
- Content Sharing Guidelines (5-user cap, SELF_ONLY, intended-use rules, required UX): https://developers.tiktok.com/doc/content-sharing-guidelines
- Sandbox (no public Content Posting): https://developers.tiktok.com/doc/add-a-sandbox
