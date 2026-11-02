# Free alternatives for publishing and engagement — honest comparison

**Status:** research note, November 2026. Verified against vendor pages where a fetch succeeded; anything I could not read on the vendor's own page is labelled **verify before paying**. No code was changed.

**Scope:** the six channels the hub supports — Facebook, Instagram, TikTok, X, LinkedIn, YouTube — for posting, first comment, comment replies, comment likes, analytics and webhooks, with the goal of *not* building and maintaining six OAuth app-review stacks.

---

## Bottom line first

There is **no free, unrestricted, official API that covers all six platforms**. Not from Meta, Google, LinkedIn, X or TikTok, and not from any reseller. The unified APIs are not a loophole in the rules — they are companies that already passed the reviews and let you use *their* approved apps. You skip the paperwork, not the platform's terms, quotas or content rules.

What actually exists:

| Path | Free? | All six? | Comments/engagement? | Verdict |
|---|---|---|---|---|
| Direct platform APIs | Partly (Meta, YouTube, LinkedIn, TikTok free but gated; X metered) | Yes, one integration each | Yes, best depth | Cheapest cash, most engineering + approvals |
| Unified API (Upload-Post, Ayrshare, Zernio, Post Bridge) | Small free tiers or trial | Yes | Varies — Upload-Post and Zernio do comments | **Best fit for this hub** |
| Self-hosted scheduler (Postiz, Mixpost) | Software free, hosting not | Yes | Weak | Still needs *your* developer apps — solves nothing here |
| Automation (Zapier/Make/n8n/Pabbly) | Thin free tiers | No, not all six reliably | Almost none | Wrong tool for a publishing hub |
| Browser automation / private APIs | "Free" | Yes | Yes | **Not compliant. Do not.** |

---

## Master matrix

Legend: ✅ supported · ⚠️ partial/paid tier/limited · ❌ not supported · ? unverified.

| Option | FB | IG | TT | X | LI | YT | Posting | First comment | Replies | Comment likes | Analytics | Webhooks | Free tier | Paid entry (US$/mo) | Vendor handles approvals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Upload-Post** | ✅ | ✅ | ✅ (paid) | ✅ | ✅ | ✅ | ✅ | ✅ (as a comment) | ✅ IG/FB/YT/LI/TT/X | ⚠️ TikTok, Facebook | ✅ | ✅ | 10 uploads/mo, 2 profiles, no TikTok | $24 ($16 annual) | ✅ |
| **Ayrshare** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (IG since 2026, FB) | ✅ | ✅ Launch+ | ❌ none; 28-day Launch trial | $149 | ✅ |
| **Zernio** | ✅ | ✅ | ✅ | ✅ (+X fees) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2 accounts free | $6/account (3–10 accts) | ✅ |
| **Post Bridge** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ? | ❌ | ❌ | ⚠️ beta | ? | 5 posts total | $39 (15 accounts) | ✅ |
| **Buffer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Essentials+ | ⚠️ inbox, not API | ❌ | ✅ post metrics | ❌ | 3 channels, 10 queued/channel, API 1k req/channel | $5/channel | ✅ |
| **Publer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Professional+ | ✅ | ? | ✅ Business | ? | 3 accounts, no X, no API | $10 (1 account, Business for API) | ✅ |
| **Postiz (cloud)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ limited | ❌ | ✅ | ✅ | 7-day trial | $29 (5 channels) | ✅ |
| **Postiz (self-host)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ | Software free | Hosting only | ❌ **your apps** |
| **Mixpost (self-host)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ⚠️ | ? | Lite free | Pro one-time licence | ❌ **your apps** |
| **Direct APIs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ IG/FB/X | ✅ | ✅ self-built | Meta/Google/LI/TT free, X metered | $0 + X $0.01/post | ❌ you are the vendor |

---

## Unified social media APIs

### Upload-Post — the pragmatic primary

| Attribute | Detail |
|---|---|
| Coverage | Facebook, Instagram, TikTok, X, LinkedIn, YouTube + 16 more (Threads, Pinterest, Bluesky, Reddit, Telegram…) |
| Posting | One REST call (`POST /api/uploadposts/upload`), video/photo/text/document, scheduling |
| First comment | Via the comments endpoint after publish, not a first-class "first comment" field — one extra call |
| Comment replies | ✅ `comments/create` — Instagram, Facebook, YouTube, LinkedIn, TikTok, X, Threads, Bluesky |
| Comment likes | ⚠️ `comments/action` supports `like`/`unlike` on TikTok and Facebook; Instagram actions are hide/unhide/enable/disable only; YouTube hide/hold |
| Analytics | ✅ account + per-post analytics; TikTok audience/benchmark insights |
| Webhooks | ✅ post status, comments, DMs |
| Free tier | 10 uploads/month, 2 profiles, full API, no card. **TikTok is excluded from Free.** |
| Paid entry | Basic $24/mo or $16/mo billed yearly — 5 profiles, unlimited uploads, TikTok included |
| Approvals | Vendor holds the approved apps; you never file a Meta/TikTok review |
| Key restrictions | Free tier can't touch TikTok; 5-profile cap on Basic; comment reply needs `post_id` plus `comment_id` on TikTok; X link-posts need the paid X Links add-on; some per-platform endpoints require a *recent* connection (capabilities are granted at connect time) |
| Why it fits | API key auth (no white-label OAuth build), comments + analytics + webhooks in one vendor, cheapest real entry price in this comparison |
| Source | https://www.upload-post.com/pricing/ · https://docs.upload-post.com/llm.txt · https://docs.upload-post.com/api/reference |

**Caveats:** LinkedIn *company page* posting depends on the vendor's LinkedIn app permissions — confirm for your client pages before paying. Instagram requires Business/Creator accounts. Free-tier "2 profiles" means two clients, not two accounts.

### Ayrshare — the mature, expensive incumbent

| Attribute | Detail |
|---|---|
| Coverage | 14+ networks including all six |
| Posting | ✅ with scheduling, auto-schedule, threads |
| First comment | ✅ (post `firstComment` option) |
| Comment replies | ✅ Comments API (read, reply, moderate) |
| Comment likes | ✅ Facebook, Instagram (Instagram comment likes since 2026 per hub skill; verify for your app) |
| Analytics | ✅ post + profile analytics; deeper on Launch/Business |
| Webhooks | ✅ on Launch and above |
| Free tier | **None.** The old $20/20-post Basic plan is closed to new sign-ups. 28-day free trial gives Launch-level access |
| Paid entry | Premium ≈$149/mo (1 profile, up to 14 accounts); Launch ≈$299/mo (10 profiles, 140 accounts); Business from ≈$599/mo |
| Approvals | ✅ vendor |
| Key restrictions | Only plan you can trial is the *most expensive* one; monthly post quota per profile, **failed posts count**, running out returns code 106 until the 1st of the month; webhooks gated to Launch+ |
| Source | https://www.ayrshare.com/docs/help-center/product/what-is-the-basic-plan-post-limit · https://www.ayrshare.com/docs/help-center/product/how-many-posts-and-api-calls-can-i-make · https://www.ayrshare.com/docs/multiple-users/business-launch-overview · pricing figures read from a competitor's teardown of ayrshare.com/pricing (29 Sep 2026): https://www.upload-post.com/ayrshare-pricing/ — **verify before paying** |

**Verdict:** best-documented comment/moderation API, but $149/mo ≈ ₦220k/mo at ~₦1,500/$ is not a small-agency entry point.

### Zernio — pay-per-account, feature-complete, newest

| Attribute | Detail |
|---|---|
| Coverage | All six + Threads, Reddit, Pinterest, Bluesky, Snapchat, Google Business, blogs, messaging |
| Posting / first comment | ✅ unlimited posts, threads, first comment |
| Replies / likes | ✅ comments + reviews API, inbox API |
| Analytics / webhooks | ✅ both, unlimited |
| Free tier | 2 connected accounts free, no card, "every feature included" |
| Paid entry | $6/mo per account for 3–10 accounts; $3/account for 11–100 |
| Approvals | ✅ vendor |
| Key restrictions | **X is passed through at X's own rates** (separate metered cost); "every feature included" is a marketing claim — verify comment *likes* per platform; younger vendor (see rebrand page); a 2-account free tier covers one client, not an agency |
| Sources | https://zernio.com/pricing · https://zernio.com/blog/pay-per-account-pricing |

**Verdict:** the cheapest credible *all-features* API at small scale, and the best structural fit if the agency grows past 10 accounts. Too new to be the only bet.

### Post Bridge — cheap, publishing-only

| Attribute | Detail |
|---|---|
| Coverage | X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Bluesky, Threads, Pinterest, Google Business |
| Posting | ✅ scheduled + instant, unlimited on paid |
| First comment / replies / likes | ❌ no comment endpoints found in product or FAQ |
| Analytics | ⚠️ beta |
| Webhooks | ? not documented |
| Free tier | 5 posts total — and **one post to 4 platforms counts as 4** |
| Paid entry | Marketer $39/mo (15 accounts), Operator $99/mo (99 accounts, +$1/account) |
| Approvals | ✅ vendor |
| Key restrictions | No engagement layer; beta analytics; single-founder product |
| Source | https://www.post-bridge.com/pricing |

### Buffer — good product, wrong shape for this hub

| Attribute | Detail |
|---|---|
| Coverage | All six + Threads, Pinterest, Google Business, Bluesky, Mastodon, Substack |
| Posting | ✅ |
| First comment | ⚠️ paid only (Essentials and up) |
| Replies / likes | ⚠️ Community inbox in the app, **no comment endpoints in the public API reference** |
| Analytics | ✅ post metrics via API |
| Webhooks | ❌ |
| Free tier | 3 channels, 10 scheduled posts per channel, API access with 1 key at 1,000 requests/channel/month, community inbox |
| Paid entry | $5/channel/mo (Essentials, annual) |
| Approvals | ✅ vendor |
| Key restrictions | Per-channel pricing adds up across six channels; no comment automation; no webhooks; API is GraphQL-first |
| Source | https://buffer.com/pricing · https://developers.buffer.com/ |

### Publer — API is a Business-plan feature

| Attribute | Detail |
|---|---|
| Coverage | All six + Threads, Pinterest, Google Business, Bluesky, Mastodon |
| Posting | ✅ |
| First comment | ✅ follow-up comments from Professional |
| Replies | ✅ engagement inbox |
| Analytics | ✅ advanced analytics on Business |
| Free tier | 3 social accounts, X excluded, no API |
| Paid entry | Business from $10/mo for 1 account (API requires Business or Enterprise, account in good standing) |
| Approvals | ✅ vendor |
| Key restrictions | **No API on Free or Professional** — the API is the expensive part; per-account pricing |
| Sources | https://publer.com/help/en/article/what-is-included-in-publer-business-1c57hsq/ · https://publer.com/help/es/article/1wjeuzy/ |

### Hootsuite / Later / Metricool / SocialPilot — not a realistic route

These are suites whose APIs are partner/enterprise arrangements, not self-serve developer products. I could not retrieve a public developer-pricing page for any of them in this pass. Treat all four as **verify before paying** and out of scope for a small agency:

- **Hootsuite** — API access is a partner/enterprise agreement; retail plans start around $99/mo and do not include API keys.
- **Later** — public API is limited to the influencer/Later Influence side; no self-serve publishing API for the social scheduler.
- **Metricool** — API access is tied to its Advanced tier and is read/reporting-oriented; posting coverage is narrower than the six.
- **SocialPilot** — no broadly documented public API; agency pricing, not developer pricing.

If the owner wants one of these, the honest answer is "ask their sales team for API access in writing, with the price" — not "it's on the pricing page".

---

## Open-source self-hosted schedulers

Both are good software and both **still require your own platform developer apps**. Self-hosting moves the OAuth app, the review and the token storage onto *you*; it does not remove them.

### Postiz

| Attribute | Detail |
|---|---|
| Coverage | 30+ channels including all six, plus WordPress, Medium, Dev.to, Nostr, etc. |
| Posting | ✅ calendar, queue, cross-posting, repeated posts |
| First comment | ✅ ("Post comments" feature) |
| Replies | ⚠️ limited; not a full engagement inbox |
| Comment likes | ❌ |
| Analytics | ✅ |
| Webhooks | ✅ on cloud paid plans |
| Cloud pricing | Standard $29/mo (5 channels), Team $39/mo (10), Pro $49/mo (30); 7-day trial |
| Self-host cost | Software free (AGPL); you pay hosting, Postgres, Redis, Temporal, storage |
| Approvals | ❌ **self-host requires your own developer apps for every provider** — documented per-provider key setup |
| Key restrictions | Self-host operations (queues, workers, upgrades) become your job; cloud is per-channel priced; some channels need extra paid services |
| Sources | https://postiz.com/pricing · https://docs.postiz.com/self-host/providers/overview |

### Mixpost

| Attribute | Detail |
|---|---|
| Coverage | Facebook, Instagram, Threads, X, LinkedIn, TikTok, YouTube, Pinterest, Bluesky, Mastodon, Google Business |
| Posting | ✅ scheduling, calendar, queue |
| First comment | ⚠️ limited |
| Replies / likes | ❌ no real comment-management layer |
| Analytics | ⚠️ basic |
| Free tier | Mixpost Lite (free self-hosted); Pro/Enterprise are paid licences |
| Approvals | ❌ self-host requires your own apps. Their own docs say it plainly: on Mixpost **Cloud** "the developer apps and provider keys are already in place… no app review to wait for" — which is exactly what self-hosting does *not* give you |
| Key restrictions | PHP/Laravel stack, not Node; comments/engagement thin; one-time licence cost + hosting + your time on app reviews |
| Source | https://docs.mixpost.app/services/ |

**Blunt conclusion:** self-hosting a scheduler to escape app reviews is backwards. You end up owning the reviews *and* the servers. Self-host only if you want to own the stack for other reasons (data residency, white-label, no per-channel fees).

---

## Automation platforms

None of these can post to all six platforms on a free plan, and none is a substitute for a publishing API inside your product.

| Platform | Free tier | Can it post to all six free? | Real limits |
|---|---|---|---|
| **Zapier** | ~100 tasks/mo, 2-step Zaps on Free (**verify current terms**) | No | TikTok and Instagram actions are restricted/absent in places; X often needs a paid Zapier plan or a paid X API; 2-step limit makes "post then comment then log" impossible without a paid plan; every run burns tasks |
| **Make** | ~1,000 operations/mo, limited active scenarios (**verify**) | No | Instagram/Facebook via Graph API need a connected app; TikTok coverage is inconsistent; scenario complexity eats operations fast |
| **n8n** | Community Edition self-hosted is free and unlimited | Not out of the box | Native nodes exist for Facebook, LinkedIn, X, YouTube; TikTok needs raw HTTP + your own approved app; n8n's bundled OAuth apps are for its own product, not yours; self-hosting is another service to run |
| **Pabbly Connect** | No real free plan (trial) | No | Cheap (~$19–$49/mo tier) but same coverage gaps; per-task pricing; not something to embed in a product |

Even where automation works, it is the wrong seam: the hub would be orchestrating a third-party orchestrator, with no capability map, no idempotency, no comment sync and no clean path to analytics. Automations are a fine **glue** for internal notifications; they are not the publisher.

Sources: https://zapier.com/pricing · https://www.make.com/en/pricing · https://n8n.io/pricing/

---

## Browser automation and unofficial private APIs — why not

Tempting because it looks free and unrestricted. It is a trap:

1. **It breaks the platform terms you agreed to.** Meta, TikTok, LinkedIn and X all prohibit automated access outside their APIs. "It works today" is not permission.
2. **Account bans are the real cost.** Agency accounts and client Pages get restricted, sometimes permanently, with no appeal path and no way to recover years of audience. One ban costs more than a decade of Ayrshare.
3. **It is fragile by design.** Every UI change, A/B test, captcha, 2FA prompt or new anti-bot check breaks the flow. You inherit 24/7 on-call for six platforms you don't control.
4. **Credential handling is indefensible.** Password sharing or session-cookie storage for client accounts is a breach waiting to happen and an immediate deal-breaker in any agency contract or client security review.
5. **It cannot be sold or handed over.** No client will accept "we log into your Instagram with your password".
6. **It quietly poisons the hub's own design.** Assisted mode, approvals, capability maps and audit logging all assume official, revocable, per-account authorisation.

**Recommendation: do not.** If the owner wants zero approvals today, assisted mode is the compliant answer (see §5).

---

## Direct answers

### 1. Is there a genuinely free, unrestricted official API for all six platforms?

**No.** Each platform gates different things, and the gates are policy, not pricing:

- **Meta (Facebook + Instagram):** free, but advanced permissions need **Business Verification + App Review** (plus privacy policy, data-deletion callback, screencast). Standard access only works for people with a role on your app — fine for one client, useless for an agency.
- **YouTube:** free, but 10,000 quota units/day and a hard cap of 100 `videos.insert` calls/day; uploads from unverified API projects are restricted (widely reported as private-only until audit — **verify current behaviour** before relying on it).
- **LinkedIn:** free, and `w_member_social` for **personal profiles** is self-serve via the "Share on LinkedIn" product. **Company pages** need Community Management API / Marketing Developer Platform approval.
- **X:** no free tier now. Pay-per-use credits — **$0.01 per created post**, $0.005 per post read, $0.01 per user lookup, with $20 + up to $50 in starter credits. Cheap in cash, but it *is* paid.
- **TikTok:** free to apply, but `video.publish` needs approval **and** the client must pass a Content Posting API audit — **all content from unaudited clients is restricted to private viewing**.

So "free and unrestricted" is not a thing anyone can honestly sell. What unified APIs sell is *their* approvals, under *their* quotas, with *their* markup.

### 2. Cheapest compliant path for this agency

Two honest options, depending on whether you count engineering time as free:

**A. Self-built direct integrations (cheapest cash, most work):**
Meta free + YouTube free + LinkedIn personal free + TikTok free-but-audited + X at $0.01/post. Cash cost for a typical month — say 60 posts, 300 comments read, a few replies — is **under $10/month on X and $0 everywhere else**. But you build and maintain five OAuth flows, five token refreshers, five media pipelines, Meta business verification and App Review, a TikTok audit, and a YouTube compliance audit. Realistically weeks of work plus annual re-certification.

**B. One unified API (cheapest *total* cost):** **Upload-Post Basic at $24/mo ($16 annual)** covers all six with unlimited posts, with comments, analytics and webhooks, and no reviews. That is the cheapest compliant path that actually ships this quarter.

**Do not** pick Ayrshare as "the cheap one" — at $149/mo it is 6× Upload-Post's entry price for a single-profile plan.

### 3. Best unified API for a small agency that wants comments and analytics

**Primary: Upload-Post.**
- Only vendor here with a real free tier that includes the API (10 uploads/mo, 2 profiles), so you can prove the integration before paying.
- $16–$24/mo for 5 client profiles, unlimited posts, comments (reply/delete/hide/like/pin), analytics, webhooks and a white-label Connect API.
- API-key auth means the hub can ship a server adapter without building an OAuth broker.

*Caveats:* Free tier excludes TikTok, so the free tier proves 5 of 6 channels, not 6. Instagram comment *likes* are not exposed (TikTok/Facebook are). LinkedIn **company page** support must be confirmed for your client pages. Comment replies cost extra calls; TikTok needs both `post_id` and `comment_id`. It is a smaller vendor than Ayrshare — no SOC 2 claim surfaced in my research, so treat client data accordingly.

**Backup: Zernio.**
- 2 accounts free with (claimed) every feature, then $6/account — the best economics once you pass ~10 accounts, and comment/review APIs plus webhooks and analytics are included.
- *Caveats:* X is billed at X's rates on top, the vendor is young (rebrand history), and "every feature on every account" needs verification against the specific comment actions you need.

**If a client demands an established vendor with mature moderation and you can absorb ~$149/mo:** Ayrshare Premium. Best documented comment API, worst price.

### 4. How this integrates with the hub's adapter seam

The hub already has the right shape: `Platform` union and per-platform metadata in `src/lib/platforms.ts`, a documented `SocialAdapter` contract in the `social-platform-apis` skill, and `post_variants`, `comments`, `metrics_daily` tables to land results in. A unified provider becomes **one adapter that fans out to six platform IDs**, instead of six adapters.

**Env vars (add to `.env.example`, values in `.env.local`):**

```bash
# Unified publisher
SOCIAL_PROVIDER=uploadpost            # uploadpost | ayrshare | zernio | direct | assisted
UPLOADPOST_API_KEY=
# or
AYRSHARE_API_KEY=
AYRSHARE_PROFILE_KEY=                 # per-brand profile key
ZERNIO_API_KEY=

# Shared behaviour
PUBLISH_DRY_RUN=true                  # forces assisted mode even with a key
PUBLISH_WEBHOOK_SECRET=               # HMAC secret for inbound webhooks
PUBLISH_MAX_RETRIES=3
PUBLISH_DAILY_ENGAGEMENT_CAP=50       # auto-reply/like ceiling per brand
```

Keep the existing `META_APP_*`, `GOOGLE_*`, `LINKEDIN_*`, `X_*`, `TIKTOK_*` vars for the `direct` path so the seam can hold both.

**Provider adapter, high level:**

1. **`capabilities()`** returns the capability set per platform from a static map, not from guesses. Upload-Post: `publish` all six; `comment` all six; `likeComment` TikTok/Facebook only; `metrics` yes; `webhooks` yes. The UI renders buttons from this map, and unsupported actions degrade to assisted tasks — the skill's non-negotiable.
2. **`publish(input)`** maps `post_variants.caption + hashtags` and `media_path` to one multipart call. Store the provider's returned post ID and platform URL on the variant; **idempotency key = post variant ID + version hash**, and check for an existing external ID before retrying (the provider bills/queues per request).
3. **`comment(mediaId, text)`** runs right after publish for `first_comment`, then stores the returned comment ID. `reply()` calls `comments/create` with `post_id` + `comment_id`; `likeComment()` calls `comments/action` and must be capability-gated per platform.
4. **Webhooks** hit a single route (`/api/webhooks/social`), verify HMAC with `PUBLISH_WEBHOOK_SECRET`, then map events → `comments` rows (new comment, reply posted, post published/failed). This is what makes the inbox real instead of seeded.
5. **`metrics()`** pulls account + per-post analytics on a schedule and upserts into `metrics_daily` (`brand_id, platform, date`), which the existing reports pipeline already reads.
6. **Token/connection state:** store provider profile key + connected platforms per brand; mark `needs_reconnect` when a call returns a reauth error (Upload-Post uses stable `error_code` values such as `tiktok_reconnect_required`, `reauth_required`), and pause that platform's scheduled posts.
7. **Assisted fallback:** if `SOCIAL_PROVIDER=assisted` or the capability is missing, return the existing copy/open/mark-posted kit. Same interface, no silent failures.

No code changes were made in this task; this is the integration design for whoever implements it.

### 5. What the owner can do today, for free, with zero approvals

1. **Assisted mode, properly.** The hub already does this: caption per platform, hashtags, first comment, media spec, deep link, mark-posted, paste-back URL. Make it excellent rather than apologetic — it is a legitimate workflow and it is what most small agencies actually run.
2. **YouTube via a Google Cloud project + test users.** Free quota (10,000 units/day, 100 uploads/day). Add the agency's own Google accounts as **test users** on the OAuth consent screen — that works without verification for a small, fixed set of users. Caveat: unverified-project uploads may be locked to private until audit; test it on one video before scheduling anything important.
3. **LinkedIn personal profile** via the self-serve "Share on LinkedIn" product (`w_member_social`) — no review, works today for the owner's own profile. Company pages still need Community Management API approval.
4. **Facebook Page + Instagram** for accounts that are *yours*: a Meta app in Development mode with Standard Access works for users who hold a role on the app. Practical for 1–3 client Pages where the client accepts a tester invite; not practical at scale.
5. **X** on pay-per-use: create an app, buy a small credit pack ($20 free with first purchase), post at $0.01. No review, no subscription. For 60 posts/month that is **$0.60**.
6. **Manual engagement queue.** The inbox is already there; paste comments in, draft replies with the AI, post them by hand. Zero risk, and it keeps the engagement history in one place until a provider is connected.
7. **Reports from manual/imported metrics.** `metrics_daily` accepts imports, so the reporting product works with no API at all.

---

## Recommendation table

| Situation | Pick | Monthly cost | Why |
|---|---|---|---|
| Ship this quarter, all six, comments + analytics | **Upload-Post Basic** | $24 ($16 annual) | Cheapest verified all-in-one with real comment APIs and a free tier to test on |
| Prove it before spending anything | **Upload-Post Free** | $0 | 10 uploads/mo, 2 profiles, API included — everything except TikTok |
| Growing past ~10 client accounts | **Zernio** | $6/account → $3/account at 11+ | Feature-complete, per-account pricing, X passed through at cost |
| Client demands a mature, established vendor | **Ayrshare Premium** | ~$149 | Best-documented moderation API; expensive, no free plan |
| Owner insists on self-hosting | **Postiz self-host** | hosting only | Best open-source coverage, but **you** own every app review |
| Zero spend, zero approvals, today | **Assisted mode** + YouTube test users + LinkedIn personal + X credits | ~$1–5 | Compliant, immediate, no vendor risk |

---

## Nigeria / Lagos practicalities

- **Card acceptance is the real filter, not price.** Many Nigerian naira debit cards fail on US SaaS billing (FX limits, 3-D Secure, issuer blocks). Budget for a **virtual dollar card** (Paystack/Flutterwave/Chipper-adjacent providers) or a domiciliary account. Test with the **$0 Upload-Post free plan** before committing a card anywhere.
- **At ~₦1,500/US$ (check today's rate):** Upload-Post Basic $24 ≈ **₦36k/mo**; Zernio 5 accounts ≈ $30 ≈ **₦45k/mo**; Ayrshare Premium $149 ≈ **₦224k/mo**. That last number is usually the whole argument.
- **Annual billing is the Leverage.** Upload-Post annual is $16 vs $24 — a 33% saving for prepaying, which also reduces the number of FX transactions that can fail.
- **VAT/receipts:** EU vendors (Upload-Post is a Spanish SL) add VAT depending on billing country; US vendors may add sales tax. Ask for a VAT invoice if the agency reclaims.
- **Latency:** Lagos → EU/US API calls add ~100–200ms; irrelevant for scheduled publishing, relevant if you ever build a live "post now" button with a spinner.
- **Data residency:** if a client contract demands local storage, that points at self-hosting — but then you own the app reviews. Be explicit with the client about that trade-off.

---

## What I could not verify (treat as "verify before paying")

1. **Ayrshare's exact current prices** — ayrshare.com/pricing rendered without numbers on fetch; $149/$299/$599 come from a competitor's teardown dated 29 Sep 2026.
2. **Zernio's free tier scope** — whether 2 free accounts include posting to all six and comment actions, or only certain channels.
3. **Post Bridge comment/webhook support** — no endpoints found; absence of evidence, not proof.
4. **Publer webhooks and comment likes** — not documented in the pages I could reach.
5. **Hootsuite / Later / Metricool / SocialPilot API access and prices** — no public self-serve developer pricing found.
6. **YouTube's unverified-project private-viewing restriction** — reported consistently, but Google's English page for it was not retrievable in this pass.
7. **Instagram comment likes via unified APIs** — the hub skill says Instagram gained them in Apr 2026; only Ayrshare's marketing implies support. Test per vendor.
8. **Zapier/Make free-tier task counts** — pricing pages are client-rendered; figures above are from general knowledge and marked verify.
9. **Mixpost Pro licence price** — not retrieved.
10. **FX rate** — Nov 2026 naira rate is indicative only.

---

## Sources

Official vendor / platform pages used:

- Upload-Post pricing — https://www.upload-post.com/pricing/
- Upload-Post API docs (full text) — https://docs.upload-post.com/llm.txt
- Upload-Post comment endpoints — https://docs.upload-post.com/api/comments
- Ayrshare: Basic plan retired — https://www.ayrshare.com/docs/help-center/product/what-is-the-basic-plan-post-limit
- Ayrshare: monthly post quota rules — https://www.ayrshare.com/docs/help-center/product/how-many-posts-and-api-calls-can-i-make
- Ayrshare: Premium vs Launch vs Business — https://www.ayrshare.com/docs/help-center/product/premium-plan-vs-business-plan-which-fits-your-social-media-needs
- Ayrshare: Launch plan overview — https://www.ayrshare.com/docs/multiple-users/business-launch-overview
- Ayrshare price teardown (third party, 29 Sep 2026) — https://www.upload-post.com/ayrshare-pricing/
- Zernio pricing — https://zernio.com/pricing
- Zernio pricing rationale — https://zernio.com/blog/pay-per-account-pricing
- Post Bridge pricing — https://www.post-bridge.com/pricing
- Buffer pricing — https://buffer.com/pricing
- Buffer API — https://developers.buffer.com/
- Publer Business plan (API inclusion) — https://publer.com/help/en/article/what-is-included-in-publer-business-1c57hsq/
- Publer API eligibility — https://publer.com/help/es/article/1wjeuzy/
- Postiz pricing — https://postiz.com/pricing
- Postiz self-host provider keys — https://docs.postiz.com/self-host/providers/overview
- Mixpost third-party services (self-host vs cloud) — https://docs.mixpost.app/services/
- Zapier pricing — https://zapier.com/pricing
- Make pricing — https://www.make.com/en/pricing
- n8n pricing / Community Edition — https://n8n.io/pricing/
- X API pay-per-use pricing — https://docs.x.com/x-api/getting-started/pricing
- X API free credits — https://docs.x.com/x-api/getting-started/free-credits
- X pay-per-use announcement coverage (rates) — https://www.medianama.com/2026/02/223-x-developer-api-pricing-pay-per-use-model/
- TikTok Content Posting API — unaudited clients private-only — https://developers.tiktok.com/docs/en/content-posting-api-get-started
- Meta access levels / business verification — https://developers.facebook.com/docs/graph-api/overview/access-levels/
- LinkedIn Share on LinkedIn (self-serve `w_member_social`) — https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- YouTube Data API quota and compliance audits — https://developers.google.com/youtube/data/guides/quota_and_compliance_audits

Hub context used: `src/lib/platforms.ts`, `.env.example`, `src/lib/db.ts` (posts, post_variants, comments, metrics_daily), and the `social-platform-apis` project skill.
