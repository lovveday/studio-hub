# Metricool — Product & UX Study for My Social Hub

**Scope:** public sources only (marketing site, pricing page, help center, app store listing, review sites, public API docs). No login, no credentials, no authenticated app access. `app.metricool.com/login` was **not** accessed; all in-app behaviour below comes from Metricool's public help center articles, which document screens and flows in detail.
**Prices:** list prices observed November 2026, VAT excluded. **Method note:** anything I could not verify from a public source is marked `unverified` or omitted.

---

## 1. Positioning & pricing

**Who it targets (stated):** SMBs, creators, and agencies; "4M+ professionals, brands and agencies"; official partner of Meta, Google, Pinterest, LinkedIn and X. Agency messaging leads with client reporting, multi-client dashboards, roles/permissions and white-label.

**Core mental model — the single most important design decision:** a **Brand = one business or client**, and inside a brand you connect **one profile per social network**. Google Business Profile is one brand *per location*. Every limit, permission, report and inbox is scoped to a brand.

| Plan | Brands | Annual (EUR / USD) | Monthly (EUR / USD) | Headline gates |
|---|---|---|---|---|
| Free | 1 (cannot add/delete, rename only) | €0 | €0 | 20 published posts/mo, 30-day analytics + watermark, 5 fixed competitors, 5 AI credits/mo, no LinkedIn, no X, no PDF/PPT reports, no SmartLinks, no Canva/Drive |
| Starter | up to 5 or 10 | €16–29 / $20–36 | €20–37 / $25–45 | Unlimited publishing (fair-use), 100 competitors/network, LinkedIn, PDF+PPT reports, unlimited analytics history, Flows, Canva/Drive, multiple SmartLinks |
| Advanced | up to 15 / 25 / 50 | €43–130 / $53–159 | €54–172 / $67–210 | Team + client management, roles, **post approval**, custom report templates, Data Studio, API (Zapier/Make), complete X analytics |
| Custom | 50+ / custom | "Let's talk" | "Let's talk" | **White Label**, dedicated AM, custom AI credits, API/embedded integration |

**Add-ons:** X/Twitter connection **$10/mo per connected account**; Advanced Analytics add-on from ~€10/$12 or €30/$36 per month (tier-dependent); Canva add-on and White Label by sales; Hashtag Tracker **$25/day** per network.

**Hard limits that shape the product:**
- Posts are counted **only when actually published**, per calendar month, resetting on the 1st. Drafts and merely-scheduled posts don't count. A post published to 3 networks counts 3 times.
- **Free and Starter include a single user login** — no collaborators. Adding people, roles and shared brands requires **Advanced+**.
- On downgrade, only 1 brand stays active; Metricool **keeps the oldest brands by creation date** and hides the rest (not deleted).
- Custom templates are **per brand and non-transferable**; Reports are **single-brand** (no multi-brand report).
- AI assistant credits are capped **per brand per month**: 5 (Free) / 20 (Starter) / 35 (Advanced).

**Agency / white-label:** White Label = your domain (e.g. `clients.youragency.com`), your logo and colours, branded automatic reports, branded emails, and client invites — **Custom plan only**, sales-gated. Clients do **not** need a Metricool account: they're added by email and get roles (read-only / edit / mix, custom roles available).

---

## 2. Feature map

| Area | Status | What it actually does (verified) |
|---|---|---|
| Scheduling | ✅ | Calendar + list, drafts, per-network variants, recurring scheduling, polls, PDFs (LinkedIn docs), alt text, UTM builder, post promotion/boost |
| Calendar | ✅ | Month grid; `+` or click a date to create; CSV import lives in the calendar options menu; export scheduled posts to CSV; auto content lists (Autolists) |
| Bulk upload | ✅ | CSV with a downloadable template; **recommend ≤50 posts/file**; public media URLs only; select matching date/time format; preview separates **warnings** (import continues) from **errors** (blocked); one row per brand; "TRUE/FALSE" network columns |
| Content library | ✅ | Post library, image/video bank, saved texts ("saved replies"/reusable copy), templates — **not on Free** |
| AI caption/hashtags | ✅ | Generate, rewrite to tone, add CTA, shorten/lengthen, emojis, translate, suggest hashtags, alt-text; shortcut chips iterate on one draft rather than 5 variants; **credit-metered per brand** |
| AI reports / AI analyst | ✅ | Metricool Studio — "describe the view you need in natural language", plus **Explore insights** inline on analytics tables; `MCP` server exposes 20+ tools to Claude/ChatGPT/Cursor |
| Approvals | ✅ (Advanced) | Dedicated **Review requests** queue; send-for-approval from the planner; approve/reject with rich-text note + @mentions; **bulk approve/reject**; list *and* calendar view; **reviewer portal for people with no Metricool account** (email link) |
| Client collaboration | ✅ (Advanced) | Collaborators per brand with a **different role per brand**; team members get org-wide roles; custom roles; invites expire in 24h |
| Inbox / comments | ⚠️ Partial | FB comments+DMs, IG comments+DMs, TikTok comments (business), X DMs only, LinkedIn comments+mentions (no DMs), GBP reviews, YouTube comments. **No delete/hide, no assignment, no new-message alerts, no auto-reply** |
| Social listening | ❌ | No keyword/brand-mention monitoring. Closest: competitor analysis + paid Hashtag Tracker |
| Competitor analysis | ⚠️ Partial | FB, IG, Threads, Bluesky, Twitch, YouTube (paid, max 10), X (paid add-on). **Up to 100 per network on paid. No TikTok, no LinkedIn** |
| Analytics | ✅ | Summary + per-network views, preset/custom periods, always-on vs-previous-period deltas, cards→chart toggling, tables with column reorder/CSV, IG-only breakdowns, per-post day-by-day "evolution" (IG/TikTok/LinkedIn, first 30 days) |
| Reporting | ✅ (Starter+) | PDF + PPT, logo, language, period, platform picker, row limits, optional summary; **custom templates** (Advanced+); automatic monthly email with reply-to; non-expiring public share links; download manager (last 100 manual reports) |
| Best-time recommendations | ⚠️ Mixed | Heatmap in Planning ("Best times" button): weekday columns × time rows, darker = better, percentage toggle. **Often generic, not account-specific** (see §5) |
| Link-in-bio | ✅ (Starter+) | SmartLinks: custom URL, buttons/images/videos, themes, sections, YouTube feed, visit/click/CTR analytics, multiple SmartLinks |
| Ads | ✅ | Connect Meta, Google, TikTok Ads; create campaigns; boost posts; ads analytics. Ad **comment** moderation/replies not possible |
| Review management | ⚠️ Minimal | GBP reviews surface **inside the Inbox** only; cannot like/dislike reviews, cannot view listings, cannot flag content |
| Integrations | ✅ | Google Drive, Canva, Adobe Express, Zapier, Make, WordPress, Shopify, Wix, Squarespace, GTM, Data Studio connector, Chrome extension |
| Mobile app | ⚠️ Limited | Plan/edit/duplicate, AI text, library, Drive/Canva, analytics, inbox, generate reports, approvals. **No ads, no user management, no SmartLinks, no social calendars, no X threads, no Adobe Express, no subscription management** |
| API | ✅ (Advanced+) | REST v2: create/list/update/delete scheduled posts, bulk send-to-review, approvals, media normalization, `inbox/post-comments`. Auth = `X-Mc-Auth` token + `userId` + `blogId` |

---

## 3. Platform support & capability gaps

**Networks:** Facebook Pages, Instagram (Business/Creator only — **no personal profiles**), Threads, X/Twitter (paid add-on), LinkedIn (company + personal), Pinterest, TikTok, YouTube, Twitch, Google Business Profile, Bluesky, plus Web/Blog analytics and Meta/Google/TikTok Ads.
**Not supported:** WhatsApp, Snapchat, Reddit, Telegram, Mastodon — none appear in Metricool's supported-network list on the pricing page or in the connections guide.

**Verified API-level gaps** (from Metricool's own per-network limitations doc):

| Capability | Reality |
|---|---|
| **First comment** | IG (2,200 chars), FB (8,000), LinkedIn (1,250), TikTok professional pages (150), YouTube (10,000). Only publishes on those networks when cross-posting |
| **Comment replies** | FB, IG, TikTok (business), LinkedIn, YouTube. **X: DMs only, no comment replies.** No replies to comments on FB/IG **ads** |
| **Likes** | Cannot like comments on IG or YouTube; cannot like pages; no comment reactions on FB |
| **Moderation** | **Cannot delete or hide comments anywhere**; cannot hide ad comments; cannot pin/hide YouTube comments; cannot flag GBP content |
| **Stories** | Publishable, but **no story add-ons** (links, stickers, locations, product tags), **cannot add to Highlights**, no story poll/slider results, no sponsored/shared-story sync. **TikTok Stories not supported at all** |
| **Reels** | Yes, but: no Reels built from static images, no music on carousels/feed images, no grid-thumbnail crop adjustment, no per-slide captions, cannot edit after publish |
| **Shorts** | Yes, but **no custom thumbnails**, no A/B thumbnails, no Community posts, no "related video" linking, no channel mentions at upload |
| **TikTok** | No overlay text, voiceovers, filters, **no line breaks/paragraphs**, no custom cover on personal accounts, no grid-crop control, **no DMs**, no demographic data |
| **LinkedIn** | No articles, no event posts, no collaborative/co-authored posts, no author customisation, no DM sync |
| **Instagram** | No GIFs, no 30+ hashtags, no >10-image carousels, no tagging private accounts, no editing published posts |

---

## 4. UX/UI patterns worth copying

1. **Brand-first container + persistent brand switcher.** One brand = one client; everything (calendar, inbox, reports, competitors) is scoped and the switcher sits top-left. Cross-brand queues then carry a **brand column with logo + name** so a reviewer can tell five clients apart in one list. Why it works: it mirrors the agency's actual mental model, and it makes "who is this for?" impossible to get wrong.
2. **Six-item top navigation.** Analytics · Reporting · Inbox · Planning · SmartLinks · Ads, with everything administrative (connections, users, billing, review requests) in a right-side overflow menu. Why it works: the daily loop is 6 clicks deep at most, and setup/administration never competes with daily work.
3. **Composer as one brief → per-network variants.** Pick networks, then tune per channel; the **first-comment field is an icon inside the text box**, not a separate screen; character limits are per network; a preview renders the actual post. Why it works: it keeps the "one idea, many formats" reality visible without 6 separate composers.
4. **Calendar as the creation surface.** Clicking a date starts a post; "Import CSV" and "Download scheduled posts" sit in the calendar's options menu; drafts are visually distinct. Why it works: the calendar is where schedulers think, so creation, bulk import and export all live there.
5. **Best-times heatmap with a percentage toggle.** Weekday columns × time-slot rows, darker cell = better, plus an exact-percentage view. Why it works: a colour grid answers "when?" in one glance, and the toggle gives the analyst numbers without a second screen.
6. **Approvals as a cross-brand queue, not a per-post dialog.** "Review requests" has **For you** / **Assigned by you** tabs, status chips (Open, Pending approval, Rejected, Approved), brand column, search, filters, bulk approve/reject, and a list/calendar toggle. Rejection requires a note that supports **@mentions**. Why it works: it turns approvals into a daily triage ritual instead of a hunt through the calendar.
7. **Reviewer portal for people without an account.** Clients get an email link, see the post preview with existing notes, and approve/reject — no seat, no signup. Why it works: the single biggest blocker to client approval is asking the client to create yet another login.
8. **A 3-hour grace period on late approvals.** If nobody approves by the scheduled time, the post stays approvable for 3 hours; after that the task disappears and the post **does not publish**. Why it works: it makes "nobody approved" a safe, predictable outcome instead of a silent failure.
9. **Notification matrix + "manual publish" push.** One bell, 30-day feed, each row labelled with its brand; per-event checkboxes for In-app / Email (plus Push for one event). For content that can't auto-publish, the **push notification downloads the media to the gallery, copies the caption to the clipboard, and deep-links into the social app**. Why it works: it's a genuine assisted-publishing handoff — the user lands in the native composer with assets ready.
10. **Report builder as 4 decisions.** Template → period → language → platforms/rows → optional logo → PDF or PPT. Automatic monthly send takes recipients, **reply-to**, send day, email copy and a **send test now**. Share links never expire. Why it works: it feels like a form, not a designer, and the test-send removes the fear of emailing a broken report.
11. **Onboarding as a 5-minute script.** "Understand brands → connect one profile → here are the 6 areas → do these two quick wins (see analytics, schedule a post)". Empty states are backed by a plan-limit counter in the planner and a warning email near the free cap. Why it works: it defers setup ambition and gets to a first published post fast.
12. **Template + preview discipline in bulk import.** Non-editable template columns, explicit TRUE/FALSE network flags, and a pre-import preview that distinguishes warnings from blocking errors. Why it works: bulk import fails silently in most tools; naming the failure mode is the feature.

---

## 5. What Metricool does badly or leaves out

All items below are from Metricool's own docs or dated public reviews — no speculation.

**Inbox is a reader, not a work queue.**
- Cannot delete, hide or moderate comments or DMs anywhere (must go to the native app).
- **No notification at all for a new message or comment** — push or email. You must open the Inbox to find work.
- No conversation assignment, no user tagging; all collaborators share one inbox per brand.
- No auto-replies/templates (only manually inserted "saved replies").
- **No unified multi-brand inbox** — you switch brands one at a time, which is exactly backwards for an agency.
- Read/unread state is **not synced** with the networks, so the Unread tab is permanently untrustworthy.
- No history storage: each open re-fetches from the network; deleted-at-source items linger until refresh.
- No replies to comments on ads; stories only via DM replies.

**Collaboration is paywalled and shallow.**
- Free and Starter are **single-login**; approvals in practice require a shared brand, which requires Advanced.
- A rejection blocks publishing even if another reviewer approved — good safety, but there's no visible escalation or SLA.
- After the 3-hour grace window the post **silently stays unapproved**; nothing tells the client it expired.

**"Best times" is frequently not your data.**
- IG: real data only when connected via Facebook **and** ≥100 followers, otherwise a generic behavioural study.
- FB: Meta removed best-times from its API on **24 Sep 2024** — post-cutoff accounts get generic studies.
- X: needs **300 followers active in the last 7 days**, else nothing; paid plans only.
- LinkedIn and YouTube: **always** generic behavioural studies.
- No stored history: "past and future weeks will show the same best times".
- The copy contradicts itself: it says best times are based on *your followers'* activity, then clarifies it's actually **platform-wide activity volume**.

**Reporting is single-brand and template-locked.**
- Reports cannot span brands; a 20-client rollup means 20 reports.
- Custom templates are per brand and non-transferable; only Advanced+.
- Manual and scheduled reports live in different places — automatic reports are **not** in the download manager.
- Deleting a report from the manager **does not revoke links you already shared** (a real data-governance hole for agencies).
- PPT exports have known thumbnail and tiled-background rendering bugs.
- Free plan analytics carry a watermark.

**Analytics has rigid comparisons.** Comparison is always "previous equal period"; you cannot set a custom comparison baseline in Analytics (you must leave for Metricool Studio). Breakdowns exist **only for Instagram**.

**Competitor analysis is incomplete.** No TikTok, no LinkedIn; YouTube capped at 10; IG/Threads/Twitch require exact-name matching; on Free the 5 competitors are fixed and cannot be replaced — a genuinely frustrating dead end.

**AI is credit-starved and ungrounded.** 20–35 credits per brand/month is thin for an agency, and there is **no public evidence of document-grounded brand knowledge, fact versioning or citations** in the AI assistant — it optimises copy, it doesn't know the client's approved facts. (`unverified` whether any hidden brand-voice training exists; nothing public describes it.)

**Mobile is the weak link.** iOS listing: **2.6 / 5 from 118 ratings**. The help center's own feature matrix removes ads, user management, SmartLinks, social calendars, X threads and subscription management from mobile.

**Interface age & pricing friction (dated public reviews).** A 2022 review: "The UI and UX could use a refresh… it does feel a little outdated." A July 2026 review: paid plans "tan elevados" and the free plan "ofrece demasiadas limitaciones". A 2021 review reports metric data errors requiring manual verification. Treat as sentiment, not fact.

**Small but telling:** desktop is **light mode only** (dark mode is mobile-only); brand overflow on downgrade is decided by creation date with no picker beyond a confirmation screen.

---

## 6. Differentiation opportunities for My Social Hub

| # | Opportunity | Metricool today (verified) | My Social Hub angle |
|---|---|---|---|
| 1 | **Grounded brand knowledge** | AI assistant rewrites copy; no public brand-fact store, versioning or citations | Composer and writer draw only on **approved, current facts** with visible citations; superseded facts can't leak into a caption. This is a category difference, not a feature gap |
| 2 | **Voice notes → facts** | No WhatsApp intake at all (no WhatsApp in the network list) | Client sends a voice note in WhatsApp → transcript → fact candidates → review → approved fact with source. Zero-typing knowledge capture is the agency's real bottleneck |
| 3 | **Client portal that isn't a seat** | Reviewer portal exists (email link, no account) but is approval-only, no knowledge, no audit | Approval portal + brand facts + decision history + retention, client-safe by design. Beat them on **what the client can see and sign off**, not just approve/reject |
| 4 | **Honest Best Time Engine** | Heatmap that silently degrades to generic studies; no history; no confidence | Top 3 slots per channel with **sample size, confidence label and "not enough data"** — plus an explanation when the recommendation changes. Trust is the feature |
| 5 | **Virality teardown** | Competitor *metrics* only; no video/structure analysis | Hook (0–3s), structure timeline, pacing, CTA, adaptation brief, similarity check. Turns "make it go viral" into a repeatable brief |
| 6 | **Media repurposing** | Image/video editor + Canva; manual per-format work | One master video → Story/Reel/Feed/Shorts/LinkedIn with spec validation and safe-zone checks |
| 7 | **Retention & data lifecycle** | 30-day metrics on Free, 30-day notification feed, no Inbox history, **report links that never expire** | Explicit hot/warm/cold lifecycle, audio auto-delete, revocable share links, export/erase per client. Turns compliance into a selling point |
| 8 | **Agency multi-brand workflow** | Inbox and Reports are per-brand; approvals are the only cross-brand queue | Cross-brand **Today** queue (approvals + due posts + comments + knowledge to review) and multi-brand report rollups |
| 9 | **Market Pulse** | No listening; competitors + paid hashtag tracker only | Live market/platform-change monitoring with citations, kept strictly separate from brand facts |
| 10 | **Assisted publishing parity+** | Push notification → gallery + clipboard + deep link (excellent) | Match that handoff, then add per-channel checklists, "ready to post" state and proof-of-publish capture |

**Where Metricool is already strong — do not under-invest to "beat" them:** calendar/composer ergonomics, CSV bulk import, PDF/PPT report builder with scheduled email, white-label, and the assisted-publish push handoff. These are table stakes for an agency tool.

---

## 7. Top 10 product recommendations (ranked by impact ÷ effort)

| # | Recommendation | Impact | Effort | Rationale |
|---|---|---|---|---|
| 1 | **Cross-brand "Today" queue** (approvals due, posts due, comments waiting, facts to review) with brand chips | High | Med | Metricool's only cross-brand surface is Review requests; inbox and reports are per-brand. An agency's first question each morning is "what needs me across all clients?" |
| 2 | **Client approval portal hardening**: no-login links, side-by-side caption + preview, threaded notes with @mentions, decision audit trail, expiry notice | High | Med | Metricool proves the no-account portal works but stops at approve/reject and lets late approvals die silently. Audit trail + expiry notice is a cheap, visible win |
| 3 | **Best Time Engine with confidence** — top 3 slots/channel, sample size, "not enough data" state, change explanations | High | Med | Directly exploits Metricool's weakest verified area: generic fallbacks, no history, contradictory methodology |
| 4 | **Fact-cited composer + safety gate** (every claim traceable or flagged; banned claims blocked at save) | High | Low–Med | The knowledge layer already exists; surfacing citations and blocking unsupported claims is mostly UI + validation, and no competitor publicly does it |
| 5 | **Assisted-publish kit parity**: per-channel checklist, copy caption/first comment, deep link, reminder at scheduled time, capture proof | High | Low | Metricool's push→gallery→clipboard→app handoff is the benchmark. Matching it is cheap and it's the default path until real adapters ship |
| 6 | **Report builder: multi-brand rollup + PPTX templates + revocable links** | High | Med | Metricool cannot report across brands and leaves shared links live after deletion — both are agency blockers My Social Hub can fix |
| 7 | **WhatsApp voice note → facts pipeline** | High | Med | No Metricool equivalent. Highest-signal differentiator for how agencies actually receive client updates |
| 8 | **Media Studio: one master → validated multi-format outputs** | Med–High | High | Metricool edits media but doesn't systematise repurposing; big value, but build after the queue/report/approval loop is solid |
| 9 | **Virality Lab teardown + adaptation brief** | Med–High | High | No Metricool equivalent; strong demo value, but needs transcript/OCR/pacing pipeline before it's credible |
| 10 | **Retention & lifecycle dashboard** (per-client retention, audio auto-delete, export/erase, link revocation) | Med | Low–Med | Cheap to build on existing retention work; turns an internal requirement into a client-facing trust feature Metricool lacks |

**Do-next-quarter quick wins (low effort, visible):** comment moderation actions (hide/delete where APIs allow) or an explicit "open in native app" deep link; new-message alerts with per-user preferences; notification matrix (in-app/email/push per event); publish-failure surfacing with a one-click retry; brand switcher with per-brand status dots.

---

## 8. Source list (all accessed November 2026)

| # | Source | URL |
|---|---|---|
| 1 | Pricing page (tiers, limits, add-ons, FAQs) | https://metricool.com/pricing/ |
| 2 | Free vs paid plan limits (help center) | https://help.metricool.com/en/main-differences-between-free-and-paid-plans-bl0v9 |
| 3 | Getting started / 5-step onboarding | https://help.metricool.com/en/getting-started-with-metricool-im4va |
| 4 | Interface tour (6 top-level areas) | https://help.metricool.com/en/get-to-know-metricool-p0zdh |
| 5 | Planner feature page | https://metricool.com/planner/ |
| 6 | Approval workflow + Review requests | https://help.metricool.com/how-to-manage-content-approval-from-review-requests-formerly-my-tasks-c1xn8 |
| 7 | Approval system marketing page | https://metricool.com/approval-system-social-media/ |
| 8 | Inbox manager (capabilities + all limitations) | https://help.metricool.com/en/inbox-manager-how-to-manage-messages-and-comments-from-metricool-s9zze |
| 9 | Notifications matrix + manual-publish push | https://help.metricool.com/en/types-of-notifications-in-metricool-ynqf8 |
| 10 | First comment by network + character limits | https://help.metricool.com/en/article/how-to-schedule-a-first-comment-on-your-posts-1m3wo19/ |
| 11 | API limitations per social network | https://help.metricool.com/api-limitations-per-social-network-n7zlr |
| 12 | CSV bulk scheduling guide | https://help.metricool.com/how-to-schedule-batch-posts-with-a-csv-file-in-metricool-3zwxj |
| 13 | Best times methodology + caveats | https://help.metricool.com/best-period-to-post-on-social-media-in-metricool-w7ll9 |
| 14 | Generating reports + automatic monthly send | https://help.metricool.com/generating-reports-szc5k |
| 15 | Reporting hub (Reports vs Campaign Dashboards vs Studio vs Data Studio) | https://help.metricool.com/reporting-your-reports-and-analytics-hub-ejidy |
| 16 | Custom report templates | https://help.metricool.com/custom-templates-apbh5 |
| 17 | Analytics tab walkthrough | https://help.metricool.com/how-to-use-and-explore-the-analytics-tab-lmd52 |
| 18 | Adding competitors (network + plan limits) | https://help.metricool.com/how-to-add-competitors-in-metricool-sgjjg |
| 19 | Competitor analysis marketing page | https://metricool.com/competitors/ |
| 20 | Collaborators & roles | https://help.metricool.com/user-management-in-metricool-ovjqe |
| 21 | White Label page (Custom plan only) | https://metricool.com/white-label-metricool/ |
| 22 | White Label for Agencies: clients, roles, teams | https://help.metricool.com/mba-about-clients-roles-brands-and-teams-gi0xu |
| 23 | Flows (engagement automation) | https://metricool.com/flows/ |
| 24 | SmartLinks / link-in-bio | https://metricool.com/socialmedia-smartlinks/ |
| 25 | Integrations page | https://metricool.com/integrations/ |
| 26 | API basic guide + endpoints | https://help.metricool.com/basic-guide-for-api-integration-r97af |
| 27 | Public API documentation | https://app.metricool.com/resources/apidocs/index.html |
| 28 | MCP server (Claude/ChatGPT/Cursor) | https://metricool.com/metricool-mcp-claude/ |
| 29 | Mobile app feature matrix | https://help.metricool.com/en/features-available-in-the-mobile-app-213ni |
| 30 | iOS App Store listing (2.6/5, 118 ratings) | https://apps.apple.com/us/app/metricool/id1072510529 |
| 31 | Software Advice verified reviews (98 reviews, dates cited) | https://www.softwareadvice.com/social-media-monitoring/metricool-profile/reviews/ |
| 32 | Agencies landing page | https://metricool.com/social-media-management-tool-for-agencies/ |
| 33 | AI social media assistant | https://metricool.com/ai-social-media-assistant/ |
| 34 | Autolists (evergreen content) | https://metricool.com/autolists-social-media-management/ |

**Sources that blocked automated access (not used as evidence):** Trustpilot (`403`, bot-verification interstitial), Capterra (`403`), G2 (`403`), Reddit search API (`403`). Trustpilot's public snippet indicated "4 out of 5" overall, but the page body could not be retrieved, so it is not relied on here.

**Access limitations:** the authenticated app (`app.metricool.com`) was not accessed by design. Feature behaviour is reconstructed from Metricool's help center (which is written by the vendor about the live product) and from pricing-page feature tables; where the two disagree, the help center is treated as authoritative and the discrepancy is noted.
