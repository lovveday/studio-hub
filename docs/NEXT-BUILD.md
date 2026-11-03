# What to build next

Status: the Phase 0 + Phase 1 slice is running — knowledge inbox, brand facts/versioning, composer, calendar, approvals, assisted post kits, inbox, reports (PPTX/PDF), settings and retention.

**Update after the first publisher slice:** items 1–3 below are now implemented — asset upload/library, encrypted social-account connections (OAuth start/callback + mock provider), and a mock publisher with per-target attempts. The real Meta/YouTube/LinkedIn/X/TikTok adapters are item 4.

## The one critical path

```
API credentials → social account connection → publish adapter → first comment
      → comment watcher → auto-reply/like rules → analytics sync → live reports
```

Everything else can run in parallel. The publisher foundation was built **with a mock adapter first**, so keys/approvals were not a blocker for engineering.

---

## Build queue

### 1. Asset library + media upload — P0, no keys needed ✅ done
Why: a post cannot really publish without a creative. The data model has `media_path`, but there is no upload UI yet.

- `assets` table: brand, file, mime, dimensions, duration, size, alt text, tags, rights, checksum.
- Upload route + drag-drop in composer and post detail.
- Image/video validation: ratio, duration, size, codec; generate thumbnail.
- Attach one or many assets to a post variant; show a preview.
- Alt text and “used in” tracking.
- Local storage now; S3-compatible later.

Done when: a post can carry an image/video, the preview shows it, and the assisted kit downloads it.

### 2. Social account connection foundation — P0, buildable now ✅ done (OAuth routes + mock provider)
Why: keys are only useful once the hub can hold and refresh tokens.

- `social_accounts` table: platform, external ID, page/org ID, scopes, encrypted tokens, expiry, status, capability JSON.
- Token vault: AES-256-GCM, `APP_ENCRYPTION_KEY`, never log tokens.
- OAuth start + callback routes:
  `/api/oauth/meta/callback`, `/api/oauth/google/callback`, `/api/oauth/linkedin/callback`, `/api/oauth/x/callback`, `/api/oauth/tiktok/callback`.
- State + PKCE where supported; CSRF protection; redirect URI allowlist.
- Connection UI in Settings: Connect / Reconnect / Disconnect; show scopes, account name, health.
- Capability flags per channel: publish types, first comment, reply, like, analytics, webhooks.
- Audit events for connect/disconnect/token-refresh.

Done when: the Settings channel rows are real, a mock OAuth provider can connect a fake account, and tokens survive restart.

### 3. Publisher adapter + job queue — P0, mock first ✅ done (mock adapter + worker)
Why: this is the engine that turns “scheduled” into “posted”.

- `SocialAdapter` contract: `validate`, `upload`, `publish`, `comment`, `reply`, `likeComment`, `listComments`, `metrics`.
- Mock adapter + real adapters behind flags.
- Publish worker: DB lock, idempotency key, retry/backoff, rate limiter, dead-letter queue, reconciliation.
- First comment: immediate or +N minutes; per-platform text; retry independently.
- Per-target status so partial multi-platform failures are visible and retryable.
- Token refresh before publish; channel `needs_reconnect` on failure.
- Reconciliation job for ambiguous results.

Done when: a scheduled post publishes through the mock adapter with exactly-once behaviour, and a simulated crash does not double-post.

### 4. First real publishers: Meta + YouTube — P0, needs keys
Why: these are the free platforms with the highest value for the agency.

Order:
1. **Facebook Page** — text/photo/video/Reel/Story, first comment, reply, like (verify Pages API).
2. **Instagram Business** — image/Reel/carousel/Story, first comment, reply, like (requires FB-linked account and `instagram_manage_engagement`), `user_tags`/collaborators.
3. **YouTube** — video/Short upload, thumbnail, first top-level comment, reply, analytics; quota-aware.

Done when: an approved Page/IG/YouTube channel publishes a real post + first comment, and failures show a reconnect/retry path.

### 5. Engagement watcher + inbox automation — P0, after one publisher
Why: “reply to the first 5 comments and like them while I’m offline” is the core promise.

- Comment ingestion: webhooks where available, polling fallback; dedupe by platform comment ID.
- Engagement window per post: 120 minutes, max 5 replies, like mode, approval mode.
- Classification: question / praise / complaint / purchase intent / spam / crisis.
- AI reply grounded in brand voice + current facts; reply variation to avoid spam signals.
- Caps: actions/hour/channel, actions/day, quiet hours, kill switch.
- Auto-like only where the adapter supports it; otherwise one-tap assisted task.
- Negative/legal/health/refund comments always escalate to a human.
- Audit every action.

Done when: a test comment on a real post gets a rule-based reply/like, and a negative comment escalates without auto-replying.

### 6. WhatsApp Cloud API + Telegram intake — P1, no platform posting keys
Why: the client sends new information as WhatsApp voice notes.

- WhatsApp webhook: verify, receive audio, download media ID, transcode, transcribe, extract facts.
- Telegram bot fallback: forward a voice note, same pipeline.
- “Knowledge Inbox” source card shows sender, date, duration, transcript; audio retained 7 days.
- Review/approve flow already exists.
- Optional email-in and PWA share target.

Done when: forwarding a voice note updates a fact with a citation, and the audio is deleted on schedule.

### 7. Research / Market Pulse — P1, no platform keys
Why: newer information is not only in the client notebook.

- Search provider abstraction (Tavily/Brave/Serper), page fetch/extract, citations.
- Brand Brain vs Market Pulse separation, freshness dates, source-quality ranking.
- Daily/weekly sweep per brand: platform changelogs, industry news, competitor posts.
- Prompt-injection defense; web content treated as data.
- “Platform update” notifications so API changes do not silently break publishing.

Done when: a question returns internal facts and live sources separately, with working links and dates.

### 8. Virality Lab — P1, high user interest
Why: understand why another creator’s video worked and adapt the structure safely.

- Input: uploaded video or URL; official metadata where available.
- Pipeline: probe → transcript → OCR keyframes → scene/pacing → audio features → metrics where available.
- Output: hook (0–3s), structure timeline, keywords/entities, hashtags, CTA, length, posting time, “why it likely worked” hypotheses with evidence.
- Adaptation brief: same structure, new brand angle, script outline, shot list, CTA; similarity check against the source.
- Keyword extraction and a pattern library per niche.
- Best posting time is a separate engine, not inferred from one viral video.
- No downloading/reposting third-party video; delete source after analysis.

Done when: a video produces a cited teardown + a brand-safe adaptation brief + a 2-variant test plan.

### 9. Best Time Engine — P1
Why: schedule when the audience is actually there.

- Slot model per channel/weekday/hour; Bayesian-smoothed engagement rate.
- Minimum sample size; confidence labels; “not enough data” fallback.
- Uses own analytics first, platform insights where available, competitor times as a weak signal only.
- Learns weekly; explains when a recommendation changes.
- Timezone-aware; applies to composer/calendar queue slots.

Done when: each channel shows top 3 slots with sample size and confidence, and the recommendation updates as metrics arrive.

### 10. Media Studio — P1/P2
Why: one master video must become story, feed, reel and Shorts outputs.

- FFmpeg pipeline: probe, transcode, trim, crop/reframe 9:16, 1:1, 4:5, 16:9.
- Captions/subtitles, text overlays, cover/thumbnail selection, safe-zone guides.
- Batch render + platform spec validation.
- Templates: hook title, lower third, end card, CTA.
- Output variants attached to the asset library.

Done when: one uploaded video renders validated IG Story/Reel/Feed, TikTok, YouTube Shorts and LinkedIn outputs.

### 11. Analytics sync + report evolution — P2, needs platform APIs
Why: reports are only as good as the metrics.

- Sync account/post metrics daily for approved channels; CSV import until then.
- Normalize metrics; best time; top/bottom posts; content mix; engagement rate; link clicks.
- Report templates with brand kit, white-label, scheduled email, share links.
- Data-gap warnings; never invent metrics.

Done when: weekly/monthly PPTX/PDF is generated from live data with no manual export.

### 12. Notifications, PWA and mobile — P2
- Email (Resend), web push (VAPID), Telegram/WhatsApp digest.
- PWA install + share target for images/video/voice notes.
- Quiet hours, per-user preferences, escalation.
- Daily/weekly digest.

### 13. Hardening and scale — P2
- Postgres/S3 migration (current SQLite/local storage is the demo adapter).
- Partitioning/archival/pruning jobs; retention dashboard already exists.
- Backups/PITR, restore drill.
- Security review: RBAC, token vault, webhook signatures, SSRF, PII retention.
- Error tracking, job dashboard, load tests.
- SMTP/Resend and deployment runbook.

---

## Recommended immediate slice

**Meta + YouTube real adapters → first comment → engagement watcher.** Items 1–3 are already done; item 4 is now the critical path. Meta needs an HTTPS callback (`APP_URL` tunnel or deployed URL), so the app can be built and tested with the mock provider until that is in place.

In parallel, the no-key track can build WhatsApp intake, Market Pulse and the Virality Lab.

## Blocked by external approvals

| Work | Blocked by |
|---|---|
| Facebook/Instagram publish + comments | Meta App Review + business verification |
| YouTube upload | Google OAuth verification (testing works with test users) |
| LinkedIn company pages/comments | Community Management API access |
| X posting/likes | Paid API credits |
| TikTok direct post | Content Posting API audit |

Do not wait for approvals to build the OAuth/token/adapter layer; test it with a mock provider.
